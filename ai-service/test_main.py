import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from main import app, parse_claude_response, sanitize_error_detail, GenerateRequest

client = TestClient(app)


class TestParseClaudeResponse:
    """Unit tests for parse_claude_response function."""
    
    def test_parse_valid_response(self):
        """Test parsing a well-formed Claude response."""
        mock_response = Mock()
        mock_content_block = Mock()
        mock_content_block.text = "Generated content"
        mock_response.content = [mock_content_block]
        
        result = parse_claude_response(mock_response)
        assert result == "Generated content"
    
    def test_parse_missing_content_attribute(self):
        """Test that missing 'content' attribute raises AttributeError."""
        mock_response = Mock(spec=[])
        del mock_response.content  # Remove content attribute
        
        with pytest.raises(AttributeError, match="missing 'content' attribute"):
            parse_claude_response(mock_response)
    
    def test_parse_empty_content_array(self):
        """Test that empty content array raises ValueError."""
        mock_response = Mock()
        mock_response.content = []
        
        with pytest.raises(ValueError, match="content.*empty"):
            parse_claude_response(mock_response)
    
    def test_parse_missing_text_attribute(self):
        """Test that missing 'text' attribute raises AttributeError."""
        mock_response = Mock()
        mock_content_block = Mock(spec=[])
        del mock_content_block.text  # Remove text attribute
        mock_response.content = [mock_content_block]
        
        with pytest.raises(AttributeError, match="missing 'text' attribute"):
            parse_claude_response(mock_response)
    
    def test_parse_non_string_text(self):
        """Test that non-string text raises ValueError."""
        mock_response = Mock()
        mock_content_block = Mock()
        mock_content_block.text = 12345  # Not a string
        mock_response.content = [mock_content_block]
        
        with pytest.raises(ValueError, match="text is not a string"):
            parse_claude_response(mock_response)
    
    def test_parse_none_content(self):
        """Test that None content raises AttributeError."""
        mock_response = Mock()
        mock_response.content = None
        
        with pytest.raises(AttributeError, match="missing 'content' attribute"):
            parse_claude_response(mock_response)


class TestSanitizeErrorDetail:
    """Unit tests for error sanitization."""
    
    def test_sanitize_api_key(self):
        """Test that API keys are redacted."""
        detail = "Error calling API with key sk-1234567890abcdefghijklmnopqrstuvwxyz1234567890"
        result = sanitize_error_detail(detail)
        assert "sk-" not in result or "REDACTED" in result
        assert "1234567890abcdef" not in result
    
    def test_sanitize_bearer_token(self):
        """Test that bearer tokens are redacted."""
        detail = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
        result = sanitize_error_detail(detail)
        assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in result
        assert "REDACTED" in result
    
    def test_sanitize_file_paths(self):
        """Test that file paths are redacted."""
        detail = 'File "/home/user/project/ai-service/main.py", line 42, in generate_content'
        result = sanitize_error_detail(detail)
        assert "/home/user/project" not in result
    
    def test_sanitize_empty_string(self):
        """Test that empty strings are handled gracefully."""
        result = sanitize_error_detail("")
        assert result == ""
    
    def test_sanitize_none(self):
        """Test that None is handled gracefully."""
        result = sanitize_error_detail(None)
        assert result == ""


class TestGenerateEndpoint:
    """Integration tests for the /generate HTTP endpoint."""
    
    @patch('main.client.messages.create')
    def test_generate_success_happy_path(self, mock_create):
        """Test successful content generation with well-formed response."""
        # Mock a well-formed Claude response
        mock_response = Mock()
        mock_content_block = Mock()
        mock_content_block.text = "Your personalized app content here"
        mock_response.content = [mock_content_block]
        mock_create.return_value = mock_response
        
        request_data = {
            "template_id": "template_1",
            "user_input": {"name": "Alice", "color": "blue"},
            "context": {"theme": "modern"}
        }
        
        response = client.post("/generate", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "Your personalized app content here"
        assert data["template_id"] == "template_1"
    
    @patch('main.client.messages.create')
    def test_generate_missing_content_attribute_returns_422(self, mock_create):
        """Test that missing 'content' attribute returns 422 Unprocessable Entity."""
        # Mock a malformed response (missing content attribute)
        mock_response = Mock(spec=[])
        del mock_response.content
        mock_create.return_value = mock_response
        
        request_data = {
            "template_id": "template_1",
            "user_input": {"name": "Bob"}
        }
        
        response = client.post("/generate", json=request_data)
        
        assert response.status_code == 422
        data = response.json()
        assert "error" in data
        assert "Failed to parse Claude API response" in data["error"]
    
    @patch('main.client.messages.create')
    def test_generate_empty_content_array_returns_422(self, mock_create):
        """Test that empty content array returns 422 Unprocessable Entity."""
        # Mock a malformed response (empty content array)
        mock_response = Mock()
        mock_response.content = []
        mock_create.return_value = mock_response
        
        request_data = {
            "template_id": "template_1",
            "user_input": {"name": "Charlie"}
        }
        
        response = client.post("/generate", json=request_data)
        
        assert response.status_code == 422
        data = response.json()
        assert "error" in data
        assert "Failed to parse Claude API response" in data["error"]
    
    @patch('main.client.messages.create')
    def test_generate_missing_text_attribute_returns_422(self, mock_create):
        """Test that missing 'text' attribute returns 422 Unprocessable Entity."""
        # Mock a malformed response (missing text attribute)
        mock_response = Mock()
        mock_content_block = Mock(spec=[])
        del mock_content_block.text
        mock_response.content = [mock_content_block]
        mock_create.return_value = mock_response
        
        request_data = {
            "template_id": "template_1",
            "user_input": {"name": "Diana"}
        }
        
        response = client.post("/generate", json=request_data)
        
        assert response.status_code == 422
        data = response.json()
        assert "error" in data
    
    @patch('main.client.messages.create')
    def test_generate_non_string_text_returns_422(self, mock_create):
        """Test that non-string text returns 422 Unprocessable Entity."""
        # Mock a malformed response (text is not a string)
        mock_response = Mock()
        mock_content_block = Mock()
        mock_content_block.text = {"invalid": "type"}
        mock_response.content = [mock_content_block]
        mock_create.return_value = mock_response
        
        request_data = {
            "template_id": "template_1",
            "user_input": {"name": "Eve"}
        }
        
        response = client.post("/generate", json=request_data)
        
        assert response.status_code == 422
        data = response.json()
        assert "error" in data
    
    @patch('main.client.messages.create')
    def test_generate_unexpected_exception_returns_500(self, mock_create):
        """Test that unexpected exceptions return 500 Internal Server Error."""
        # Mock an unexpected exception
        mock_create.side_effect = RuntimeError("Unexpected API error")
        
        request_data = {
            "template_id": "template_1",
            "user_input": {"name": "Frank"}
        }
        
        response = client.post("/generate", json=request_data)
        
        assert response.status_code == 500
        data = response.json()
        assert "error" in data
        assert "Internal server error" in data["error"]
    
    @patch('main.client.messages.create')
    def test_generate_error_details_are_sanitized(self, mock_create):
        """Test that error details are sanitized before returning to caller."""
        # Mock a response that will fail parsing
        mock_response = Mock()
        mock_response.content = None
        mock_create.return_value = mock_response
        
        request_data = {
            "template_id": "template_1",
            "user_input": {"name": "Grace"}
        }
        
        response = client.post("/generate", json=request_data)
        
        assert response.status_code == 422
        data = response.json()
        # Verify that details field exists and is sanitized (no raw exception details)
        if "details" in data:
            assert "REDACTED" in data["details"] or "error" in data["details"].lower()


class TestHealthEndpoint:
    """Tests for the /health endpoint."""
    
    def test_health_check_returns_200(self):
        """Test that health check endpoint returns 200 OK."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
