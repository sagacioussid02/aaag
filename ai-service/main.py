from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import anthropic
import logging
import os
from tenacity import retry, stop_after_attempt, wait_exponential
from datetime import datetime

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

class ContentRequest(BaseModel):
    app_name: str
    description: str
    template_type: str

class ContentResponse(BaseModel):
    content: str
    generated_at: str

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True
)
def _call_anthropic_api(prompt: str) -> str:
    """
    Internal method to call Anthropic API with retry logic and rate-limit handling.
    Implements exponential backoff for transient failures and detects rate limits.
    """
    try:
        logger.info(f"Calling Anthropic API with prompt length: {len(prompt)}")
        
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        logger.info("Anthropic API call succeeded")
        return message.content[0].text
        
    except anthropic.RateLimitError as e:
        logger.warning(f"Rate limit hit: {e}. Will retry with exponential backoff.")
        raise  # tenacity will handle the retry
    except anthropic.APIError as e:
        logger.error(f"Anthropic API error: {e}")
        raise

@app.post("/generate", response_model=ContentResponse)
async def generate_content(request: ContentRequest) -> ContentResponse:
    """
    Generate personalized content for a micro-app using Claude.
    
    Implements retry logic and rate-limit handling for production robustness.
    """
    try:
        logger.info(f"Generating content for app: {request.app_name}, template: {request.template_type}")
        
        prompt = f"""
        Create personalized content for a micro-app with the following details:
        - App Name: {request.app_name}
        - Description: {request.description}
        - Template Type: {request.template_type}
        
        Generate engaging, concise content suitable for the template.
        """
        
        # Call API with retry logic and rate-limit handling
        content = _call_anthropic_api(prompt)
        
        logger.info(f"Content generation succeeded for app: {request.app_name}")
        
        return ContentResponse(
            content=content,
            generated_at=datetime.utcnow().isoformat()
        )
        
    except anthropic.RateLimitError as e:
        logger.error(f"Rate limit exceeded after retries: {e}")
        raise HTTPException(
            status_code=429,
            detail="AI service rate limit exceeded. Please try again later."
        )
    except anthropic.APIError as e:
        logger.error(f"AI service error: {e}")
        raise HTTPException(
            status_code=503,
            detail="AI service temporarily unavailable. Please try again."
        )
    except Exception as e:
        logger.error(f"Unexpected error during content generation: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during content generation."
        )

@app.get("/health")
async def health_check():
    """
    Health check endpoint for orchestration and monitoring.
    """
    logger.info("Health check requested")
    return {"status": "healthy", "service": "ai-service"}

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting AI service")
    uvicorn.run(app, host="0.0.0.0", port=8000)
