from fastapi import APIRouter
from core.claude import ask_json

router = APIRouter(prefix="/diary", tags=["diary"])

SYSTEM_PROMPT = """
You are a warm, thoughtful writer who creates personal memory apps.
Generate touching, personalized content for someone's digital diary app.
Your tone is intimate, celebratory, and emotionally resonant — like a best friend
who knows how to put feelings into words.
"""


async def generate(user_config: dict) -> dict:
    """
    Generate personalized diary app content.

    user_config is an AppConfigEnvelope:
        meta.recipient_name:           str  - "Sarah"
        user_inputs.personal_message:  str  - gifter's personal note
        media.photos:                  list - list of MediaRef dicts (one per photo)

    Returns DiaryAppContent:
        app_title:        str
        welcome_message:  str
        personal_note:    str
        memory_captions:  list[str]  - one caption per photo
    """
    meta        = user_config.get("meta", {})
    user_inputs = user_config.get("user_inputs", {})
    media       = user_config.get("media", {})

    recipient = meta.get("recipient_name", "you")
    message   = user_inputs.get("personal_message", "")
    photos    = media.get("photos", [])
    photo_count = len(photos) if isinstance(photos, list) else 0

    captions_instruction = ""
    if photo_count > 0:
        captions_instruction = f"""
- "memory_captions": an array of exactly {photo_count} short, warm caption(s).
  Each caption should be 1–2 sentences, poetic and personal, as if written by someone
  who loves {recipient}. Make each caption feel unique — vary the tone from nostalgic
  to joyful to tender across the set."""
    else:
        captions_instruction = '- "memory_captions": an empty array []'

    prompt = f"""
Create personalized content for a digital diary app gifted to {recipient}.

The gifter wrote this personal message:
"{message if message else 'No message provided — infer warmth and affection from context.'}"

Generate the following JSON (respond with valid JSON only):

{{
  "app_title": "A personal title for {recipient}'s diary app — warm, short (3–6 words), e.g. '{recipient}'s Memory Book'",
  "welcome_message": "2–3 sentences shown at the top of the app when {recipient} first opens it. Should feel like a warm hug in words. Reference their name.",
  "personal_note": "The gifter's personal message, lightly polished for readability. If no message was provided, write a heartfelt default (2–3 sentences) on their behalf.",
  "memory_captions": []
}}

Replace the memory_captions field as follows:
{captions_instruction}

Important: respond with valid JSON only. No markdown, no explanation.
"""

    return await ask_json(SYSTEM_PROMPT, prompt, max_tokens=2000)
