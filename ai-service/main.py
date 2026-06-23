import os
import logging
from typing import Optional
from datetime import datetime
import uuid

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from anthropic import Anthropic, APIError, APIConnectionError, APITimeoutError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AaaG AI Service", version="1.0.0")

# Initialize Anthropic client
api_key = os.getenv("ANTHROPIC_API_KEY")
if not api_key:
    logger.warning("ANTHROPIC_API_KEY not set; AI generation will fail at runtime")

client = Anthropic(api_key=api_key) if api_key else None

# ============================================================================
# Request/Response Models
# ============================================================================


class GenerationRequest(BaseModel):
    """Request model for content generation."""
    user_input: str = Field(..., min_length=1, description="User input for personalization")
    template_context: str = Field(..., description="Template context for generation")
    template_id: Optional[str] = Field(None, description="Optional template ID")


class GenerationResponse(BaseModel):
    """Successful generation response."""
    generated_content: str = Field(..., description="Generated personalized content")
    request_id: str = Field(..., description="Unique request ID for tracing")
    timestamp: str = Field(..., description="ISO 8601 timestamp")


class ErrorResponse(BaseModel):
    """Structured error response."""
    error_type: str = Field(..., description="Type of error: validation_error, generation_error, api_error, timeout_error")
    message: str = Field(..., description="Human-readable error message")
    request_id: str = Field(..., description="Unique request ID for tracing")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    details: Optional[dict] = Field(None, description="Additional error details")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(..., description="Service status: healthy or unhealthy")
    anthropic_api: str = Field(..., description="Anthropic API status: ok, unavailable, or unconfigured")
    timestamp: str = Field(..., description="ISO 8601 timestamp")


# ============================================================================
# Utility Functions
# ============================================================================


def generate_request_id() -> str:
    """Generate a unique request ID for tracing."""
    return str(uuid.uuid4())


def get_timestamp() -> str:
    """Get current timestamp in ISO 8601 format."""
    return datetime.utcnow().isoformat() + "Z"


def validate_generation_input(user_input: str, template_context: str) -> Optional[str]:
    """
    Validate generation input.
    Returns error message if invalid, None if valid.
    """
    if not user_input or not user_input.strip():
        return "user_input cannot be empty"
    if len(user_input) > 10000:
        return "user_input exceeds maximum length of 10000 characters"
    if not template_context or not template_context.strip():
        return "template_context cannot be empty"
    return None


def check_anthropic_api_health() -> tuple[str, bool]:
    """
    Check Anthropic API connectivity.
    Returns (status_string, is_healthy).
    """
    if not client or not api_key:
        return "unconfigured", False
    
    try:
        # Attempt a minimal API call to verify connectivity
        # Using a very short timeout to avoid blocking health checks
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=10,
            messages=[
                {"role": "user", "content": "ok"}
            ],
            timeout=5.0
        )
        return "ok", True
    except APIConnectionError:
        logger.warning("Anthropic API connection error")
        return "unavailable", False
    except APITimeoutError:
        logger.warning("Anthropic API timeout")
        return "unavailable", False
    except APIError as e:
        logger.warning(f"Anthropic API error: {e}")
        return "unavailable", False
    except Exception as e:
        logger.error(f"Unexpected error checking Anthropic API: {e}")
        return "unavailable", False


# ============================================================================
# Endpoints
# ============================================================================


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    Returns service status and Anthropic API connectivity.
    """
    anthropic_status, is_healthy = check_anthropic_api_health()
    
    service_status = "healthy" if is_healthy else "unhealthy"
    
    return HealthResponse(
        status=service_status,
        anthropic_api=anthropic_status,
        timestamp=get_timestamp()
    )


@app.post("/generate", response_model=GenerationResponse)
async def generate_content(request: GenerationRequest):
    """
    Generate personalized content using Claude.
    
    Returns structured error on failure.
    """
    request_id = generate_request_id()
    timestamp = get_timestamp()
    
    # Validate input
    validation_error = validate_generation_input(request.user_input, request.template_context)
    if validation_error:
        logger.warning(f"[{request_id}] Validation error: {validation_error}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error_type="validation_error",
                message=validation_error,
                request_id=request_id,
                timestamp=timestamp
            ).model_dump()
        )
    
    # Check if Anthropic client is configured
    if not client or not api_key:
        logger.error(f"[{request_id}] Anthropic API not configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ErrorResponse(
                error_type="api_error",
                message="Anthropic API is not configured; ANTHROPIC_API_KEY is missing",
                request_id=request_id,
                timestamp=timestamp
            ).model_dump()
        )
    
    # Build prompt
    prompt = f"""
You are a personalized micro-app content generator.

Template Context:
{request.template_context}

User Input:
{request.user_input}

Generate personalized content for the micro-app based on the user input and template context.
Ensure the content is coherent, relevant, and ready to be deployed.
"""
    
    try:
        logger.info(f"[{request_id}] Generating content for template {request.template_id}")
        
        # Call Claude API with explicit error handling
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            messages=[
                {"role": "user", "content": prompt}
            ],
            timeout=30.0
        )
        
        # Extract content from response
        if not response.content or len(response.content) == 0:
            logger.error(f"[{request_id}] Empty response from Claude API")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=ErrorResponse(
                    error_type="generation_error",
                    message="Claude API returned empty response",
                    request_id=request_id,
                    timestamp=timestamp
                ).model_dump()
            )
        
        generated_content = response.content[0].text
        
        # Validate generated content
        if not generated_content or not generated_content.strip():
            logger.error(f"[{request_id}] Generated content is empty")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=ErrorResponse(
                    error_type="generation_error",
                    message="Generated content is empty",
                    request_id=request_id,
                    timestamp=timestamp
                ).model_dump()
            )
        
        # Check for truncation (heuristic: if content ends abruptly)
        if len(generated_content) >= 1990:  # Close to max_tokens limit
            logger.warning(f"[{request_id}] Generated content may be truncated (length: {len(generated_content)})")
        
        logger.info(f"[{request_id}] Content generation successful (length: {len(generated_content)})")
        
        return GenerationResponse(
            generated_content=generated_content,
            request_id=request_id,
            timestamp=timestamp
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions (validation, empty response, etc.)
        raise
    
    except APITimeoutError as e:
        logger.error(f"[{request_id}] Claude API timeout: {e}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=ErrorResponse(
                error_type="timeout_error",
                message="Claude API request timed out; generation took too long",
                request_id=request_id,
                timestamp=timestamp,
                details={"timeout_seconds": 30}
            ).model_dump()
        )
    
    except APIConnectionError as e:
        logger.error(f"[{request_id}] Claude API connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ErrorResponse(
                error_type="api_error",
                message="Cannot connect to Anthropic API; service may be temporarily unavailable",
                request_id=request_id,
                timestamp=timestamp
            ).model_dump()
        )
    
    except APIError as e:
        logger.error(f"[{request_id}] Claude API error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=ErrorResponse(
                error_type="api_error",
                message=f"Anthropic API error: {str(e)[:200]}",
                request_id=request_id,
                timestamp=timestamp
            ).model_dump()
        )
    
    except ValueError as e:
        logger.error(f"[{request_id}] Response parsing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error_type="generation_error",
                message="Failed to parse Claude API response; response may be malformed",
                request_id=request_id,
                timestamp=timestamp
            ).model_dump()
        )
    
    except Exception as e:
        logger.error(f"[{request_id}] Unexpected error during generation: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error_type="generation_error",
                message="An unexpected error occurred during content generation",
                request_id=request_id,
                timestamp=timestamp,
                details={"error_type": type(e).__name__}
            ).model_dump()
        )


@app.get("/")
async def root():
    """
    Root endpoint.
    """
    return {
        "service": "AaaG AI Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "GET /health",
            "generate": "POST /generate"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
