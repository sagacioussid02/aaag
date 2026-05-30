import json
import logging
import os
from contextlib import asynccontextmanager

from anthropic import Anthropic
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from pythonjsonlogger import jsonlogger
from slowapi import Limiter
from slowapi.util import get_remote_address
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

# Configure structured JSON logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
handler.setFormatter(formatter)
logger.addHandler(handler)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Initialize Anthropic client
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


class GenerateRequest(BaseModel):
    """Request body for content generation."""
    prompt: str = Field(..., min_length=1, max_length=2000)
    max_tokens: int = Field(default=1024, ge=1, le=4096)


class GenerateResponse(BaseModel):
    """Response body for content generation."""
    content: str
    tokens_used: int


@retry(
    retry=retry_if_exception_type((Exception,)),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
)
async def call_anthropic_with_retry(prompt: str, max_tokens: int) -> dict:
    """
    Call Anthropic API with automatic retry logic.
    
    Retries up to 3 times with exponential backoff (2s, 4s, 8s) on any exception.
    """
    logger.info(
        "calling_anthropic_api",
        extra={
            "prompt_length": len(prompt),
            "max_tokens": max_tokens,
        },
    )
    
    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=max_tokens,
            messages=[
                {"role": "user", "content": prompt}
            ],
        )
        
        logger.info(
            "anthropic_api_success",
            extra={
                "input_tokens": message.usage.input_tokens,
                "output_tokens": message.usage.output_tokens,
            },
        )
        
        return {
            "content": message.content[0].text,
            "tokens_used": message.usage.output_tokens,
        }
    except Exception as e:
        logger.error(
            "anthropic_api_error",
            extra={
                "error_type": type(e).__name__,
                "error_message": str(e),
            },
        )
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown."""
    logger.info("ai_service_startup")
    yield
    logger.info("ai_service_shutdown")


app = FastAPI(
    title="AaaG AI Service",
    description="Claude-powered content generation for personalized micro-apps",
    version="0.1.0",
    lifespan=lifespan,
)

# Attach rate limiter to app
app.state.limiter = limiter


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware to log all HTTP requests and responses."""
    logger.info(
        "http_request",
        extra={
            "method": request.method,
            "path": request.url.path,
            "client": get_remote_address(request),
        },
    )
    
    response = await call_next(request)
    
    logger.info(
        "http_response",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
        },
    )
    
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler with structured logging."""
    logger.error(
        "unhandled_exception",
        extra={
            "error_type": type(exc).__name__,
            "error_message": str(exc),
            "path": request.url.path,
        },
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/generate", response_model=GenerateResponse)
@limiter.limit("100/minute")
async def generate(request: Request, body: GenerateRequest) -> GenerateResponse:
    """
    Generate content using Claude.
    
    Rate limited to 100 requests per minute.
    Automatically retries on transient failures.
    """
    try:
        result = await call_anthropic_with_retry(
            prompt=body.prompt,
            max_tokens=body.max_tokens,
        )
        return GenerateResponse(
            content=result["content"],
            tokens_used=result["tokens_used"],
        )
    except Exception as e:
        logger.error(
            "generate_endpoint_error",
            extra={
                "error_type": type(e).__name__,
                "error_message": str(e),
            },
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to generate content after retries",
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
