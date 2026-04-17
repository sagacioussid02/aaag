from fastapi import APIRouter
from core.claude import ask_json

router = APIRouter(prefix="/event", tags=["event"])


SYSTEM_PROMPT = """
You are an event planner and copywriter. You create personalized event apps
with all the details guests need — schedule, RSVP info, venue, and memories.
"""


async def generate(user_config: dict) -> dict:
    """
    Generate personalized event app content.

    user_config is an AppConfigEnvelope:
        meta.app_name:             str - event name (set from recipient/app name)
        user_inputs.event_name:    str - explicit event name override
        user_inputs.host_name:     str - host's name
        user_inputs.event_date:    str - event date string
        user_inputs.message:       str - message from host to guests
    """
    meta        = user_config.get("meta", {})
    user_inputs = user_config.get("user_inputs", {})

    name = user_inputs.get("event_name") or meta.get("app_name", "Our Event")
    host = user_inputs.get("host_name", "the host")
    date = user_inputs.get("event_date", "soon")
    message = user_inputs.get("message", "")

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
