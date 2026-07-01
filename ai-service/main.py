from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError
import logging
import os
from anthropic import Anthropic, APIError, APITimeoutError, APIConnectionError

app = FastAPI()
logger = logging.getLogger(__name__)

# Initialize Anthropic client
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


class GenerateRequest(BaseModel):
    """Request schema for content generation."""
    user_input: str
    template_context: str
    template_id: str


class ErrorResponse(BaseModel):
    """Structured error response."""
    error: str
    message: str
    status_code: int


class SuccessResponse(BaseModel):
    """Structured success response."""
    content: str
    template_id: str


@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    """Handle Pydantic validation errors."""
    logger.warning(f"Validation error: {exc}")
    return JSONResponse(
        status_code=400,
        content={
            "error": "validation_error",
            "message": "Invalid request: missing or malformed fields",
            "status_code": 400,
        },
    )


@app.post("/generate")
async def generate(request: GenerateRequest):
    """
    Generate personalized content using Claude.
    
    Args:
        request: GenerateRequest with user_input, template_context, template_id
    
    Returns:
        SuccessResponse with generated content
    
    Raises:
        HTTPException with structured error response for:
        - 400: validation_error (missing/malformed input)
        - 408: timeout_error (Claude API timeout)
        - 502: api_error (Claude API error)
        - 503: service_unavailable (connection error)
    """
    try:
        # Validate input
        if not request.user_input or not request.user_input.strip():
            logger.warning("Empty user_input provided")
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "validation_error",
                    "message": "user_input cannot be empty",
                    "status_code": 400,
                },
            )
        
        if not request.template_context or not request.template_context.strip():
            logger.warning("Empty template_context provided")
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "validation_error",
                    "message": "template_context cannot be empty",
                    "status_code": 400,
                },
            )
        
        if not request.template_id or not request.template_id.strip():
            logger.warning("Empty template_id provided")
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "validation_error",
                    "message": "template_id cannot be empty",
                    "status_code": 400,
                },
            )
        
        # Call Claude API
        prompt = f"""
Template Context:
{request.template_context}

User Input:
{request.user_input}

Generate personalized content for this template based on the user input.
"""
        
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ],
        )
        
        # Extract content from response
        if not message.content or len(message.content) == 0:
            logger.error("Empty response from Claude API")
            raise HTTPException(
                status_code=502,
                detail={
                    "error": "api_error",
                    "message": "Claude API returned empty response",
                    "status_code": 502,
                },
            )
        
        content = message.content[0].text
        
        return SuccessResponse(
            content=content,
            template_id=request.template_id,
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors)
        raise
    
    except APITimeoutError as e:
        logger.error(f"Claude API timeout: {str(e)}")
        raise HTTPException(
            status_code=408,
            detail={
                "error": "timeout_error",
                "message": "Claude API request timed out. Please try again.",
                "status_code": 408,
            },
        )
    
    except APIConnectionError as e:
        logger.error(f"Claude API connection error: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail={
                "error": "service_unavailable",
                "message": "Claude API is temporarily unavailable. Please try again later.",
                "status_code": 503,
            },
        )
    
    except APIError as e:
        logger.error(f"Claude API error: {str(e)}")
        raise HTTPException(
            status_code=502,
            detail={
                "error": "api_error",
                "message": "Claude API returned an error. Please try again.",
                "status_code": 502,
            },
        )
    
    except Exception as e:
        # Catch any other unexpected errors
        logger.error(f"Unexpected error in /generate: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "internal_error",
                "message": "An unexpected error occurred. Please try again later.",
                "status_code": 500,
            },
        )


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}
