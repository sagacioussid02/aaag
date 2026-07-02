import os
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
import anthropic

app = FastAPI()
logger = logging.getLogger(__name__)

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


class WizardInput(BaseModel):
    """Validated wizard input for content generation."""
    template_id: str = Field(..., min_length=1, description="Template identifier")
    user_name: str = Field(..., min_length=1, description="User's name")
    user_email: str = Field(..., min_length=1, description="User's email")
    customization: dict = Field(default_factory=dict, description="Template customization options")
    
    @validator('template_id')
    def validate_template_id(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError("template_id must be a non-empty string")
        return v
    
    @validator('user_name')
    def validate_user_name(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError("user_name must be a non-empty string")
        return v
    
    @validator('user_email')
    def validate_user_email(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError("user_email must be a non-empty string")
        if "@" not in v:
            raise ValueError("user_email must be a valid email address")
        return v


class GenerateResponse(BaseModel):
    """Structured response for content generation."""
    content: str = Field(..., description="Generated content")
    template_id: str = Field(..., description="Template identifier")
    status: str = Field(default="success", description="Generation status")


class ErrorResponse(BaseModel):
    """Structured error response."""
    error: str = Field(..., description="Error message")
    status: int = Field(..., description="HTTP status code")
    detail: Optional[str] = Field(None, description="Additional error details")


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: WizardInput):
    """
    Generate personalized content using Claude.
    
    Args:
        request: Validated wizard input
    
    Returns:
        GenerateResponse with generated content
    
    Raises:
        HTTPException: For validation errors (422) or generation errors (500)
    """
    try:
        # Construct prompt from wizard input
        prompt = f"""
        Create personalized content for a micro-app based on the following:
        - User: {request.user_name} ({request.user_email})
        - Template: {request.template_id}
        - Customization: {request.customization}
        
        Generate engaging, personalized content that fits the template.
        """
        
        # Call Anthropic API
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Extract content from response
        if not message.content or len(message.content) == 0:
            raise ValueError("Empty response from Claude API")
        
        generated_content = message.content[0].text
        
        return GenerateResponse(
            content=generated_content,
            template_id=request.template_id,
            status="success"
        )
    
    except ValueError as e:
        # Validation error from our code
        logger.error(f"Validation error in generate: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except anthropic.APIError as e:
        # Anthropic API error
        logger.error(f"Anthropic API error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI service temporarily unavailable"
        )
    except Exception as e:
        # Unexpected error
        logger.error(f"Unexpected error in generate: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """Handle ValueError with structured response."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "Invalid input",
            "status": status.HTTP_400_BAD_REQUEST,
            "detail": str(exc)
        }
    )


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
