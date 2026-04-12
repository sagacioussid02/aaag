from fastapi import APIRouter
from core.claude import ask_json

router = APIRouter(prefix="/event", tags=["event"])


SYSTEM_PROMPT = """
You are an event planner and copywriter. You create personalized event apps
with all the details guests need — schedule, RSVP info, venue, and memories.
"""


async def generate(user_config: dict) -> dict:
    """Generate personalized event app content."""
    name = user_config.get("event_name", "Our Event")
    host = user_config.get("host_name", "the host")
    date = user_config.get("event_date", "soon")
    message = user_config.get("message", "")

    prompt = f"""
Create a personalized event app for "{name}" hosted by {host} on {date}.

Return JSON in this exact structure:
{{
  "app_title": "{name}",
  "welcome_message": "A warm 2-sentence welcome for guests",
  "host_note": "{message if message else 'A warm note from the host'}",
  "schedule": [
    {{ "time": "6:00 PM", "title": "Arrival", "description": "Brief description" }}
  ],
  "details": {{
    "date": "{date}",
    "host": "{host}",
    "dress_code": "Smart casual",
    "note": "Any important note for guests"
  }}
}}
"""
    return await ask_json(SYSTEM_PROMPT, prompt)
