import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import anthropic

app = FastAPI()

# Initialize Anthropic client at module level for efficiency
api_key = os.getenv("ANTHROPIC_API_KEY")
if not api_key:
    raise ValueError("ANTHROPIC_API_KEY environment variable is required")
client = anthropic.Anthropic(api_key=api_key)


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    max_tokens: int = Field(default=1024, ge=1, le=4096)


class ContentResponse(BaseModel):
    content: str
    tokens_used: int


def sanitize_error_message(error_str: str) -> str:
    """
    Sanitize error messages to exclude sensitive context.
    Removes API keys, internal paths, and other sensitive patterns.
    """
    sanitized = error_str
    # Remove common API key patterns
    import re
    sanitized = re.sub(r'sk-[a-zA-Z0-9]{20,}', '[REDACTED_API_KEY]', sanitized)
    sanitized = re.sub(r'Bearer\s+[a-zA-Z0-9_-]+', '[REDACTED_TOKEN]', sanitized)
    # Truncate to first 200 chars to avoid leaking stack traces
    if len(sanitized) > 200:
        sanitized = sanitized[:200] + "..."
    return sanitized


@app.post("/generate")
async def generate_content(request: GenerateRequest) -> ContentResponse:
    """
    Generate content using Anthropic API.
    Propagates SDK errors with appropriate HTTP status codes.
    """
    # Validate prompt is not whitespace-only
    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty or whitespace-only")
    
    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=request.max_tokens,
            messages=[
                {"role": "user", "content": request.prompt}
            ]
        )
        
        # Handle edge case: empty content block
        if not message.content or len(message.content) == 0:
            raise HTTPException(
                status_code=500,
                detail="Anthropic API returned empty content block"
            )
        
        # Extract text from first content block
        first_block = message.content[0]
        if not hasattr(first_block, 'text'):
            raise HTTPException(
                status_code=500,
                detail="Anthropic API returned non-text content block"
            )
        
        return ContentResponse(
            content=first_block.text,
            tokens_used=message.usage.output_tokens
        )
    
    except anthropic.APIStatusError as e:
        # Upstream API error with status code → map to 502 Bad Gateway
        error_detail = sanitize_error_message(str(e))
        raise HTTPException(
            status_code=502,
            detail=f"Upstream API error: {error_detail}"
        )
    
    except anthropic.BadRequestError as e:
        # Client error (invalid request) → 400
        error_detail = sanitize_error_message(str(e))
        raise HTTPException(
            status_code=400,
            detail=f"Invalid request: {error_detail}"
        )
    
    except anthropic.AuthenticationError as e:
        # Authentication failure → 401
        error_detail = sanitize_error_message(str(e))
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {error_detail}"
        )
    
    except anthropic.RateLimitError as e:
        # Rate limit exceeded → 429
        error_detail = sanitize_error_message(str(e))
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {error_detail}"
        )
    
    except anthropic.APIError as e:
        # Generic Anthropic SDK error → 500
        error_detail = sanitize_error_message(str(e))
        raise HTTPException(
            status_code=500,
            detail=f"API error: {error_detail}"
        )
