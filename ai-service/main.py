from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import anthropic

app = FastAPI(title="AaaG AI Service", version="1.0.0")

class GenerateRequest(BaseModel):
    recipient_name: str
    occasion: str
    theme: str
    custom_message: str = ""

class GenerateResponse(BaseModel):
    title: str
    description: str
    code: str
    gift_url: str = ""

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}

@app.post("/generate", response_model=GenerateResponse)
def generate_micro_app(request: GenerateRequest):
    """
    Generate a personalized micro-app using Claude.
    
    Takes recipient details, occasion, theme, and optional custom message,
    then returns a generated micro-app with title, description, and code.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")
    
    client = anthropic.Anthropic(api_key=api_key)
    
    # Build prompt for Claude
    prompt = f"""
You are a micro-app generator. Create a personalized micro-app gift.

Recipient: {request.recipient_name}
Occasion: {request.occasion}
Theme: {request.theme}
Custom Message: {request.custom_message or "(none)"}

Generate a micro-app with:
1. A catchy title
2. A brief description (1-2 sentences)
3. Simple HTML/CSS/JavaScript code (under 500 chars)

Respond in JSON format:
{{
  "title": "...",
  "description": "...",
  "code": "..."
}}
"""
    
    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Parse Claude's response
        response_text = message.content[0].text
        
        # Extract JSON from response
        import json
        import re
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if not json_match:
            raise ValueError("Could not parse JSON from Claude response")
        
        parsed = json.loads(json_match.group())
        
        return GenerateResponse(
            title=parsed.get("title", "Untitled Gift"),
            description=parsed.get("description", "A personalized micro-app gift"),
            code=parsed.get("code", "<h1>Gift</h1>"),
            gift_url=""
        )
    
    except anthropic.APIError as e:
        raise HTTPException(status_code=500, detail=f"Claude API error: {str(e)}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse Claude response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
