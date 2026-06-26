import os
import re
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import anthropic

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from anthropic import Anthropic, APIError, APIConnectionError, APITimeoutError

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

app = FastAPI(title="AaaG AI Service", version="1.0.0")

class GenerateRequest(BaseModel):
    """Request schema for /generate endpoint."""
    template_id: str
    user_input: str


class ErrorResponse(BaseModel):
    """Structured error response schema."""
    error: str


class GenerateResponse(BaseModel):
    """Response schema for /generate endpoint."""
    content: str


def sanitize_error_detail(error_message: str) -> str:
    """
    Sanitize error details before returning to caller.
    Removes API keys, tokens, and stack traces to prevent information leakage.
    """
    sanitized = error_message
    
    # Remove API keys (Bearer tokens, x-api-key patterns)
    sanitized = re.sub(r'Bearer\s+[\w\-\.]+', '[REDACTED_TOKEN]', sanitized)
    sanitized = re.sub(r'api[_-]?key[\s:=]+[\w\-\.]+', '[REDACTED_API_KEY]', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'sk-[\w\-\.]+', '[REDACTED_KEY]', sanitized)
    
    # Remove stack traces (lines starting with whitespace followed by 'at' or 'File')
    lines = sanitized.split('\n')
    sanitized_lines = [line for line in lines if not re.match(r'^\s+(at|File|Traceback)', line)]
    sanitized = '\n'.join(sanitized_lines)
    
    # Truncate to reasonable length to avoid leaking large payloads
    if len(sanitized) > 500:
        sanitized = sanitized[:500] + '...'
    
    return sanitized.strip()


def parse_claude_response(response: dict) -> str:
    """
    Parse Claude API response and extract generated content.
    Raises ValueError if response is malformed or empty.
    Raises AttributeError if required fields are missing.
    """
    try:
        # Check for 'content' field
        if 'content' not in response:
            raise ValueError("Missing 'content' field in Claude API response")
        
        content = response['content']
        
        # Check if content is a list
        if not isinstance(content, list):
            raise TypeError(f"Expected 'content' to be a list, got {type(content).__name__}")
        
        # Check if content array is empty
        if len(content) == 0:
            raise ValueError("Empty 'content' array in Claude API response")
        
        # Extract text from first content item
        first_item = content[0]
        if not isinstance(first_item, dict):
            raise TypeError(f"Expected content item to be a dict, got {type(first_item).__name__}")
        
        # Check for 'text' field
        if 'text' not in first_item:
            raise AttributeError("Missing 'text' field in content item")
        
        text = first_item['text']
        
        if not isinstance(text, str):
            raise TypeError(f"Expected 'text' to be a string, got {type(text).__name__}")
        
        if len(text.strip()) == 0:
            raise ValueError("Generated text is empty")
        
        return text
    
    except (KeyError, AttributeError, TypeError, ValueError) as e:
        # Re-raise with clear error message
        raise ValueError(f"Failed to parse Claude API response: {str(e)}") from e


@app.post("/generate", response_model=GenerateResponse)
def generate(request: GenerateRequest):
    """
    Generate personalized content using Claude API.
    Returns HTTP 422 on parse failures, HTTP 500 on internal errors.
    """
    try:
        # Call Claude API
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            messages=[
                {
                    "role": "user",
                    "content": f"Template: {request.template_id}\nUser input: {request.user_input}"
                }
            ]
        )
        
        # Parse response
        try:
            content = parse_claude_response(message.model_dump())
            return GenerateResponse(content=content)
        except ValueError as e:
            # Parse failure: return 422 Unprocessable Entity
            error_detail = sanitize_error_detail(str(e))
            # Log full error server-side for debugging
            import logging
            logging.error(f"Parse error: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=422,
                detail=ErrorResponse(error=error_detail).model_dump()
            )
    
    except HTTPException:
        # Re-raise HTTP exceptions (already formatted)
        raise
    except Exception as e:
        # Unexpected error: return 500 Internal Server Error
        error_detail = sanitize_error_detail(str(e))
        # Log full error server-side for debugging
        import logging
        logging.error(f"Internal error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(error=error_detail).model_dump()
        )


@app.get("/health")
def health():
    """
    Health check endpoint.
    """
    return {"status": "ok"}
