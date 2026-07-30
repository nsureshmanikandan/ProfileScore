from pydantic import BaseModel, Field
from typing import Optional, List


class AnalyzeRequest(BaseModel):
    text: Optional[str] = None
    target_role: Optional[str] = None
    target_jd: Optional[str] = None


class SectionFeedback(BaseModel):
    section: str
    score: int = Field(ge=0, le=100)
    what_working: List[str]
    what_not_working: List[str]
    how_to_fix: str
    rewritten: Optional[str] = None


class ProfileAnalysis(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    letter_grade: str
    sections: List[SectionFeedback]
    rewritten_headline: str
    rewritten_about: str
    rewritten_bullets: List[str]
    keyword_match_before: Optional[int] = None
    keyword_match_after: Optional[int] = None
    raw_sections: dict
    person_name: str = ""
    person_location: str = ""
    person_linkedin_url: str = ""


class ResumeRequest(BaseModel):
    analysis: ProfileAnalysis
    target_role: Optional[str] = None
    format: str = "docx"  # docx or pdf
