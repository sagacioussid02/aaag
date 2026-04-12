from fastapi import APIRouter
from core.claude import ask_json

router = APIRouter(prefix="/recipe", tags=["recipe"])


SYSTEM_PROMPT = """
You are a professional chef and food writer. You create personalized recipe collections
for individuals based on their cuisine preferences, dietary restrictions, and cooking skill level.
Generate warm, friendly recipes with clear instructions suitable for home cooks.
"""


async def generate(user_config: dict) -> dict:
    """
    Generate personalized recipe app content.

    user_config fields:
        recipient_name: str         - "Sarah"
        cuisines: list[str]         - ["Italian", "Indian"]
        dietary_restrictions: list  - ["vegetarian", "gluten-free"]
        skill_level: str            - "beginner" | "intermediate" | "advanced"
        message: str                - personal message from the gifter
        theme: str                  - color theme slug
    """
    name = user_config.get("recipient_name", "you")
    cuisines = ", ".join(user_config.get("cuisines", ["any"]))
    restrictions = ", ".join(user_config.get("dietary_restrictions", [])) or "none"
    skill = user_config.get("skill_level", "intermediate")
    message = user_config.get("message", "")

    prompt = f"""
Create a personalized recipe collection for {name}.

Their preferences:
- Favorite cuisines: {cuisines}
- Dietary restrictions: {restrictions}
- Cooking skill level: {skill}

Generate exactly 12 recipes spread across their preferred cuisines.

Return JSON in this exact structure:
{{
  "app_title": "{name}'s Kitchen",
  "welcome_message": "A warm 2-sentence welcome message personalized for {name}",
  "personal_note": "{message if message else 'A warm note about enjoying cooking'}",
  "recipes": [
    {{
      "id": "1",
      "title": "Recipe Name",
      "cuisine": "Italian",
      "description": "2-sentence enticing description",
      "prep_time_minutes": 15,
      "cook_time_minutes": 30,
      "servings": 4,
      "difficulty": "easy",
      "ingredients": ["2 cups flour", "3 eggs", ...],
      "steps": ["Step 1 description", "Step 2 description", ...],
      "tips": "One helpful pro tip",
      "emoji": "🍝"
    }}
  ]
}}
"""

    return await ask_json(SYSTEM_PROMPT, prompt, max_tokens=8000)
