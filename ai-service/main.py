import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import anthropic
import re

app = FastAPI()

# Initialize Anthropic client at module level for efficiency
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


class ContentRequest(BaseModel):
    prompt: str


class ContentResponse(BaseModel):
    content: str


def sanitize_error_detail(error_message: str) -> str:
    """
    Sanitize error messages to prevent leakage of sensitive context.
    Removes API keys, stack traces, internal paths, and request metadata.
    """
    # Remove common API key patterns
    sanitized = re.sub(r"sk-[A-Za-z0-9]{20,}", "[REDACTED_API_KEY]", error_message)
    sanitized = re.sub(r"api[_-]?key[=:][^\s,}]+", "[REDACTED_API_KEY]", sanitized, flags=re.IGNORECASE)
    
    # Remove stack traces (lines starting with whitespace followed by 'at ' or 'File ')
    sanitized = re.sub(r"\n\s+(at |File |Traceback)", "\n[STACK_TRACE_REDACTED]", sanitized)
    
    # Remove internal file paths
    sanitized = re.sub(r"/[a-z0-9/_.-]+\.(py|go|js|ts)", "[INTERNAL_PATH_REDACTED]", sanitized, flags=re.IGNORECASE)
    
    # Remove request/response headers that might contain auth tokens
    sanitized = re.sub(r"(authorization|x-api-key|cookie|set-cookie)[=:][^\n,}]+", "[REDACTED_HEADER]", sanitized, flags=re.IGNORECASE)
    
    return sanitized


@app.post("/generate", response_model=ContentResponse)
def generate_content(request: ContentRequest):
    """
    Generate content using the Anthropic API.
    
    Handles all Anthropic SDK exceptions with proper HTTP status code mapping:
    - APIStatusError (upstream API error with status code) → 502 Bad Gateway
    - BadRequestError (malformed request) → 400 Bad Request
    - AuthenticationError (upstream auth failure) → 401 Unauthorized
    - RateLimitError (rate limited) → 429 Too Many Requests
    - Generic APIError (other SDK errors) → 500 Internal Server Error
    - Unexpected exceptions → 500 Internal Server Error
    """
    # Validate and normalize prompt
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(
            status_code=400,
            detail="Prompt cannot be empty"
        )
    
    prompt = request.prompt.strip()
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
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Handle edge case: empty or malformed content blocks
        if not message.content or len(message.content) == 0:
            raise HTTPException(
                status_code=500,
                detail="API returned empty content"
            )
        
        # Extract text from first content block
        first_block = message.content[0]
        if not hasattr(first_block, 'text'):
            raise HTTPException(
                status_code=500,
                detail="API returned non-text content block"
            )
        
        return ContentResponse(content=first_block.text)
    
    except anthropic.APIStatusError as e:
        # Upstream API returned an error with a status code
        # Map to 502 Bad Gateway to indicate upstream service failure
        detail = sanitize_error_detail(str(e))
        raise HTTPException(
            status_code=502,
            detail=detail
        )
    
    except anthropic.BadRequestError as e:
        # Malformed request to upstream API
        detail = sanitize_error_detail(str(e))
        raise HTTPException(
            status_code=400,
            detail=detail
        )
    
    except anthropic.AuthenticationError as e:
        # Upstream authentication failed
        # Explicitly state this is an upstream failure to avoid confusion
        detail = sanitize_error_detail(str(e))
        detail = f"Upstream authentication failed: {detail}"
        raise HTTPException(
            status_code=401,
            detail=detail
        )
    
    except anthropic.RateLimitError as e:
        # Rate limited by upstream API
        detail = sanitize_error_detail(str(e))
        raise HTTPException(
            status_code=429,
            detail=detail
        )
    
    except anthropic.APIError as e:
        # Generic API error from SDK
        detail = sanitize_error_detail(str(e))
        raise HTTPException(
            status_code=500,
            detail=detail
        )
    
    except Exception as e:
        # Unexpected exception
        detail = sanitize_error_detail(str(e))
        raise HTTPException(
            status_code=500,
            detail=detail
        )
