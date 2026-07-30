import pdfplumber
import io
import re
from typing import Optional
from app.core.logging import get_logger

logger = get_logger(__name__)


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from LinkedIn PDF export."""
    text_parts = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text(x_tolerance=3, y_tolerance=3)
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


# Lines matching these patterns are LinkedIn export artifacts — strip from all sections
_ARTIFACT_PATTERNS = [
    re.compile(r'https?://www\.linkedin\.com/', re.I),      # LinkedIn URLs
    re.compile(r'\d{1,2}/\d{1,2}/\d{2,4},?\s+\d+:\d+\s*(AM|PM)', re.I),  # timestamps
    re.compile(r'^\d+\s*/\s*\d+$'),                          # page numbers  "5/8"
    re.compile(r'suresh manikandan natarajan\s*\|\s*linkedin', re.I),  # name | LinkedIn footer
    re.compile(r'^add the products you use', re.I),
    re.compile(r'^add connected apps', re.I),
    re.compile(r'^connected apps$', re.I),
    re.compile(r'^(gamma|intellij|hubspot|replit|notion|figma|canva)\b', re.I),  # app name rows
    re.compile(r'to stand out and get more profile views', re.I),
    re.compile(r'contact.*on linkedin', re.I),
    re.compile(r'^see all \d+', re.I),
    re.compile(r'^show (more|all|less)', re.I),
    re.compile(r'^\d+ connections?$', re.I),
    re.compile(r'^\d+ followers?$', re.I),
]

# Section headings that mark non-content blocks — stop accumulating useful content here
_STOP_SECTIONS = {
    "connected apps", "interests", "recommendations", "people also viewed",
    "more profiles for you", "other similar profiles", "pages", "groups",
    "following & followers", "volunteering", "publications", "patents",
    "languages", "causes", "organizations", "test scores", "courses",
    "projects", "honors & awards", "contact info",
}


def _is_artifact(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    return any(p.search(s) for p in _ARTIFACT_PATTERNS)


def clean_extracted_text(text: str) -> str:
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()


def _clean_section(text: str) -> str:
    """Remove LinkedIn export artifacts from a section's content."""
    lines = [l for l in text.split('\n') if not _is_artifact(l)]
    # Drop trailing blank lines
    while lines and not lines[-1].strip():
        lines.pop()
    return '\n'.join(lines).strip()


def _extract_header_info(lines: list[str]) -> dict:
    """Extract name, location, and LinkedIn URL from the first few lines of a LinkedIn PDF."""
    info = {"name": "", "location": "", "linkedin_url": ""}
    non_empty = [l.strip() for l in lines if l.strip()]

    # Name is the first non-empty line (before any section header)
    section_words = {"about", "experience", "education", "skills", "certifications", "featured", "summary"}
    for line in non_empty[:5]:
        low = line.lower()
        if low not in section_words and not any(low.startswith(s) for s in section_words):
            if not re.search(r'(linkedin\.com|http)', low) and len(line.split()) <= 6:
                info["name"] = line
                break

    # LinkedIn URL — scan all lines
    for line in non_empty:
        m = re.search(r'linkedin\.com/in/([\w\-]+)', line, re.I)
        if m:
            info["linkedin_url"] = f"linkedin.com/in/{m.group(1)}"
            break

    # Location — looks like "City, Country" or "City, State, Country"
    for line in non_empty[1:10]:
        if re.match(r'^[A-Z][a-zA-Z\s]+,\s*[A-Z]', line) and len(line.split()) <= 8:
            info["location"] = line
            break

    return info


def parse_linkedin_text(raw_text: str) -> dict:
    """
    Heuristically split LinkedIn text into sections.
    Returns a dict keyed by section name.
    """
    sections = {
        "name": "",
        "location": "",
        "linkedin_url": "",
        "headline": "",
        "about": "",
        "experience": "",
        "education": "",
        "skills": "",
        "certifications": "",
        "featured": "",
        "raw": raw_text,
    }

    lines = raw_text.split('\n')

    # Extract header info before section parsing
    header = _extract_header_info(lines)
    sections.update(header)

    current_section = "headline"
    section_map = {
        "about": ["about", "summary"],
        "experience": ["experience", "work experience", "employment"],
        "education": ["education"],
        "skills": ["skills", "top skills"],
        "certifications": ["certifications", "licenses", "licenses & certifications"],
        "featured": ["featured"],
    }

    buffer = []
    for line in lines:
        stripped = line.strip().lower()

        # Stop section — discard everything from here onward into a sink
        if stripped in _STOP_SECTIONS:
            sections[current_section] += "\n".join(buffer).strip()
            buffer = []
            current_section = "_sink"
            continue

        matched_section = None
        for sec, keywords in section_map.items():
            if any(stripped == kw or stripped.startswith(kw + " ") for kw in keywords):
                matched_section = sec
                break

        if matched_section:
            sections[current_section] += "\n".join(buffer).strip()
            buffer = []
            current_section = matched_section
        else:
            buffer.append(line)

    if current_section != "_sink":
        sections[current_section] += "\n".join(buffer).strip()

    # First non-section content -> headline if still empty
    if not sections["headline"] and lines:
        sections["headline"] = lines[0].strip()

    # Strip artifacts from every section
    for key in list(sections.keys()):
        if key not in ("raw", "name", "location", "linkedin_url"):
            sections[key] = _clean_section(sections[key])

    return sections
