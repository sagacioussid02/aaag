import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import anthropic
from main import app, sanitize_error_detail

client = TestClient(app)


class TestGenerateContentSuccess:
    """Test successful content generation."""
    
    def test_generate_content_success(self):
        """Test successful content generation returns 200 with content."""
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text="Generated content")]
        
        with patch('main.anthropic.Anthropic') as mock_client_class:
            mock_instance = MagicMock()
            mock_client_class.return_value = mock_instance
            mock_instance.messages.create.return_value = mock_message
            
            response = client.post("/generate", json={"prompt": "Test prompt"})
            
            assert response.status_code == 200
            assert response.json() == {"content": "Generated content"}


class TestGenerateContentInputValidation:
    """Test input validation."""
    
    def test_generate_content_empty_prompt(self):
        """Test that empty prompt returns 400."""
        response = client.post("/generate", json={"prompt": ""})
        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()
    
    def test_generate_content_whitespace_only_prompt(self):
        """Test that whitespace-only prompt returns 400."""
        response = client.post("/generate", json={"prompt": "   \n\t  "})
        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()


class TestGenerateContentErrorHandling:
    """Test error handling for Anthropic SDK exceptions."""
    
    def test_generate_content_api_status_error(self):
        """Test APIStatusError (upstream API error) maps to 502."""
        with patch('main.anthropic.Anthropic') as mock_client_class:
            mock_instance = MagicMock()
            mock_client_class.return_value = mock_instance
            mock_instance.messages.create.side_effect = anthropic.APIStatusError(
                message="Service Unavailable",
                response=MagicMock(status_code=503),
                body={}
            )
            
            response = client.post("/generate", json={"prompt": "Test"})
            
            assert response.status_code == 502
            assert "Service Unavailable" in response.json()["detail"]
    
    def test_generate_content_bad_request_error(self):
        """Test BadRequestError maps to 400."""
        with patch('main.anthropic.Anthropic') as mock_client_class:
            mock_instance = MagicMock()
            mock_client_class.return_value = mock_instance
            mock_instance.messages.create.side_effect = anthropic.BadRequestError(
                message="Invalid request",
                response=MagicMock(status_code=400),
                body={}
            )
            
            response = client.post("/generate", json={"prompt": "Test"})
            
            assert response.status_code == 400
            assert "Invalid request" in response.json()["detail"]
    
    def test_generate_content_authentication_error(self):
        """Test AuthenticationError maps to 401 with upstream clarification."""
        with patch('main.anthropic.Anthropic') as mock_client_class:
            mock_instance = MagicMock()
            mock_client_class.return_value = mock_instance
            mock_instance.messages.create.side_effect = anthropic.AuthenticationError(
                message="Invalid API key",
                response=MagicMock(status_code=401),
                body={}
            )
            
            response = client.post("/generate", json={"prompt": "Test"})
            
            assert response.status_code == 401
            detail = response.json()["detail"]
            assert "Upstream authentication failed" in detail
            assert "Invalid API key" in detail
    
    def test_generate_content_rate_limit_error(self):
        """Test RateLimitError maps to 429."""
        with patch('main.anthropic.Anthropic') as mock_client_class:
            mock_instance = MagicMock()
            mock_client_class.return_value = mock_instance
            mock_instance.messages.create.side_effect = anthropic.RateLimitError(
                message="Rate limit exceeded",
                response=MagicMock(status_code=429),
                body={}
            )
            
            response = client.post("/generate", json={"prompt": "Test"})
            
            assert response.status_code == 429
            assert "Rate limit exceeded" in response.json()["detail"]
    
    def test_generate_content_generic_api_error(self):
        """Test generic APIError maps to 500."""
        with patch('main.anthropic.Anthropic') as mock_client_class:
            mock_instance = MagicMock()
            mock_client_class.return_value = mock_instance
            mock_instance.messages.create.side_effect = anthropic.APIError(
                message="Internal server error"
            )
            
            response = client.post("/generate", json={"prompt": "Test"})
            
            assert response.status_code == 500
            assert "Internal server error" in response.json()["detail"]
    
    def test_generate_content_unexpected_exception(self):
        """Test unexpected exceptions map to 500."""
        with patch('main.anthropic.Anthropic') as mock_client_class:
            mock_instance = MagicMock()
            mock_client_class.return_value = mock_instance
            mock_instance.messages.create.side_effect = ValueError("Unexpected error")
            
            response = client.post("/generate", json={"prompt": "Test"})
            
            assert response.status_code == 500
            assert "Unexpected error" in response.json()["detail"]


class TestGenerateContentEdgeCases:
    """Test edge cases in content generation."""
    
    def test_generate_content_empty_content_blocks(self):
        """Test that empty content blocks return 500."""
        mock_message = MagicMock()
        mock_message.content = []
        
        with patch('main.anthropic.Anthropic') as mock_client_class:
            mock_instance = MagicMock()
            mock_client_class.return_value = mock_instance
            mock_instance.messages.create.return_value = mock_message
            
            response = client.post("/generate", json={"prompt": "Test"})
            
            assert response.status_code == 500
            assert "empty content" in response.json()["detail"].lower()
    
    def test_generate_content_non_text_block(self):
        """Test that non-text content blocks return 500."""
        mock_message = MagicMock()
        mock_block = MagicMock()
        # Remove the 'text' attribute to simulate non-text block
        del mock_block.text
        mock_message.content = [mock_block]
        
        with patch('main.anthropic.Anthropic') as mock_client_class:
            mock_instance = MagicMock()
            mock_client_class.return_value = mock_instance
            mock_instance.messages.create.return_value = mock_message
            
            response = client.post("/generate", json={"prompt": "Test"})
            
            assert response.status_code == 500
            assert "non-text" in response.json()["detail"].lower()


class TestSanitizeErrorDetail:
    """Test error message sanitization."""
    
    def test_sanitize_api_key_pattern(self):
        """Test that API keys are redacted."""
        error = "Error with API key sk-1234567890abcdefghij"
        sanitized = sanitize_error_detail(error)
        assert "sk-1234567890abcdefghij" not in sanitized
        assert "[REDACTED_API_KEY]" in sanitized
    
    def test_sanitize_stack_trace(self):
        """Test that stack traces are redacted."""
        error = "Error occurred\n  at function_name\n  File /path/to/file.py"
        sanitized = sanitize_error_detail(error)
        assert "at function_name" not in sanitized
        assert "[STACK_TRACE_REDACTED]" in sanitized
    
    def test_sanitize_internal_paths(self):
        """Test that internal file paths are redacted."""
        error = "Error in /home/user/project/main.py"
        sanitized = sanitize_error_detail(error)
        assert "/home/user/project/main.py" not in sanitized
        assert "[INTERNAL_PATH_REDACTED]" in sanitized
    
    def test_sanitize_auth_headers(self):
        """Test that auth headers are redacted."""
        error = "Request failed with Authorization: Bearer token123"
        sanitized = sanitize_error_detail(error)
        assert "Bearer token123" not in sanitized
        assert "[REDACTED_HEADER]" in sanitized
    
    def test_sanitize_does_not_leak_sensitive_data(self):
        """Test that error responses do not contain sensitive patterns."""
        error = "API key sk-abcdefghij1234567890 failed with Authorization: Bearer xyz"
        sanitized = sanitize_error_detail(error)
        
        # Verify no API keys remain
        assert not any(pattern in sanitized for pattern in ["sk-", "Bearer"])
        # Verify redaction markers are present
        assert "[REDACTED" in sanitized
