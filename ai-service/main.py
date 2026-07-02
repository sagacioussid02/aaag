import os
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from anthropic import Anthropic, APIError, APITimeoutError, RateLimitError, AuthenticationError
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AaaG AI Service", version="1.0.0")

# Initialize Anthropic client
api_key = os.getenv("ANTHROPIC_API_KEY")
if not api_key:
    logger.warning("ANTHROPIC_API_KEY not set; AI service will fail at runtime")

client = Anthropic(api_key=api_key)


class GenerateRequest(BaseModel):
    """Request schema for content generation."""
    user_input: str = Field(..., min_length=1, description="User's input for personalization")
    template_id: str = Field(..., min_length=1, description="Template ID to personalize")
    user_id: str = Field(..., min_length=1, description="User ID for tracking")


class GenerateResponse(BaseModel):
    """Response schema for content generation."""
    content: str
    template_id: str
    user_id: str


class ErrorResponse(BaseModel):
    """Structured error response."""
    error: str
    status_code: int


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """
    Generate personalized content using Claude.
    
    Args:
        request: GenerateRequest with user_input, template_id, user_id
    
    Returns:
        GenerateResponse with generated content
    
    Raises:
        HTTPException: On validation, timeout, API error, or auth failure
    """
    try:
        # Validate input
        if not request.user_input or not request.user_input.strip():
            raise HTTPException(
                status_code=400,
                detail="user_input cannot be empty"
            )
        
        if not request.template_id or not request.template_id.strip():
            raise HTTPException(
                status_code=400,
                detail="template_id cannot be empty"
            )
        
        # Call Anthropic API
        logger.info(f"Generating content for user {request.user_id} with template {request.template_id}")
        
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": f"Personalize this template for: {request.user_input}\n\nTemplate ID: {request.template_id}"
                }
            ]
        )
        
        # Extract content from response
        if not message.content or len(message.content) == 0:
            raise HTTPException(
                status_code=502,
                detail="Empty response from AI service"
            )
        
        generated_content = message.content[0].text
        
        logger.info(f"Successfully generated content for user {request.user_id}")
        
        return GenerateResponse(
            content=generated_content,
            template_id=request.template_id,
            user_id=request.user_id
        )
    
    except HTTPException:
        # Re-raise FastAPI validation errors
        raise
    
    except APITimeoutError as e:
        logger.error(f"Timeout calling Anthropic API: {str(e)}")
        raise HTTPException(
            status_code=504,
            detail=f"AI service timeout: {str(e)}"
        )
    
    except RateLimitError as e:
        logger.error(f"Rate limit exceeded: {str(e)}")
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {str(e)}"
        )
    
    except AuthenticationError as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}"
        )
    
    except APIError as e:
        logger.error(f"Anthropic API error: {str(e)}")
        raise HTTPException(
            status_code=502,
            detail=f"AI service error: {str(e)}"
        )
    
    except Exception as e:
        # Catch any unexpected errors and return structured response
        logger.error(f"Unexpected error in generate: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Custom exception handler to ensure all HTTP errors return structured JSON.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Catch-all exception handler to prevent raw tracebacks from being exposed.
    """
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )


@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    """
    return {"status": "ok", "service": "ai-service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
