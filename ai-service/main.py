"""AI Service for AaaG — Claude-powered content generation.

Provides endpoints for generating personalized app content using the Anthropic API.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from anthropic import Anthropic, APIConnectionError, RateLimitError, AuthenticationError, APIStatusError
import os

app = FastAPI(title="AaaG AI Service", version="0.1.0")

# Initialize Anthropic client
api_key = os.getenv("ANTHROPIC_API_KEY")
if not api_key:
    raise ValueError("ANTHROPIC_API_KEY environment variable is not set")

client = Anthropic(api_key=api_key)


class GenerateRequest(BaseModel):
    """Request model for content generation."""
    prompt: str = Field(..., min_length=1, max_length=2000, description="The prompt for content generation")
    max_tokens: int = Field(default=1024, ge=1, le=4096, description="Maximum tokens in response")


class GenerateResponse(BaseModel):
    """Response model for content generation."""
    content: str
    tokens_used: int
    model: str


@app.post("/generate", response_model=GenerateResponse)
async def generate_content(request: GenerateRequest) -> GenerateResponse:
    """Generate personalized content using Claude.
    
    Args:
        request: GenerateRequest with prompt and optional max_tokens
        
    Returns:
        GenerateResponse with generated content and token usage
        
    Raises:
        HTTPException: On API errors (connection, rate limit, auth, or server errors)
    """
    # Validate input
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty or whitespace-only")
    
    if request.max_tokens < 1 or request.max_tokens > 4096:
        raise HTTPException(status_code=400, detail="max_tokens must be between 1 and 4096")
    
    try:
        # Call Anthropic API
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=request.max_tokens,
            messages=[
                {
                    "role": "user",
                    "content": request.prompt
                }
            ]
        )
        
        # Extract content from response
        if not response.content or len(response.content) == 0:
            raise HTTPException(status_code=500, detail="Empty response from API")
        
        content = response.content[0].text
        
        return GenerateResponse(
            content=content,
            tokens_used=response.usage.output_tokens,
            model=response.model
        )
        
    except APIConnectionError as e:
        # Connection error — service unavailable
        raise HTTPException(
            status_code=503,
            detail=f"API connection error: {str(e)}"
        )
    except RateLimitError as e:
        # Rate limit exceeded
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {str(e)}"
        )
    except AuthenticationError as e:
        # Authentication failed
        raise HTTPException(
            status_code=401,
            detail=f"Authentication error: {str(e)}"
        )
    except APIStatusError as e:
        # Generic API error
        raise HTTPException(
            status_code=500,
            detail=f"API error: {str(e)}"
        )
    except Exception as e:
        # Unexpected error
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "ai-service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
