from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from anthropic import Anthropic, APIError, APIConnectionError, APITimeoutError
import os

app = FastAPI()

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


class GenerateRequest(BaseModel):
    user_input: str = Field(min_length=1, description="User input for content generation")
    template_context: str = Field(min_length=1, description="Template context")
    template_id: str = Field(min_length=1, description="Template ID")


class GenerateResponse(BaseModel):
    content: str
    template_id: str


@app.post("/generate", response_model=GenerateResponse)
def generate(request: GenerateRequest):
    """
    Generate personalized content using Claude.
    
    Returns structured error responses for:
    - 400: Invalid input (missing or empty fields)
    - 502: Anthropic API error
    - 503: Connection error
    - 504: Timeout error
    """
    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": f"Template: {request.template_context}\n\nUser input: {request.user_input}",
                }
            ],
        )
        return GenerateResponse(
            content=message.content[0].text,
            template_id=request.template_id,
        )
    except APIError as e:
        # Anthropic API error (e.g., invalid model, rate limit, auth failure)
        raise HTTPException(
            status_code=502,
            detail="AI service temporarily unavailable. Please try again later.",
        )
    except APIConnectionError:
        # Network connectivity issue
        raise HTTPException(
            status_code=503,
            detail="Service connection failed. Please try again later.",
        )
    except APITimeoutError:
        # Request timeout
        raise HTTPException(
            status_code=504,
            detail="Request timed out. Please try again later.",
        )
    except Exception:
        # Catch-all for unexpected errors; do not expose raw traceback
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred. Please try again later.",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
