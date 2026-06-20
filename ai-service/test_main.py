import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app, ContentGenerationRequest
import anthropic

client = TestClient(app)


class TestContentGeneration:
    """Test suite for AI content generation with SDK contract validation."""
    
    def test_health_check(self):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
    
    @patch('main.client.messages.create')
    def test_successful_content_generation(self, mock_create):
        """Test successful content generation with proper SDK contract."""
        # Mock successful API response
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="Generated content here")]
        mock_response.stop_reason = "end_turn"
        mock_response.usage = MagicMock(input_tokens=10, output_tokens=20)
        mock_create.return_value = mock_response
        
        # Make request
        response = client.post(
            "/generate",
            json={"prompt": "Write a short story", "max_tokens": 1024}
        )
        
        # Validate response
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "Generated content here"
        assert data["stop_reason"] == "end_turn"
        assert data["usage"]["input_tokens"] == 10
        assert data["usage"]["output_tokens"] == 20
        
        # Verify SDK was called correctly
        mock_create.assert_called_once()
        call_kwargs = mock_create.call_args[1]
        assert call_kwargs["model"] == "claude-3-5-sonnet-20241022"
        assert call_kwargs["max_tokens"] == 1024
        assert call_kwargs["messages"][0]["content"] == "Write a short story"
    
    def test_empty_prompt_validation(self):
        """Test that empty prompts are rejected."""
        response = client.post(
            "/generate",
            json={"prompt": "", "max_tokens": 1024}
        )
        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()
    
    def test_whitespace_only_prompt_validation(self):
        """Test that whitespace-only prompts are rejected."""
        response = client.post(
            "/generate",
            json={"prompt": "   ", "max_tokens": 1024}
        )
        assert response.status_code == 400
    
    def test_invalid_max_tokens_too_low(self):
        """Test that max_tokens < 1 is rejected."""
        response = client.post(
            "/generate",
            json={"prompt": "Test", "max_tokens": 0}
        )
        assert response.status_code == 400
        assert "max_tokens" in response.json()["detail"].lower()
    
    def test_invalid_max_tokens_too_high(self):
        """Test that max_tokens > 4096 is rejected."""
        response = client.post(
            "/generate",
            json={"prompt": "Test", "max_tokens": 5000}
        )
        assert response.status_code == 400
        assert "max_tokens" in response.json()["detail"].lower()
    
    @patch('main.client.messages.create')
    def test_api_connection_error_propagation(self, mock_create):
        """Test that API connection errors are properly propagated."""
        mock_create.side_effect = anthropic.APIConnectionError("Connection failed")
        
        response = client.post(
            "/generate",
            json={"prompt": "Test", "max_tokens": 1024}
        )
        
        assert response.status_code == 503
        assert "connection" in response.json()["detail"].lower()
    
    @patch('main.client.messages.create')
    def test_rate_limit_error_propagation(self, mock_create):
        """Test that rate limit errors are properly propagated."""
        mock_create.side_effect = anthropic.RateLimitError("Rate limit exceeded")
        
        response = client.post(
            "/generate",
            json={"prompt": "Test", "max_tokens": 1024}
        )
        
        assert response.status_code == 429
        assert "rate limit" in response.json()["detail"].lower()
    
    @patch('main.client.messages.create')
    def test_authentication_error_propagation(self, mock_create):
        """Test that authentication errors are properly propagated."""
        mock_create.side_effect = anthropic.AuthenticationError("Invalid API key")
        
        response = client.post(
            "/generate",
            json={"prompt": "Test", "max_tokens": 1024}
        )
        
        assert response.status_code == 401
        assert "authentication" in response.json()["detail"].lower()
    
    @patch('main.client.messages.create')
    def test_api_status_error_propagation(self, mock_create):
        """Test that API status errors are properly propagated."""
        error = anthropic.APIStatusError("Server error", response=MagicMock(status_code=500), body={})
        mock_create.side_effect = error
        
        response = client.post(
            "/generate",
            json={"prompt": "Test", "max_tokens": 1024}
        )
        
        assert response.status_code == 500
        assert "error" in response.json()["detail"].lower()
    
    @patch('main.client.messages.create')
    def test_empty_api_response_handling(self, mock_create):
        """Test that empty API responses are handled gracefully."""
        mock_response = MagicMock()
        mock_response.content = []
        mock_create.return_value = mock_response
        
        response = client.post(
            "/generate",
            json={"prompt": "Test", "max_tokens": 1024}
        )
        
        assert response.status_code == 500
        assert "empty" in response.json()["detail"].lower()
    
    @patch('main.client.messages.create')
    def test_unexpected_content_block_type(self, mock_create):
        """Test handling of unexpected content block types."""
        mock_response = MagicMock()
        mock_content_block = MagicMock(spec=[])
        del mock_content_block.text  # Remove text attribute
        mock_response.content = [mock_content_block]
        mock_create.return_value = mock_response
        
        response = client.post(
            "/generate",
            json={"prompt": "Test", "max_tokens": 1024}
        )
        
        assert response.status_code == 500
        assert "unexpected" in response.json()["detail"].lower()
    
    @patch('main.client.messages.create')
    def test_default_max_tokens(self, mock_create):
        """Test that default max_tokens is applied correctly."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="Generated")]
        mock_response.stop_reason = "end_turn"
        mock_response.usage = MagicMock(input_tokens=5, output_tokens=10)
        mock_create.return_value = mock_response
        
        response = client.post(
            "/generate",
            json={"prompt": "Test"}
        )
        
        assert response.status_code == 200
        call_kwargs = mock_create.call_args[1]
        assert call_kwargs["max_tokens"] == 1024
