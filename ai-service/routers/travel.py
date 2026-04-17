from fastapi import APIRouter
from core.claude import ask_json

router = APIRouter(prefix="/travel", tags=["travel"])

SYSTEM_PROMPT = """
You are an expert travel planner who creates deeply personalized itineraries.
You know local hidden gems, respect budgets, and account for group dynamics.
Write in an engaging, friendly tone that excites the traveler.
"""


async def generate(user_config: dict) -> dict:
    """
    Generate personalized travel planner content.

    user_config is an AppConfigEnvelope:
        user_inputs.group_name:    str  - "The Sharma Family"
        user_inputs.destination:   str  - "Smoky Mountains, TN"
        user_inputs.travel_dates:  str  - "March 15-20, 2025"
        user_inputs.budget_level:  str  - "budget" | "mid-range" | "luxury"
        user_inputs.hotel_style:   str  - "cabin" | "hotel" | "airbnb"
        user_inputs.interests:     list - ["hiking", "food", "local culture"]
        user_inputs.members:       list - ["Dad", "Mom", "Priya", ...]
    """
    user_inputs = user_config.get("user_inputs", {})

    group = user_inputs.get("group_name", "Your Group")
    destination = user_inputs.get("destination", "")
    dates = user_inputs.get("travel_dates", "")
    budget = user_inputs.get("budget_level", "mid-range")
    interests = ", ".join(user_inputs.get("interests", ["general sightseeing"]))
    hotel_style = user_inputs.get("hotel_style", "hotel")
    members = user_inputs.get("members", [])

    prompt = f"""
Create a complete travel companion app for {group} visiting {destination} ({dates}).

Group details:
- Budget: {budget}
- Accommodation preference: {hotel_style}
- Interests: {interests}
- Group members: {', '.join(members) if members else 'a group of travelers'}

Generate a full travel companion including:

Return JSON in this exact structure:
{{
  "app_title": "{group}'s {destination} Trip",
  "destination": "{destination}",
  "travel_dates": "{dates}",
  "group_members": {members},
  "hero_tagline": "An exciting 1-line tagline for this trip",
  "quick_facts": {{
    "best_time_to_visit": "...",
    "local_currency": "...",
    "weather": "...",
    "time_zone": "..."
  }},
  "itinerary": [
    {{
      "day": 1,
      "date": "March 15",
      "title": "Day title",
      "theme": "Arrival & Settling In",
      "activities": [
        {{
          "time": "10:00 AM",
          "title": "Activity name",
          "description": "2-sentence description",
          "location": "Specific place name",
          "duration_hours": 2,
          "cost_estimate": "$20 per person",
          "tips": "Helpful tip",
          "category": "nature"
        }}
      ]
    }}
  ],
  "restaurant_picks": [
    {{
      "name": "Restaurant name",
      "cuisine": "American",
      "price_range": "$$",
      "must_try": "Signature dish",
      "vibe": "Family-friendly, rustic"
    }}
  ],
  "packing_list": ["Item 1", "Item 2"],
  "emergency_contacts": {{
    "local_police": "911",
    "nearest_hospital": "LeConte Medical Center"
  }}
}}
"""

    return await ask_json(SYSTEM_PROMPT, prompt, max_tokens=8000)