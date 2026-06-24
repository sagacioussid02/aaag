from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import anthropic
import os
import logging
from typing import Optional

app = FastAPI()
logger = logging.getLogger(__name__)

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


class GenerateRequest(BaseModel):
    """Request schema for content generation."""
    template_id: str
    user_input: dict
    context: Optional[dict] = None


class GenerateResponse(BaseModel):
    """Response schema for content generation."""
    content: str
    metadata: Optional[dict] = None


class ErrorResponse(BaseModel):
    """Structured error response."""
    error: str
    details: Optional[str] = None


def parse_claude_response(response) -> dict:
    """
    Parse Claude API response and extract content.
    
    Raises:
        ValueError: If response is malformed or missing expected fields
        AttributeError: If response object lacks expected attributes
        KeyError: If response dict lacks expected keys
    """
    try:
        # Handle Anthropic SDK response object
        if hasattr(response, 'content'):
            if not response.content or len(response.content) == 0:
                raise ValueError("Claude response has empty content array")
            
            first_block = response.content[0]
            if not hasattr(first_block, 'text'):
                raise AttributeError(f"Response content block missing 'text' attribute: {type(first_block)}")
            
            text = first_block.text
            if not isinstance(text, str):
                raise ValueError(f"Claude response text is not a string: {type(text)}")
            
            if not text.strip():
                raise ValueError("Claude response text is empty or whitespace-only")
            
            return {
                "content": text,
                "metadata": {
                    "model": getattr(response, 'model', 'unknown'),
                    "usage": {
                        "input_tokens": getattr(response.usage, 'input_tokens', 0) if hasattr(response, 'usage') else 0,
                        "output_tokens": getattr(response.usage, 'output_tokens', 0) if hasattr(response, 'usage') else 0,
                    }
                }
            }
        else:
            raise AttributeError("Claude response object missing 'content' attribute")
    
    except (AttributeError, KeyError, ValueError, TypeError) as e:
        logger.error(f"Failed to parse Claude response: {str(e)}", exc_info=True)
        raise ValueError(f"Malformed Claude API response: {str(e)}") from e


@app.post("/generate")
async def generate(request: GenerateRequest):
    """
    Generate personalized content using Claude API.
    
    Returns:
        GenerateResponse: Generated content and metadata on success
        ErrorResponse: Structured error on failure
    """
    try:
        # Validate request
        if not request.template_id:
            raise ValueError("template_id is required")
        if not request.user_input:
            raise ValueError("user_input is required")
        
        # Build prompt from user input
        prompt = f"""Generate personalized content for template '{request.template_id}' based on user input:
{request.user_input}

Context: {request.context or {}}

Provide the generated content directly without any preamble."""
        
        # Call Claude API
        try:
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
        except anthropic.APIError as e:
            logger.error(f"Anthropic API error: {str(e)}", exc_info=True)
            return ErrorResponse(
                error="Claude API request failed",
                details=str(e)
            ).model_dump()
        
        # Parse response with explicit error handling
        try:
            parsed = parse_claude_response(response)
            return GenerateResponse(
                content=parsed["content"],
                metadata=parsed.get("metadata")
            ).model_dump()
        
        except ValueError as e:
            # Malformed response from Claude
            logger.error(f"Response parsing failed: {str(e)}", exc_info=True)
            return ErrorResponse(
                error="Failed to parse Claude response",
                details=str(e)
            ).model_dump()
    
    except ValueError as e:
        # Request validation error
        logger.error(f"Request validation error: {str(e)}")
        return ErrorResponse(
            error="Invalid request",
            details=str(e)
        ).model_dump()
    
    except Exception as e:
        # Catch-all for unexpected errors
        logger.error(f"Unexpected error in /generate: {str(e)}", exc_info=True)
        return ErrorResponse(
            error="Internal server error",
            details=str(e)
        ).model_dump()


@app.get("/health")
async def health():
    """
    Health check endpoint.
    
    Returns:
        dict: Service health status
    """
    return {
        "status": "healthy",
        "service": "ai-service"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
