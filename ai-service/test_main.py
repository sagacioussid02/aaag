import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import anthropic
from main import app

client = TestClient(app)

class TestGenerateContent:
    """Test suite for the /generate endpoint with error propagation."""
    
    def test_generate_content_success(self):
        """Test successful content generation."""
        mock_response = MagicMock()
        mock_response.content = [
            MagicMock(text="Generated content here")
        ]
        mock_response.stop_reason = "end_turn"
        
        with patch('anthropic.Anthropic') as mock_client:
            mock_instance = MagicMock()
            mock_client.return_value = mock_instance
            mock_instance.messages.create.return_value = mock_response
            
            response = client.post(
                "/generate",
                json={"prompt": "Write a short story", "max_tokens": 512}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["content"] == "Generated content here"
            assert data["stop_reason"] == "end_turn"
    
    def test_generate_content_empty_prompt(self):
        """Test that empty prompt returns 400 error."""
        response = client.post(
            "/generate",
            json={"prompt": "", "max_tokens": 512}
        )
        
        assert response.status_code == 400
        assert "Prompt cannot be empty" in response.json()["detail"]
    
    def test_generate_content_api_error_propagation(self):
        """Test that Anthropic API errors are propagated to the caller."""
        with patch('anthropic.Anthropic') as mock_client:
            mock_instance = MagicMock()
            mock_client.return_value = mock_instance
            # Simulate an API error from Anthropic
            mock_instance.messages.create.side_effect = anthropic.APIError(
                "API request failed"
            )
            
            response = client.post(
                "/generate",
                json={"prompt": "Test prompt", "max_tokens": 512}
            )
            
            assert response.status_code == 500
            assert "Anthropic API error" in response.json()["detail"]
    
    def test_generate_content_bad_request_error(self):
        """Test that BadRequestError returns 400 status."""
        with patch('anthropic.Anthropic') as mock_client:
            mock_instance = MagicMock()
            mock_client.return_value = mock_instance
            # Simulate a BadRequestError from Anthropic
            mock_instance.messages.create.side_effect = anthropic.BadRequestError(
                "Invalid request parameters"
            )
            
            response = client.post(
                "/generate",
                json={"prompt": "Test prompt", "max_tokens": 512}
            )
            
            assert response.status_code == 400
            assert "Anthropic API error" in response.json()["detail"]
    
    def test_generate_content_authentication_error(self):
        """Test that AuthenticationError returns 401 status."""
        with patch('anthropic.Anthropic') as mock_client:
            mock_instance = MagicMock()
            mock_client.return_value = mock_instance
            # Simulate an AuthenticationError from Anthropic
            mock_instance.messages.create.side_effect = anthropic.AuthenticationError(
                "Invalid API key"
            )
            
            response = client.post(
                "/generate",
                json={"prompt": "Test prompt", "max_tokens": 512}
            )
            
            assert response.status_code == 401
            assert "Anthropic API error" in response.json()["detail"]
    
    def test_generate_content_rate_limit_error(self):
        """Test that RateLimitError returns 429 status."""
        with patch('anthropic.Anthropic') as mock_client:
            mock_instance = MagicMock()
            mock_client.return_value = mock_instance
            # Simulate a RateLimitError from Anthropic
            mock_instance.messages.create.side_effect = anthropic.RateLimitError(
                "Rate limit exceeded"
            )
            
            response = client.post(
                "/generate",
                json={"prompt": "Test prompt", "max_tokens": 512}
            )
            
            assert response.status_code == 429
            assert "Anthropic API error" in response.json()["detail"]
    
    def test_generate_content_unexpected_error(self):
        """Test that unexpected errors are caught and propagated."""
        with patch('anthropic.Anthropic') as mock_client:
            mock_instance = MagicMock()
            mock_client.return_value = mock_instance
            # Simulate an unexpected error
            mock_instance.messages.create.side_effect = Exception(
                "Unexpected error occurred"
            )
            
            response = client.post(
                "/generate",
                json={"prompt": "Test prompt", "max_tokens": 512}
            )
            
            assert response.status_code == 500
            assert "Internal server error" in response.json()["detail"]
    
    def test_health_check(self):
        """Test that health check endpoint works."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
