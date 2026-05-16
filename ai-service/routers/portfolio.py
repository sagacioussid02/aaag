from typing import Any, Literal, NotRequired, TypedDict

from fastapi import APIRouter

from core.claude import ask_json

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


GiftMode = Literal["gift", "self"]
ThemeMode = Literal["light", "dark"]
ThemeLayout = Literal["cinematic", "classic", "minimal"]
Confidence = Literal["low", "medium", "high"]


class PortfolioLink(TypedDict):
    label: str
    url: str


class PortfolioProfile(TypedDict):
    name: str
    headline: str
    location: NotRequired[str]
    summary: str
    email: NotRequired[str]
    phone: NotRequired[str]
    website: NotRequired[str]
    links: list[PortfolioLink]


class PortfolioExperience(TypedDict):
    company: str
    title: str
    period: str
    location: NotRequired[str]
    current: NotRequired[bool]
    bullets: list[str]
    highlights: list[str]
    tech: list[str]


class PortfolioProject(TypedDict):
    title: str
    description: str
    impact: NotRequired[str]
    tags: list[str]
    links: list[PortfolioLink]
    featured: bool


class PortfolioSkillGroup(TypedDict):
    label: str
    skills: list[str]


class PortfolioEducation(TypedDict):
    institution: str
    credential: str
    period: NotRequired[str]
    details: NotRequired[list[str]]


class PortfolioTheme(TypedDict):
    mode: ThemeMode
    accent: str
    layout: ThemeLayout


class PortfolioSourceSummary(TypedDict):
    inferred_from: list[str]
    missing_info: list[str]
    notes: list[str]


class PortfolioQualityFlag(TypedDict):
    field: str
    issue: str
    confidence: Confidence


class PortfolioConfig(TypedDict):
    version: Literal["1"]
    gift_mode: GiftMode
    recipient_name: str
    buyer_email: str
    app_title: str
    profile: PortfolioProfile
    experience: list[PortfolioExperience]
    projects: list[PortfolioProject]
    skills: list[PortfolioSkillGroup]
    education: list[PortfolioEducation]
    theme: PortfolioTheme
    source_summary: PortfolioSourceSummary
    quality_flags: list[PortfolioQualityFlag]


SYSTEM_PROMPT = """
You are an expert portfolio strategist, resume editor, and frontend content director.
You transform resumes, cover letters, and notes into polished portfolio website content.

Rules:
- Do not invent employers, degrees, projects, dates, links, or contact details.
- If a detail is missing or uncertain, add it to quality_flags or source_summary.missing_info.
- Keep writing specific, concrete, and recruiter-friendly.
- Emphasize measurable impact, technical depth, and the recipient's strongest narrative.
- Preserve resume detail generously: include all clearly listed roles, major projects,
  skill groups, education entries, certifications, awards, publications, and contact links.
- Prefer complete useful sections over a short landing-page summary.
- Return only valid JSON matching the requested schema.
"""


def _text(value: Any) -> str:
    return value if isinstance(value, str) else ""


def _document_text(user_config: dict, key: str) -> str:
    user_inputs = user_config.get("user_inputs", {})
    source_documents = user_config.get("source_documents", [])

    direct_text = _text(user_inputs.get(f"{key}_text")).strip()
    if direct_text:
        return direct_text

    if isinstance(source_documents, list):
        for doc in source_documents:
            if not isinstance(doc, dict):
                continue
            if doc.get("field_key") == key:
                extracted = _text(doc.get("extracted_text")).strip()
                if extracted:
                    return extracted

    return ""


def _document_summary(user_config: dict) -> str:
    media = user_config.get("media", {})
    source_documents = user_config.get("source_documents", [])
    fragments: list[str] = []

    if isinstance(source_documents, list):
        for doc in source_documents:
            if isinstance(doc, dict):
                fragments.append(
                    f"- {doc.get('document_type', 'document')}: "
                    f"{doc.get('file_name', doc.get('storage_path', 'uploaded file'))} "
                    f"({doc.get('extraction_status', 'uploaded')})"
                )

    if isinstance(media, dict):
        for key, value in media.items():
            if isinstance(value, dict):
                fragments.append(
                    f"- {key}: {value.get('storage_path', 'uploaded file')} "
                    f"({value.get('mime_type', 'unknown mime')})"
                )
            elif isinstance(value, list):
                fragments.append(f"- {key}: {len(value)} uploaded file(s)")

    return "\n".join(fragments) or "- No source document metadata provided."


def _fallback_content(user_config: dict) -> PortfolioConfig:
    meta = user_config.get("meta", {})
    user_inputs = user_config.get("user_inputs", {})

    recipient = _text(meta.get("recipient_name")) or "Portfolio Owner"
    buyer_email = _text(meta.get("buyer_email"))
    gift_mode = user_inputs.get("gift_mode")
    if gift_mode not in ("gift", "self"):
        gift_mode = "gift"

    preferred_theme = user_inputs.get("preferred_theme")
    if preferred_theme not in ("cinematic", "classic", "minimal"):
        preferred_theme = "cinematic"

    return {
        "version": "1",
        "gift_mode": gift_mode,
        "recipient_name": recipient,
        "buyer_email": buyer_email,
        "app_title": f"{recipient}'s Portfolio",
        "profile": {
            "name": recipient,
            "headline": "Professional portfolio",
            "summary": "A polished portfolio generated from the provided source documents. Add resume text or extracted PDF content to make this more specific.",
            "links": [],
        },
        "experience": [],
        "projects": [],
        "skills": [{"label": "Core Skills", "skills": []}],
        "education": [],
        "theme": {
            "mode": "dark",
            "accent": "#6C63FF",
            "layout": preferred_theme,
        },
        "source_summary": {
            "inferred_from": ["uploaded document metadata", "user notes"],
            "missing_info": ["Resume text extraction has not completed yet."],
            "notes": [_text(user_inputs.get("portfolio_notes"))] if user_inputs.get("portfolio_notes") else [],
        },
        "quality_flags": [
            {
                "field": "profile.summary",
                "issue": "Generated without extracted resume text.",
                "confidence": "low",
            }
        ],
    }


async def generate(user_config: dict) -> PortfolioConfig:
    """
    Generate a config-driven portfolio website.

    Input is an AppConfigEnvelope plus optional source_documents:
      meta.recipient_name
      meta.buyer_email
      user_inputs.gift_mode
      user_inputs.recipient_context
      user_inputs.portfolio_notes
      user_inputs.target_roles
      user_inputs.tone
      user_inputs.preferred_theme
      user_inputs.resume_pdf_text          optional extracted PDF text
      user_inputs.cover_letter_pdf_text    optional extracted PDF text
      source_documents[].extracted_text    optional extracted PDF text

    Returns PortfolioConfig, matching platform/lib/types.ts.
    """
    meta = user_config.get("meta", {})
    user_inputs = user_config.get("user_inputs", {})

    recipient = _text(meta.get("recipient_name")) or "Portfolio Owner"
    buyer_email = _text(meta.get("buyer_email"))
    gift_mode = user_inputs.get("gift_mode", "gift")
    recipient_context = _text(user_inputs.get("recipient_context"))
    notes = _text(user_inputs.get("portfolio_notes"))
    target_roles = _text(user_inputs.get("target_roles"))
    tone = _text(user_inputs.get("tone")) or "confident"
    preferred_theme = _text(user_inputs.get("preferred_theme")) or "cinematic"

    resume_text = _document_text(user_config, "resume_pdf")
    cover_letter_text = _document_text(user_config, "cover_letter_pdf")

    if not resume_text and not cover_letter_text and not notes:
        return _fallback_content(user_config)

    prompt = f"""
Create a portfolio website config for {recipient}.

Buyer email:
{buyer_email or "Not provided"}

Gift mode:
{gift_mode}

Recipient context:
{recipient_context or "Not provided"}

Target roles:
{target_roles or "Not provided"}

Requested tone:
{tone}

Preferred visual layout:
{preferred_theme}

Uploaded document metadata:
{_document_summary(user_config)}

Resume text:
{resume_text or "No extracted resume text provided."}

Cover letter text:
{cover_letter_text or "No extracted cover letter text provided."}

Additional user notes:
{notes or "No additional notes provided."}

Return JSON in this exact schema:
{{
  "version": "1",
  "gift_mode": "gift | self",
  "recipient_name": "{recipient}",
  "buyer_email": "{buyer_email}",
  "app_title": "Short portfolio title",
  "profile": {{
    "name": "Full name",
    "headline": "Specific professional headline",
    "location": "Location if known",
    "summary": "2-4 sentence portfolio intro",
    "email": "Email if known",
    "phone": "Phone if known",
    "website": "Website if known",
    "links": [{{ "label": "LinkedIn", "url": "https://..." }}]
  }},
  "experience": [
    {{
      "company": "Company",
      "title": "Role",
      "period": "Date range",
      "location": "Location if known",
      "current": true,
      "bullets": ["Impact-focused bullet"],
      "highlights": ["Short standout impact"],
      "tech": ["Technology"]
    }}
  ],
  "projects": [
    {{
      "title": "Project",
      "description": "Clear portfolio-ready description",
      "impact": "Measurable or qualitative impact if known",
      "tags": ["Next.js", "Go"],
      "links": [{{ "label": "Demo", "url": "https://..." }}],
      "featured": true
    }}
  ],
  "skills": [
    {{ "label": "Backend", "skills": ["Go", "Java"] }}
  ],
  "education": [
    {{
      "institution": "School",
      "credential": "Degree or certification",
      "period": "Date range if known",
      "details": ["Relevant detail"]
    }}
  ],
  "theme": {{
    "mode": "dark",
    "accent": "#6C63FF",
    "layout": "{preferred_theme if preferred_theme in ["cinematic", "classic", "minimal"] else "cinematic"}"
  }},
  "source_summary": {{
    "inferred_from": ["resume", "cover letter", "user notes"],
    "missing_info": ["Missing item"],
    "notes": ["Generation note"]
  }},
  "quality_flags": [
    {{
      "field": "field.path",
      "issue": "What is uncertain or missing",
      "confidence": "low | medium | high"
    }}
  ]
}}

If no projects are explicit in the source, infer project-like achievements only from actual described work and add a quality flag.
If links are not present, return an empty links array. Do not create fake URLs.
Include up to 8 experience entries, up to 10 project entries, and as many skill groups as needed.
For each experience entry, keep 3-6 concrete bullets when the resume provides enough detail.
For skills, group technologies into meaningful categories rather than one flat list.
"""

    try:
        result = await ask_json(SYSTEM_PROMPT, prompt, max_tokens=12000)
    except Exception:
        return _fallback_content(user_config)

    return result
