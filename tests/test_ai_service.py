import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys
import os

# Add ai-service to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'ai-service'))

from main import app, _call_anthropic_api
import anthropic

client = TestClient(app)

class TestHealthCheck:
    """Test health check endpoint for orchestration."""
    
    def test_health_check_returns_200(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        assert response.json()["service"] == "ai-service"

class TestContentGeneration:
    """Test content generation with retry logic and rate-limit handling."""
    
    @patch('main.client.messages.create')
    def test_generate_content_success(self, mock_create):
        """Test successful content generation."""
        # Mock successful API response
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text="Generated content for test app")]
        mock_create.return_value = mock_message
        
        response = client.post("/generate", json={
            "app_name": "Test App",
            "description": "A test application",
            "template_type": "landing_page"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "content" in data
        assert "generated_at" in data
        assert data["content"] == "Generated content for test app"
        assert mock_create.called
    
    @patch('main.client.messages.create')
    def test_generate_content_with_retry_on_transient_failure(self, mock_create):
        """Test retry logic on transient failures."""
        # First call fails with transient error, second succeeds
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text="Content after retry")]
        
        mock_create.side_effect = [
            anthropic.APIError("Temporary service unavailable"),
            mock_message
        ]
        
        response = client.post("/generate", json={
            "app_name": "Test App",
            "description": "A test application",
            "template_type": "landing_page"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "Content after retry"
        # Verify retry was attempted (called twice)
        assert mock_create.call_count == 2
    
    @patch('main.client.messages.create')
    def test_generate_content_rate_limit_handling(self, mock_create):
        """Test rate-limit detection and user-facing error."""
        # Simulate rate limit error
        mock_create.side_effect = anthropic.RateLimitError("Rate limit exceeded")
        
        response = client.post("/generate", json={
            "app_name": "Test App",
            "description": "A test application",
            "template_type": "landing_page"
        })
        
        assert response.status_code == 429
        data = response.json()
        assert "rate limit" in data["detail"].lower()
    
    @patch('main.client.messages.create')
    def test_generate_content_api_error_handling(self, mock_create):
        """Test handling of non-transient API errors."""
        # Simulate non-transient API error
        mock_create.side_effect = anthropic.APIError("Invalid API key")
        
        response = client.post("/generate", json={
            "app_name": "Test App",
            "description": "A test application",
            "template_type": "landing_page"
        })
        
        assert response.status_code == 503
        data = response.json()
        assert "temporarily unavailable" in data["detail"].lower()
    
    @patch('main.client.messages.create')
    def test_generate_content_unexpected_error_handling(self, mock_create):
        """Test handling of unexpected errors."""
        # Simulate unexpected error
        mock_create.side_effect = Exception("Unexpected error")
        
        response = client.post("/generate", json={
            "app_name": "Test App",
            "description": "A test application",
            "template_type": "landing_page"
        })
        
        assert response.status_code == 500
        data = response.json()
        assert "internal server error" in data["detail"].lower()

class TestRetryLogic:
    """Test retry logic implementation."""
    
    @patch('main.client.messages.create')
    def test_retry_with_exponential_backoff(self, mock_create):
        """Test exponential backoff retry behavior."""
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text="Success after retries")]
        
        # Fail twice, succeed on third attempt
        mock_create.side_effect = [
            anthropic.APIError("Temporary failure 1"),
            anthropic.APIError("Temporary failure 2"),
            mock_message
        ]
        
        result = _call_anthropic_api("test prompt")
        
        assert result == "Success after retries"
        assert mock_create.call_count == 3
    
    @patch('main.client.messages.create')
    def test_retry_exhaustion(self, mock_create):
        """Test behavior when retries are exhausted."""
        # All attempts fail
        mock_create.side_effect = anthropic.APIError("Persistent failure")
        
        with pytest.raises(anthropic.APIError):
            _call_anthropic_api("test prompt")
        
        # Should have attempted 3 times
        assert mock_create.call_count == 3

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
