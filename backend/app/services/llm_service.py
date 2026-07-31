from openai import AzureOpenAI
from google import genai
from google.genai import types as genai_types
import httpx
import json
from app.core.config import settings
from app.core.logging import get_logger
from app.core.telemetry import get_tracer
from opentelemetry.trace import SpanKind

logger = get_logger(__name__)
tracer = get_tracer("llm_service")

# Azure OpenAI client (lazy — only used when provider == "azure")
_azure_client: AzureOpenAI | None = None

def _get_azure_client() -> AzureOpenAI:
    global _azure_client
    if _azure_client is None:
        _azure_client = AzureOpenAI(
            api_key=settings.azure_openai_api_key,
            azure_endpoint=settings.azure_openai_endpoint,
            api_version=settings.azure_openai_api_version,
            http_client=httpx.Client(verify=settings.ssl_verify),
        )
    return _azure_client

# Gemini client (lazy — only used when provider == "gemini")
_gemini_client: genai.Client | None = None

def _get_gemini_client() -> genai.Client:
    global _gemini_client
    if _gemini_client is None:
        http_opts = genai_types.HttpOptions(
            httpx_client=httpx.Client(verify=settings.ssl_verify),
        )
        _gemini_client = genai.Client(
            api_key=settings.gemini_api_key,
            http_options=http_opts,
        )
    return _gemini_client


def _llm_complete(prompt: str, max_tokens: int = 4096) -> tuple[str, int, int]:
    """Call the configured LLM provider. Returns (text, input_tokens, output_tokens)."""
    if settings.llm_provider == "gemini":
        client = _get_gemini_client()
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=genai_types.GenerateContentConfig(max_output_tokens=max_tokens),
        )
        text = response.text
        in_tok = getattr(response.usage_metadata, "prompt_token_count", 0)
        out_tok = getattr(response.usage_metadata, "candidates_token_count", 0)
        return text, in_tok, out_tok
    else:
        # Default: Azure OpenAI
        client = _get_azure_client()
        response = client.chat.completions.create(
            model=settings.azure_openai_deployment,
            max_completion_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.choices[0].message.content
        return text, response.usage.prompt_tokens, response.usage.completion_tokens

SCORING_PROMPT = """You are a professional LinkedIn profile coach and recruiter. Analyze the provided LinkedIn profile sections and return a detailed JSON analysis.

Profile sections:
{sections}

{target_context}

Return a JSON object with EXACTLY this structure:
{{
  "overall_score": <0-100 integer>,
  "letter_grade": "<A+|A|A-|B+|B|B-|C+|C|C-|D|F>",
  "sections": [
    {{
      "section": "<section name>",
      "score": <0-100>,
      "what_working": ["<bullet>", "<bullet>"],
      "what_not_working": ["<bullet>", "<bullet>"],
      "how_to_fix": "<concrete actionable instruction>",
      "rewritten": "<optional rewritten version>"
    }}
  ],
  "rewritten_headline": "<improved headline>",
  "rewritten_about": "<full rewritten about section>",
  "rewritten_bullets": ["<bullet 1>", "<bullet 2>", "<bullet 3>"],
  "keyword_match_before": <0-100 or null>,
  "keyword_match_after": <0-100 or null>
}}

Scoring rubric:
- Headline (15%): keyword-rich vs just job title; specific value proposition
- About/Summary (20%): first-person voice, quantified achievements, 150-300 words, keyword coverage
- Experience bullets (25%): action verbs, quantified impact (%, $, #), no generic duty-listing
- Skills (10%): 15-30 relevant skills, no filler
- Completeness (10%): custom URL, Featured section, certifications
- Overall coherence (20%): consistent narrative, no contradictions

Be specific and actionable. Return ONLY valid JSON."""

RESUME_PROMPT = """You are an expert ATS-optimized resume writer. Generate a complete professional resume.

Candidate: {person_name}
LinkedIn: {linkedin_url}
Location: {location}
Target role: {target_role}

=== RAW EXPERIENCE (use EXACT company names and dates from here) ===
{raw_experience}

=== RAW EDUCATION (copy EXACTLY — do not invent placeholders) ===
{raw_education}

=== RAW CERTIFICATIONS ===
{raw_certifications}

=== RAW SKILLS ===
{raw_skills}

=== AI-REWRITTEN SUMMARY ===
{rewritten_about}

=== AI-REWRITTEN BULLETS ===
{rewritten_bullets}

Generate the resume in this EXACT plain-text format:

PROFESSIONAL SUMMARY
[Use the AI-rewritten summary above, 3-4 sentences]

CORE COMPETENCIES
[18-24 skills pipe-separated, one long line: Skill 1 | Skill 2 | Skill 3 ...]

PROFESSIONAL EXPERIENCE

[Exact Company Name from RAW EXPERIENCE] | [Exact Job Title] | [Exact Start Year] – [Exact End Year or Present]
• [Achievement bullet with action verb + quantified metric]
• [Achievement bullet]
• [Achievement bullet]

[Repeat for ALL roles found in RAW EXPERIENCE]

EDUCATION

[Copy EXACTLY from RAW EDUCATION — degree | university | year, one entry per line]

CERTIFICATIONS

• [Certification | Issuer | Year — from RAW CERTIFICATIONS]

STRICT RULES — violations are failures:
- NEVER write [Company Name], [Job Title], [Degree Name], [University Name], or ANY bracketed placeholder
- Use ONLY actual names/dates found in the raw sections above
- If a value is truly missing, omit that field entirely rather than using a placeholder
- Strong action verbs (Led, Architected, Drove, Scaled, Delivered, Reduced, Grew)
- Quantify every bullet with %, $, team size, or time saved

Return ONLY the resume content starting from PROFESSIONAL SUMMARY."""


def analyze_profile(sections: dict, target_role: str = None, target_jd: str = None) -> dict:
    with tracer.start_as_current_span("llm.analyze_profile", kind=SpanKind.CLIENT) as span:
        span.set_attribute("llm.provider", settings.llm_provider)
        span.set_attribute("has_target_role", bool(target_role))

        sections_text = "\n\n".join([f"=== {k.upper()} ===\n{v}" for k, v in sections.items() if k != "raw" and v])

        target_context = ""
        if target_role:
            target_context = f"\nTarget role: {target_role}"
        if target_jd:
            target_context += f"\nTarget job description:\n{target_jd[:2000]}"

        prompt = SCORING_PROMPT.format(sections=sections_text, target_context=target_context)

        logger.info("calling_llm_for_analysis", provider=settings.llm_provider, sections_count=len(sections))

        raw_response, in_tok, out_tok = _llm_complete(prompt, max_tokens=4096)
        span.set_attribute("llm.input_tokens", in_tok)
        span.set_attribute("llm.output_tokens", out_tok)

        json_start = raw_response.find('{')
        json_end = raw_response.rfind('}') + 1
        json_str = raw_response[json_start:json_end]

        result = json.loads(json_str)
        logger.info("llm_analysis_complete", overall_score=result.get("overall_score"))
        return result


def generate_resume_text(analysis: dict, target_role: str = None,
                         person_name: str = "", linkedin_url: str = "", location: str = "") -> str:
    with tracer.start_as_current_span("llm.generate_resume", kind=SpanKind.CLIENT) as span:
        span.set_attribute("llm.provider", settings.llm_provider)

        raw = analysis.get("raw_sections", {})
        bullets = analysis.get("rewritten_bullets", [])

        prompt = RESUME_PROMPT.format(
            person_name=person_name or raw.get("name", "Not provided"),
            linkedin_url=linkedin_url or raw.get("linkedin_url", ""),
            location=location or raw.get("location", ""),
            target_role=target_role or "Not specified",
            raw_experience=raw.get("experience", "")[:2500],
            raw_education=raw.get("education", "Not available"),
            raw_certifications=raw.get("certifications", ""),
            raw_skills=raw.get("skills", ""),
            rewritten_about=analysis.get("rewritten_about", ""),
            rewritten_bullets="\n".join(f"• {b}" for b in bullets),
        )

        text, _, _ = _llm_complete(prompt, max_tokens=3000)
        return text
