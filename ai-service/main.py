import logging
import re
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from anthropic import Anthropic

app = FastAPI()
logger = logging.getLogger(__name__)

# Initialize Anthropic client
client = Anthropic()


class GenerateRequest(BaseModel):
    template_id: str
    user_input: dict
    context: Optional[dict] = None


class GenerateResponse(BaseModel):
    content: str
    template_id: str


class ErrorResponse(BaseModel):
    error: str
    details: Optional[str] = None


def sanitize_error_detail(detail: str) -> str:
    """
    Sanitize error details before returning to external callers.
    Redacts API keys, auth tokens, stack traces, and internal file paths.
    """
    if not detail:
        return ""
    
    # Redact API keys (sk-... pattern for Anthropic)
    sanitized = re.sub(r'sk-[A-Za-z0-9]{48}', 'sk-***REDACTED***', detail)
    
    # Redact auth headers and bearer tokens
    sanitized = re.sub(r'Authorization[:"]\s*["\']?Bearer\s+[A-Za-z0-9_.-]+', 'Authorization: Bearer ***REDACTED***', sanitized, flags=re.IGNORECASE)
    
    # Redact common auth patterns
    sanitized = re.sub(r'(api[_-]?key|password|token|secret)["\']?\s*[:=]\s*["\']?[^\s"\',}]+', r'\1=***REDACTED***', sanitized, flags=re.IGNORECASE)
    
    # Strip file paths (remove /path/to/file.py:line patterns)
    sanitized = re.sub(r'\s+File\s+"[^"]+",\s+line\s+\d+', '', sanitized)
    sanitized = re.sub(r'/[a-zA-Z0-9_./\\-]+\.py', '/***REDACTED***.py', sanitized)
    
    # Remove traceback markers
    sanitized = re.sub(r'Traceback\s*\(most recent call last\):', '[error details redacted]', sanitized)
    
    return sanitized.strip()


def parse_claude_response(response) -> str:
    """
    Extract text content from Claude API response.
    Raises ValueError, AttributeError, or KeyError if response is malformed.
    """
    # Check for content array
    if not hasattr(response, 'content') or response.content is None:
        raise AttributeError("Claude response missing 'content' attribute")
    
    if not isinstance(response.content, list) or len(response.content) == 0:
        raise ValueError("Claude response 'content' is empty or not a list")
    
    # Extract first content block
    content_block = response.content[0]
    
    # Check for text attribute
    if not hasattr(content_block, 'text'):
        raise AttributeError("Claude response content block missing 'text' attribute")
    
    text = content_block.text
    
    # Validate text is a string
    if not isinstance(text, str):
        raise ValueError(f"Claude response text is not a string: {type(text).__name__}")
    
    return text


@app.post("/generate", response_model=GenerateResponse)
def generate_content(request: GenerateRequest):
    """
    Generate personalized content using Claude API.
    Returns 422 on parse failure (upstream/client fault), 500 on unexpected error.
    """
    try:
        # Build prompt from template and user input
        prompt = f"Template: {request.template_id}\nUser Input: {request.user_input}"
        if request.context:
            prompt += f"\nContext: {request.context}"
        
        # Call Claude API
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Parse response with explicit error handling
        try:
            content = parse_claude_response(response)
        except (AttributeError, KeyError, ValueError) as e:
            # Parse failure is a 422 (Unprocessable Entity) - upstream/client fault
            logger.error(f"Claude response parse failed: {str(e)}", exc_info=True)
            sanitized_detail = sanitize_error_detail(str(e))
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "Failed to parse Claude API response",
                    "details": sanitized_detail
                }
            )
        
        return GenerateResponse(
            content=content,
            template_id=request.template_id
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions (already have proper status codes)
        raise
    except Exception as e:
        # Unexpected exception is a 500 (Internal Server Error)
        logger.error(f"Unexpected error in generate_content: {str(e)}", exc_info=True)
        sanitized_detail = sanitize_error_detail(str(e))
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error during content generation",
                "details": sanitized_detail
            }
        )


@app.get("/health")
def health_check():
    """
    Health check endpoint for deployment orchestration.
    """
    return {"status": "healthy"}
