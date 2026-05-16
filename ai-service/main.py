from fastapi import FastAPI
from routers import recipe, travel, game, event, diary, portfolio

app = FastAPI(title="AaaG AI Service", version="0.1.0")

app.include_router(recipe.router)
app.include_router(travel.router)
app.include_router(game.router)
app.include_router(event.router)
app.include_router(diary.router)
app.include_router(portfolio.router)


@app.post("/generate")
async def generate(payload: dict):
    """
    Main dispatcher. Routes to the right generator based on template_slug.
    Called by the Go API after a successful payment.

    Payload:
        {
          "template_slug": "personal-diary",
          "user_config": {
            "_version": "1",
            "meta": {
              "template_slug": "personal-diary",
              "app_name": "Sarah's Diary",
              "theme": "Warm Rose",
              "plan_type": "spark",
              "buyer_email": "gifter@example.com",
              "recipient_name": "Sarah"
            },
            "user_inputs": { "personal_message": "Happy Birthday!" },
            "media": { "photos": [{ "storage_path": "...", "public_url": "...", ... }] },
            "ai_content": {}
          }
        }

    Returns:
        { "content": { ...template-specific generated content... } }
    """
    slug = payload.get("template_slug", "")
    user_config = payload.get("user_config", {})

    generators = {
        "recipe-app":       recipe.generate,
        "travel-planner":   travel.generate,
        "trip-game":        game.generate,
        "event-app":        event.generate,
        "personal-diary":   diary.generate,
        "portfolio-website": portfolio.generate,
    }

    generator_fn = generators.get(slug)
    if not generator_fn:
        return {"error": f"Unknown template: {slug}"}, 400

    content = await generator_fn(user_config)
    return {"content": content}
