from fastapi import APIRouter
from core.claude import ask_json

router = APIRouter(prefix="/game", tags=["game"])

SYSTEM_PROMPT = """
You create fun, customized party games for groups of friends and family.
Games should be engaging, appropriate for mixed ages, and easy to play on phones.
Make prompts specific to the group's trip context for maximum fun.
"""


async def generate(user_config: dict) -> dict:
    """
    Generate trip game content (e.g., Pictionary-style, trivia, etc.)

    user_config is an AppConfigEnvelope:
        user_inputs.group_name:   str  - "Smoky Mountains Crew"
        user_inputs.destination:  str  - "Smoky Mountains"
        user_inputs.game_type:    str  - "pictionary" | "trivia" | "scavenger_hunt" | "would_you_rather"
        user_inputs.players:      list - ["Jake", "Maria", "Sidd", "Saloni"]
        user_inputs.trip_theme:   str  - "road trip" | "hiking" | "beach" | "city"
        user_inputs.age_range:    str  - "adults" | "mixed" | "family"
    """
    user_inputs = user_config.get("user_inputs", {})

    group = user_inputs.get("group_name", "The Crew")
    destination = user_inputs.get("destination", "our trip")
    game_type = user_inputs.get("game_type", "trivia")
    players = user_inputs.get("players", [])
    theme = user_inputs.get("trip_theme", "road trip")
    age_range = user_inputs.get("age_range", "adults")

    prompt = f"""
Create a fun {game_type} game pack for {group} on their {destination} trip.

Context:
- Players: {', '.join(players) if players else 'a group of friends'}
- Trip theme: {theme}
- Age range: {age_range}

Make the content specific to {destination} and their {theme} — inside jokes, local references,
trip-specific scenarios. This should feel personal, not generic.

Return JSON in this exact structure:
{{
  "app_title": "{group} Game Night",
  "game_type": "{game_type}",
  "destination": "{destination}",
  "players": {players},
  "rounds": [
    {{
      "round_number": 1,
      "round_title": "Round name",
      "cards": [
        {{
          "id": "1",
          "prompt": "What to draw / trivia question / scenario",
          "category": "travel" ,
          "difficulty": "easy",
          "answer": "Answer (for trivia) or null for drawing games",
          "fun_fact": "Optional amusing related fact"
        }}
      ]
    }}
  ],
  "scoring_rules": "Simple explanation of how to keep score",
  "house_rules": ["Optional fun house rule 1", "House rule 2"],
  "winner_announcement": "Fun message to show the winner"
}}

Generate 5 rounds with 10 cards each. Mix difficulties.
"""

    return await ask_json(SYSTEM_PROMPT, prompt, max_tokens=8000)