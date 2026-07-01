import os
import json
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from anthropic import Anthropic, APITimeoutError, APIError, APIConnectionError

# Initialize Anthropic client
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


class GenerateRequest(BaseModel):
    """Request model for content generation."""
    template_id: str = Field(..., min_length=1, description="Template identifier")
    user_input: str = Field(..., min_length=1, description="User input for personalization")
    template_context: str = Field(..., min_length=1, description="Template context for generation")


class GenerateResponse(BaseModel):
    """Response model for content generation."""
    content: str
    status: str = "success"


class ErrorResponse(BaseModel):
    """Structured error response."""
    error: str
    status: str = "error"
    details: Optional[str] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("AI Service starting up...")
    yield
    # Shutdown
    print("AI Service shutting down...")


app = FastAPI(title="AI Service", lifespan=lifespan)


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """
    Generate personalized content using Claude.
    
    Returns structured JSON error responses for all failure cases.
    Error messages are hardcoded and safe — no raw exception strings are exposed.
    """
    try:
        # Call Anthropic API
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": f"Template: {request.template_context}\n\nUser input: {request.user_input}",
                }
            ],
        )
        
        # Extract content from response
        content = message.content[0].text if message.content else ""
        return GenerateResponse(content=content)
    
    except APITimeoutError:
        # Timeout: return 504 Gateway Timeout
        raise HTTPException(
            status_code=504,
            detail=json.dumps({
                "error": "Request timeout",
                "status": "error",
                "details": "The AI service took too long to respond. Please try again."
            })
        )
    
    except APIConnectionError:
        # Connection error: return 503 Service Unavailable
        raise HTTPException(
            status_code=503,
            detail=json.dumps({
                "error": "Service unavailable",
                "status": "error",
                "details": "Unable to connect to the AI service. Please try again later."
            })
        )
    
    except APIError:
        # Generic API error: return 502 Bad Gateway
        raise HTTPException(
            status_code=502,
            detail=json.dumps({
                "error": "AI service error",
                "status": "error",
                "details": "The AI service encountered an error. Please try again."
            })
        )
    
    except ValueError as e:
        # Validation error: return 400 Bad Request
        raise HTTPException(
            status_code=400,
            detail=json.dumps({
                "error": "Invalid input",
                "status": "error",
                "details": "The provided input is invalid. Please check your request."
            })
        )
    
    except Exception as e:
        # Unexpected error: return 500 Internal Server Error
        # Error message is hardcoded and safe — no raw exception data is exposed
        raise HTTPException(
            status_code=500,
            detail=json.dumps({
                "error": "Internal server error",
                "status": "error",
                "details": "An unexpected error occurred. Please try again later."
            })
        )


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
