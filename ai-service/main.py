from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import anthropic
import os

app = FastAPI()

class ContentRequest(BaseModel):
    prompt: str
    max_tokens: int = 1024

class ContentResponse(BaseModel):
    content: str
    stop_reason: str

@app.post("/generate", response_model=ContentResponse)
async def generate_content(request: ContentRequest):
    """
    Generate content using the Anthropic API.
    
    Propagates Anthropic SDK errors to the caller with appropriate HTTP status codes.
    """
    if not request.prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")
    
    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=request.max_tokens,
            messages=[
                {"role": "user", "content": request.prompt}
            ]
        )
        
        # Extract content from the response
        if message.content and len(message.content) > 0:
            content_block = message.content[0]
            if hasattr(content_block, 'text'):
                return ContentResponse(
                    content=content_block.text,
                    stop_reason=message.stop_reason
                )
        
        raise HTTPException(status_code=500, detail="No content in API response")
    
    except anthropic.APIError as e:
        # Propagate Anthropic API errors with appropriate status code
        status_code = 500
        if isinstance(e, anthropic.BadRequestError):
            status_code = 400
        elif isinstance(e, anthropic.AuthenticationError):
            status_code = 401
        elif isinstance(e, anthropic.RateLimitError):
            status_code = 429
        
        raise HTTPException(
            status_code=status_code,
            detail=f"Anthropic API error: {str(e)}"
        )
    
    except Exception as e:
        # Catch any other unexpected errors and propagate them
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    """
    return {"status": "ok"}
