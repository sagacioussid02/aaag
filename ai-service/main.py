import os
import re
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field, validator
from anthropic import Anthropic, APIError, APIConnectionError, APITimeoutError

app = FastAPI()

# Initialize Anthropic client
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


class WizardInput(BaseModel):
    """Validated input from the wizard."""
    template_id: str = Field(..., min_length=1, description="Template identifier")
    user_input: str = Field(..., min_length=1, description="User-provided content")
    user_name: Optional[str] = Field(None, description="User's name")
    user_email: Optional[EmailStr] = Field(None, description="User's email")
    customization: Optional[dict] = Field(default_factory=dict, description="Template customization options")

    @validator('template_id')
    def validate_template_id(cls, v):
        if not v or not v.strip():
            raise ValueError('template_id cannot be empty')
        return v

    @validator('user_input')
    def validate_user_input(cls, v):
        if not v or not v.strip():
            raise ValueError('user_input cannot be empty')
        return v

    @validator('customization')
    def validate_customization(cls, v):
        if v is None:
            return {}
        if not isinstance(v, dict):
            raise ValueError('customization must be a dictionary')
        return v


class ErrorResponse(BaseModel):
    """Structured error response."""
    detail: str
    error_code: Optional[str] = None


def sanitize_error_detail(error_message: str) -> str:
    """
    Sanitize error messages to prevent leakage of sensitive information.
    Redacts API keys, Bearer tokens, and stack traces.
    """
    # Redact API keys (sk-* pattern)
    sanitized = re.sub(r'sk-[A-Za-z0-9]{20,}', '[REDACTED_API_KEY]', error_message)
    
    # Redact Bearer tokens
    sanitized = re.sub(r'Bearer\s+[A-Za-z0-9._-]+', '[REDACTED_TOKEN]', sanitized)
    
    # Redact common stack trace markers and file paths
    sanitized = re.sub(r'File "[^"]+", line \d+', '[REDACTED_STACK_TRACE]', sanitized)
    sanitized = re.sub(r'Traceback \(most recent call last\):', '[REDACTED_TRACEBACK]', sanitized)
    
    return sanitized


@app.post("/generate")
async def generate(request: WizardInput):
    """
    Generate personalized content using Claude.
    
    Args:
        request: Validated wizard input
    
    Returns:
        Generated content from Claude
    
    Raises:
        HTTPException: For validation errors (422), API errors (502), timeouts (504)
    """
    try:
        # Build the prompt from user input and template context
        prompt = f"Template: {request.template_id}\nUser input: {request.user_input}"
        if request.user_name:
            prompt += f"\nUser name: {request.user_name}"
        if request.customization:
            prompt += f"\nCustomization: {request.customization}"
        
        # Call Anthropic API
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Extract and return the generated content
        return {
            "generated_content": message.content[0].text,
            "template_id": request.template_id,
            "user_name": request.user_name
        }
    
    except APITimeoutError as e:
        # Timeout from Anthropic API
        sanitized_detail = sanitize_error_detail(str(e))
        raise HTTPException(
            status_code=504,
            detail=sanitized_detail,
            headers={"X-Error-Code": "ANTHROPIC_TIMEOUT"}
        )
    
    except APIConnectionError as e:
        # Connection error from Anthropic API
        sanitized_detail = sanitize_error_detail(str(e))
        raise HTTPException(
            status_code=502,
            detail=sanitized_detail,
            headers={"X-Error-Code": "ANTHROPIC_CONNECTION_ERROR"}
        )
    
    except APIError as e:
        # Other Anthropic API errors
        sanitized_detail = sanitize_error_detail(str(e))
        raise HTTPException(
            status_code=502,
            detail=sanitized_detail,
            headers={"X-Error-Code": "ANTHROPIC_API_ERROR"}
        )
    
    except ValueError as e:
        # Validation errors (e.g., invalid customization dict)
        raise HTTPException(
            status_code=422,
            detail=str(e),
            headers={"X-Error-Code": "VALIDATION_ERROR"}
        )
    
    except Exception as e:
        # Catch-all for unexpected errors
        sanitized_detail = sanitize_error_detail(str(e))
        raise HTTPException(
            status_code=500,
            detail=sanitized_detail,
            headers={"X-Error-Code": "INTERNAL_ERROR"}
        )


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}
