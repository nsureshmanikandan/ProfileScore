from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
import time

from app.agents.graph import profile_graph
from app.models.schemas import ProfileAnalysis
from app.core.logging import get_logger
from app.core.telemetry import get_tracer, get_meter
from app.services.llm_service import _llm_complete
from opentelemetry.trace import SpanKind
import structlog

SECTION_REWRITE_PROMPTS: dict[str, str] = {
    "experience": """You are a LinkedIn profile expert. Rewrite the experience bullets for maximum recruiter impact.

Current experience content:
{content}

Target role: {target_role}

Write 4-5 powerful bullet points using the X-Y-Z formula: 'Accomplished [X] as measured by [Y], by doing [Z]'.
- Start every bullet with a strong action verb (Led, Architected, Drove, Delivered, Scaled, etc.)
- Quantify every achievement (%, $, team size, time saved, users, etc.)
- Make each bullet standalone — readable without context

Return ONLY the bullet points, each on its own line starting with •""",

    "skills": """You are a LinkedIn skills optimization expert.

Current skills:
{content}

Target role: {target_role}

Organize into 3 groups for LinkedIn — return EXACTLY this format:

TOP SKILLS (pin these in LinkedIn):
[5-6 highest-impact skills for the target role, comma-separated]

TECHNICAL SKILLS:
[technical tools, platforms, frameworks, comma-separated]

LEADERSHIP & STRATEGY:
[management, strategic, soft skills, comma-separated]""",

    "headline": """You are a LinkedIn headline expert. Write 3 powerful headline variations.

Current headline: {content}
Target role: {target_role}

Rules:
- Under 220 characters each
- Include: current title | key expertise | unique value
- Use keywords recruiters search for
- Be specific, not generic

Return exactly 3 options, each on its own line, numbered 1. 2. 3.""",

    "about": """You are a LinkedIn About section expert. Rewrite for maximum impact.

Current about:
{content}

Target role: {target_role}

Write 150-200 words:
- Hook sentence (value proposition)
- 2-3 quantified achievements
- Current focus and expertise
- Brief call to action / what you're open to

First person. No buzzwords. Return only the rewritten About text.""",

    "certifications": """You are a LinkedIn profile expert.

Current certifications:
{content}

Target role: {target_role}

Suggest how to present these certifications most effectively on LinkedIn, and recommend 3-5 additional certifications that would strengthen this profile for the target role.

Format:
PRESENT THESE FIRST:
[reordered list with brief impact note for each]

RECOMMENDED TO ADD:
[3-5 suggestions with why each matters for the role]""",

    "education": """You are a LinkedIn profile expert.

Current education:
{content}

Target role: {target_role}

Rewrite the education section to highlight: relevant coursework, projects, achievements, and honors that align with the target role.
Return as clean bullet points under each degree.""",
}

logger = get_logger(__name__)
tracer = get_tracer("api.analyze")
meter = get_meter("api.analyze")

analyze_counter = meter.create_counter("profile_analyses_total", description="Total profile analysis requests")
analyze_duration = meter.create_histogram("profile_analysis_duration_ms", description="Analysis duration in ms")

router = APIRouter(prefix="/api/analyze", tags=["analyze"])


@router.post("/upload", response_model=ProfileAnalysis)
async def analyze_pdf(
    file: UploadFile = File(...),
    target_role: Optional[str] = Form(None),
    target_jd: Optional[str] = Form(None),
):
    with tracer.start_as_current_span("api.analyze_pdf", kind=SpanKind.SERVER) as span:
        start = time.time()
        structlog.contextvars.bind_contextvars(request_type="pdf", filename=file.filename)

        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")

        pdf_bytes = await file.read()
        if len(pdf_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")

        span.set_attribute("file_size_bytes", len(pdf_bytes))
        logger.info("analyze_pdf_received", filename=file.filename, size=len(pdf_bytes))

        state = await _run_graph(pdf_bytes=pdf_bytes, target_role=target_role, target_jd=target_jd)

        duration_ms = (time.time() - start) * 1000
        analyze_counter.add(1, {"type": "pdf"})
        analyze_duration.record(duration_ms, {"type": "pdf"})
        span.set_attribute("overall_score", state["analysis"].get("overall_score", 0))

        return _build_response(state)


@router.post("/text", response_model=ProfileAnalysis)
async def analyze_text(
    text: str = Form(...),
    target_role: Optional[str] = Form(None),
    target_jd: Optional[str] = Form(None),
):
    with tracer.start_as_current_span("api.analyze_text", kind=SpanKind.SERVER) as span:
        start = time.time()
        structlog.contextvars.bind_contextvars(request_type="text")

        if len(text.strip()) < 100:
            raise HTTPException(status_code=400, detail="Text too short -- paste your full LinkedIn profile")

        span.set_attribute("text_length", len(text))
        logger.info("analyze_text_received", text_length=len(text))

        state = await _run_graph(raw_text=text, target_role=target_role, target_jd=target_jd)

        duration_ms = (time.time() - start) * 1000
        analyze_counter.add(1, {"type": "text"})
        analyze_duration.record(duration_ms, {"type": "text"})

        return _build_response(state)


async def _run_graph(pdf_bytes=None, raw_text=None, target_role=None, target_jd=None):
    initial_state = {
        "pdf_bytes": pdf_bytes,
        "raw_text": raw_text or "",
        "sections": None,
        "target_role": target_role,
        "target_jd": target_jd,
        "analysis": None,
        "error": None,
        "stage": "init",
    }
    result = profile_graph.invoke(initial_state)
    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@router.post("/rewrite-section")
async def rewrite_section(
    section: str = Form(...),
    content: str = Form(...),
    target_role: Optional[str] = Form(None),
):
    """Generate a fresh AI rewrite for a single LinkedIn section."""
    prompt_template = SECTION_REWRITE_PROMPTS.get(section.lower())
    if not prompt_template:
        raise HTTPException(status_code=400, detail=f"Unknown section '{section}'")

    if not content.strip():
        raise HTTPException(status_code=400, detail="Section content cannot be empty")

    prompt = prompt_template.format(
        content=content[:3000],
        target_role=target_role or "Not specified",
    )
    logger.info("rewrite_section_request", section=section, target_role=target_role)

    try:
        text, _, _ = _llm_complete(prompt, max_tokens=1024)
        return {"section": section, "rewritten": text.strip()}
    except Exception as e:
        logger.error("rewrite_section_error", section=section, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


def _build_response(state: dict) -> ProfileAnalysis:
    analysis = state["analysis"]
    raw = analysis.get("raw_sections", {})
    return ProfileAnalysis(
        overall_score=analysis["overall_score"],
        letter_grade=analysis["letter_grade"],
        sections=analysis["sections"],
        rewritten_headline=analysis.get("rewritten_headline", ""),
        rewritten_about=analysis.get("rewritten_about", ""),
        rewritten_bullets=analysis.get("rewritten_bullets", []),
        keyword_match_before=analysis.get("keyword_match_before"),
        keyword_match_after=analysis.get("keyword_match_after"),
        raw_sections=raw,
        person_name=raw.get("name", ""),
        person_location=raw.get("location", ""),
        person_linkedin_url=raw.get("linkedin_url", ""),
    )
