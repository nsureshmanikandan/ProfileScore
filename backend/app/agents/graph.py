"""
LangGraph agentic workflow for LinkedIn profile analysis.
State flows: parse -> score -> rewrite -> finalize
"""
from typing import TypedDict, Optional, Annotated
from langgraph.graph import StateGraph, END
from opentelemetry.trace import SpanKind

from app.core.telemetry import get_tracer
from app.core.logging import get_logger
from app.services.pdf_parser import extract_text_from_pdf, clean_extracted_text, parse_linkedin_text
from app.services.llm_service import analyze_profile

logger = get_logger(__name__)
tracer = get_tracer("langgraph_workflow")


class ProfileState(TypedDict):
    raw_text: Optional[str]
    pdf_bytes: Optional[bytes]
    sections: Optional[dict]
    target_role: Optional[str]
    target_jd: Optional[str]
    analysis: Optional[dict]
    error: Optional[str]
    stage: str


def parse_node(state: ProfileState) -> ProfileState:
    """Parse PDF or raw text into sections."""
    with tracer.start_as_current_span("agent.parse", kind=SpanKind.INTERNAL) as span:
        logger.info("agent_parse_start", stage=state.get("stage"))
        try:
            raw_text = state.get("raw_text", "")

            if state.get("pdf_bytes"):
                raw_text = extract_text_from_pdf(state["pdf_bytes"])
                span.set_attribute("source", "pdf")
            else:
                span.set_attribute("source", "text")

            raw_text = clean_extracted_text(raw_text)
            sections = parse_linkedin_text(raw_text)

            span.set_attribute("sections_found", len([v for v in sections.values() if v and v != sections.get("raw")]))
            logger.info("agent_parse_complete", sections=list(sections.keys()))

            return {**state, "raw_text": raw_text, "sections": sections, "stage": "parsed"}
        except Exception as e:
            logger.error("agent_parse_error", error=str(e))
            return {**state, "error": str(e), "stage": "error"}


def score_node(state: ProfileState) -> ProfileState:
    """Score sections using LLM."""
    with tracer.start_as_current_span("agent.score", kind=SpanKind.INTERNAL) as span:
        if state.get("error"):
            return state
        logger.info("agent_score_start")
        try:
            analysis = analyze_profile(
                sections=state["sections"],
                target_role=state.get("target_role"),
                target_jd=state.get("target_jd"),
            )
            span.set_attribute("overall_score", analysis.get("overall_score", 0))
            logger.info("agent_score_complete", score=analysis.get("overall_score"))
            return {**state, "analysis": analysis, "stage": "scored"}
        except Exception as e:
            logger.error("agent_score_error", error=str(e))
            return {**state, "error": str(e), "stage": "error"}


def finalize_node(state: ProfileState) -> ProfileState:
    """Enrich analysis with metadata."""
    with tracer.start_as_current_span("agent.finalize", kind=SpanKind.INTERNAL):
        if state.get("error"):
            return state
        analysis = state["analysis"]
        analysis["raw_sections"] = {k: v for k, v in state["sections"].items() if k != "raw"}
        logger.info("agent_finalize_complete", overall_score=analysis.get("overall_score"))
        return {**state, "analysis": analysis, "stage": "complete"}


def should_continue(state: ProfileState) -> str:
    if state.get("error"):
        return "end"
    stage = state.get("stage", "")
    if stage == "parsed":
        return "score"
    if stage == "scored":
        return "finalize"
    return "end"


def build_graph() -> StateGraph:
    workflow = StateGraph(ProfileState)
    workflow.add_node("parse", parse_node)
    workflow.add_node("score", score_node)
    workflow.add_node("finalize", finalize_node)

    workflow.set_entry_point("parse")
    workflow.add_conditional_edges("parse", should_continue, {"score": "score", "end": END})
    workflow.add_conditional_edges("score", should_continue, {"finalize": "finalize", "end": END})
    workflow.add_edge("finalize", END)

    return workflow.compile()


profile_graph = build_graph()
