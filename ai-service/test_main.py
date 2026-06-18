import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import anthropic
from main import app, sanitize_error_message

client = TestClient(app)


class TestGenerateContent:
    """Test suite for /generate endpoint."""
    
    def test_generate_content_success(self):
        """Test successful content generation."""
        mock_response = MagicMock()
        mock_response.content = [
            MagicMock(text="Generated content here")
        ]
        mock_response.usage.output_tokens = 42
        
        with patch('main.client.messages.create', return_value=mock_response):
            response = client.post(
                "/generate",
                json={"prompt": "Write a poem", "max_tokens": 1024}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "Generated content here"
        assert data["tokens_used"] == 42
    
    def test_generate_content_whitespace_only_prompt(self):
        """Test that whitespace-only prompts are rejected."""
        response = client.post(
            "/generate",
            json={"prompt": "   ", "max_tokens": 1024}
        )
        
        assert response.status_code == 400
        assert "empty or whitespace-only" in response.json()["detail"]
    
    def test_generate_content_empty_prompt(self):
        """Test that empty prompts are rejected."""
        response = client.post(
            "/generate",
            json={"prompt": "", "max_tokens": 1024}
        )
        
        assert response.status_code == 422  # Pydantic validation error
    
    def test_generate_content_api_status_error_503(self):
        """Test APIStatusError with upstream 503 → maps to 502."""
        error = anthropic.APIStatusError(
            message="Service Unavailable",
            response=MagicMock(status_code=503),
            body={"error": "service_unavailable"}
        )
        
        with patch('main.client.messages.create', side_effect=error):
            response = client.post(
                "/generate",
                json={"prompt": "Write a poem", "max_tokens": 1024}
            )
        
        assert response.status_code == 502
        assert "Upstream API error" in response.json()["detail"]
    
    def test_generate_content_bad_request_error(self):
        """Test BadRequestError → 400."""
        error = anthropic.BadRequestError(
            message="Invalid request parameters",
            response=MagicMock(status_code=400),
            body={"error": "invalid_request"}
        )
        
        with patch('main.client.messages.create', side_effect=error):
            response = client.post(
                "/generate",
                json={"prompt": "Write a poem", "max_tokens": 1024}
            )
        
        assert response.status_code == 400
        assert "Invalid request" in response.json()["detail"]
    
    def test_generate_content_authentication_error(self):
        """Test AuthenticationError → 401."""
        error = anthropic.AuthenticationError(
            message="Invalid API key",
            response=MagicMock(status_code=401),
            body={"error": "invalid_api_key"}
        )
        
        with patch('main.client.messages.create', side_effect=error):
            response = client.post(
                "/generate",
                json={"prompt": "Write a poem", "max_tokens": 1024}
            )
        
        assert response.status_code == 401
        assert "Authentication failed" in response.json()["detail"]
    
    def test_generate_content_rate_limit_error(self):
        """Test RateLimitError → 429."""
        error = anthropic.RateLimitError(
            message="Rate limit exceeded",
            response=MagicMock(status_code=429),
            body={"error": "rate_limit_exceeded"}
        )
        
        with patch('main.client.messages.create', side_effect=error):
            response = client.post(
                "/generate",
                json={"prompt": "Write a poem", "max_tokens": 1024}
            )
        
        assert response.status_code == 429
        assert "Rate limit exceeded" in response.json()["detail"]
    
    def test_generate_content_generic_api_error(self):
        """Test generic APIError → 500."""
        error = anthropic.APIError(
            message="API request failed",
            response=MagicMock(status_code=500),
            body={"error": "internal_error"}
        )
        
        with patch('main.client.messages.create', side_effect=error):
            response = client.post(
                "/generate",
                json={"prompt": "Write a poem", "max_tokens": 1024}
            )
        
        assert response.status_code == 500
        assert "API error" in response.json()["detail"]
    
    def test_generate_content_empty_content_block(self):
        """Test edge case: empty content block → 500."""
        mock_response = MagicMock()
        mock_response.content = []  # Empty content
        
        with patch('main.client.messages.create', return_value=mock_response):
            response = client.post(
                "/generate",
                json={"prompt": "Write a poem", "max_tokens": 1024}
            )
        
        assert response.status_code == 500
        assert "empty content block" in response.json()["detail"]
    
    def test_generate_content_non_text_block(self):
        """Test edge case: non-text content block → 500."""
        mock_response = MagicMock()
        mock_block = MagicMock(spec=[])  # No 'text' attribute
        mock_response.content = [mock_block]
        
        with patch('main.client.messages.create', return_value=mock_response):
            response = client.post(
                "/generate",
                json={"prompt": "Write a poem", "max_tokens": 1024}
            )
        
        assert response.status_code == 500
        assert "non-text content block" in response.json()["detail"]
    
    def test_error_message_sanitization_api_key(self):
        """Test that API keys are redacted from error messages."""
        error_with_key = "Request failed: sk-1234567890abcdefghij was invalid"
        sanitized = sanitize_error_message(error_with_key)
        
        assert "sk-" not in sanitized
        assert "[REDACTED_API_KEY]" in sanitized
    
    def test_error_message_sanitization_bearer_token(self):
        """Test that bearer tokens are redacted from error messages."""
        error_with_token = "Request failed: Bearer abc123def456 was invalid"
        sanitized = sanitize_error_message(error_with_token)
        
        assert "Bearer" not in sanitized or "[REDACTED_TOKEN]" in sanitized
    
    def test_error_message_sanitization_truncation(self):
        """Test that long error messages are truncated to prevent stack trace leakage."""
        long_error = "x" * 500
        sanitized = sanitize_error_message(long_error)
        
        assert len(sanitized) <= 203  # 200 chars + "..."
        assert "..." in sanitized
    
    def test_error_response_no_sensitive_data(self):
        """Test that error responses do not contain sensitive patterns."""
        error = anthropic.APIError(
            message="Request failed: sk-1234567890abcdefghij was invalid",
            response=MagicMock(status_code=500),
            body={"error": "internal_error"}
        )
        
        with patch('main.client.messages.create', side_effect=error):
            response = client.post(
                "/generate",
                json={"prompt": "Write a poem", "max_tokens": 1024}
            )
        
        assert response.status_code == 500
        detail = response.json()["detail"]
        # Verify no raw API key is in the response
        assert "sk-" not in detail
        assert "1234567890abcdefghij" not in detail
