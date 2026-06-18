from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import anthropic
import os
import logging

app = FastAPI()
logger = logging.getLogger(__name__)

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


class ContentGenerationRequest(BaseModel):
    """Request schema for AI content generation."""
    prompt: str
    max_tokens: int = 1024


class ContentGenerationResponse(BaseModel):
    """Response schema for AI content generation."""
    content: str
    stop_reason: str
    usage: dict


class ErrorResponse(BaseModel):
    """Error response schema."""
    error: str
    error_type: str
    status_code: int


@app.post("/generate", response_model=ContentGenerationResponse)
async def generate_content(request: ContentGenerationRequest) -> ContentGenerationResponse:
    """
    Generate content using Claude AI.
    
    Validates the request against the Anthropic SDK contract and properly
    handles both success and error responses.
    
    Args:
        request: ContentGenerationRequest with prompt and optional max_tokens
        
    Returns:
        ContentGenerationResponse with generated content and metadata
        
    Raises:
        HTTPException: If the request is invalid or the API call fails
    """
    # Validate request
    if not request.prompt or len(request.prompt.strip()) == 0:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    
    if request.max_tokens < 1 or request.max_tokens > 4096:
        raise HTTPException(status_code=400, detail="max_tokens must be between 1 and 4096")
    
    try:
        # Call Anthropic API with proper SDK contract
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=request.max_tokens,
            messages=[
                {"role": "user", "content": request.prompt}
            ]
        )
        
        # Extract content from successful response
        if not message.content or len(message.content) == 0:
            logger.error("Empty content in API response")
            raise HTTPException(status_code=500, detail="Empty response from API")
        
        # Handle text content block
        content_block = message.content[0]
        if not hasattr(content_block, 'text'):
            logger.error(f"Unexpected content block type: {type(content_block)}")
            raise HTTPException(status_code=500, detail="Unexpected response format from API")
        
        return ContentGenerationResponse(
            content=content_block.text,
            stop_reason=message.stop_reason,
            usage={
                "input_tokens": message.usage.input_tokens,
                "output_tokens": message.usage.output_tokens
            }
        )
    
    except anthropic.APIConnectionError as e:
        logger.error(f"API connection error: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail=f"Failed to connect to API: {str(e)}"
        )
    
    except anthropic.RateLimitError as e:
        logger.error(f"Rate limit exceeded: {str(e)}")
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {str(e)}"
        )
    
    except anthropic.AuthenticationError as e:
        logger.error(f"Authentication failed: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail="Authentication failed with Anthropic API"
        )
    
    except anthropic.APIStatusError as e:
        logger.error(f"API error (status {e.status_code}): {str(e)}")
        raise HTTPException(
            status_code=e.status_code or 500,
            detail=f"API error: {str(e)}"
        )
    
    except Exception as e:
        logger.error(f"Unexpected error during content generation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.get("/health")
async def health_check():
    """Health check endpoint for CI integration."""
    return {"status": "healthy"}
