import pytest
from unittest.mock import Mock, patch, MagicMock
from main import app, parse_claude_response, GenerateRequest, ErrorResponse
from fastapi.testclient import TestClient

client = TestClient(app)


class TestParseClaudeResponse:
    """Test suite for Claude response parsing with error handling."""
    
    def test_parse_valid_response(self):
        """Test parsing a valid Claude response."""
        mock_response = Mock()
        mock_response.content = [Mock(text="Generated content here")]
        mock_response.model = "claude-3-5-sonnet-20241022"
        mock_response.usage = Mock(input_tokens=10, output_tokens=20)
        
        result = parse_claude_response(mock_response)
        
        assert result["content"] == "Generated content here"
        assert result["metadata"]["model"] == "claude-3-5-sonnet-20241022"
        assert result["metadata"]["usage"]["input_tokens"] == 10
        assert result["metadata"]["usage"]["output_tokens"] == 20
    
    def test_parse_response_missing_content_attribute(self):
        """Test parsing fails when response lacks 'content' attribute."""
        mock_response = Mock(spec=[])
        
        with pytest.raises(ValueError, match="Malformed Claude API response"):
            parse_claude_response(mock_response)
    
    def test_parse_response_empty_content_array(self):
        """Test parsing fails when content array is empty."""
        mock_response = Mock()
        mock_response.content = []
        
        with pytest.raises(ValueError, match="Malformed Claude API response"):
            parse_claude_response(mock_response)
    
    def test_parse_response_missing_text_attribute(self):
        """Test parsing fails when content block lacks 'text' attribute."""
        mock_response = Mock()
        mock_content_block = Mock(spec=[])
        mock_response.content = [mock_content_block]
        
        with pytest.raises(ValueError, match="Malformed Claude API response"):
            parse_claude_response(mock_response)
    
    def test_parse_response_text_not_string(self):
        """Test parsing fails when text is not a string."""
        mock_response = Mock()
        mock_response.content = [Mock(text=12345)]  # Not a string
        
        with pytest.raises(ValueError, match="Malformed Claude API response"):
            parse_claude_response(mock_response)
    
    def test_parse_response_empty_text(self):
        """Test parsing fails when text is empty or whitespace-only."""
        mock_response = Mock()
        mock_response.content = [Mock(text="   ")]  # Whitespace only
        
        with pytest.raises(ValueError, match="Malformed Claude API response"):
            parse_claude_response(mock_response)
    
    def test_parse_response_missing_usage(self):
        """Test parsing succeeds even when usage is missing (graceful degradation)."""
        mock_response = Mock()
        mock_response.content = [Mock(text="Generated content")]
        mock_response.model = "claude-3-5-sonnet-20241022"
        # No usage attribute
        del mock_response.usage
        
        result = parse_claude_response(mock_response)
        
        assert result["content"] == "Generated content"
        assert result["metadata"]["usage"]["input_tokens"] == 0
        assert result["metadata"]["usage"]["output_tokens"] == 0


class TestGenerateEndpoint:
    """Test suite for /generate endpoint error handling."""
    
    @patch('main.client.messages.create')
    def test_generate_success(self, mock_create):
        """Test successful content generation."""
        mock_response = Mock()
        mock_response.content = [Mock(text="Generated personalized content")]
        mock_response.model = "claude-3-5-sonnet-20241022"
        mock_response.usage = Mock(input_tokens=10, output_tokens=20)
        mock_create.return_value = mock_response
        
        request = GenerateRequest(
            template_id="template-1",
            user_input={"name": "John", "theme": "blue"}
        )
        
        response = client.post("/generate", json=request.model_dump())
        
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "Generated personalized content"
        assert data["metadata"]["model"] == "claude-3-5-sonnet-20241022"
    
    @patch('main.client.messages.create')
    def test_generate_malformed_response(self, mock_create):
        """Test handling of malformed Claude response."""
        mock_response = Mock()
        mock_response.content = []  # Empty content array
        mock_create.return_value = mock_response
        
        request = GenerateRequest(
            template_id="template-1",
            user_input={"name": "John"}
        )
        
        response = client.post("/generate", json=request.model_dump())
        
        assert response.status_code == 200
        data = response.json()
        assert "error" in data
        assert "Failed to parse Claude response" in data["error"]
    
    @patch('main.client.messages.create')
    def test_generate_api_error(self, mock_create):
        """Test handling of Anthropic API errors."""
        import anthropic
        mock_create.side_effect = anthropic.APIError("API rate limit exceeded")
        
        request = GenerateRequest(
            template_id="template-1",
            user_input={"name": "John"}
        )
        
        response = client.post("/generate", json=request.model_dump())
        
        assert response.status_code == 200
        data = response.json()
        assert "error" in data
        assert "Claude API request failed" in data["error"]
    
    def test_generate_missing_template_id(self):
        """Test validation error when template_id is missing."""
        request_data = {
            "user_input": {"name": "John"}
        }
        
        response = client.post("/generate", json=request_data)
        
        # FastAPI validation should catch this
        assert response.status_code == 422
    
    def test_generate_missing_user_input(self):
        """Test validation error when user_input is missing."""
        request_data = {
            "template_id": "template-1"
        }
        
        response = client.post("/generate", json=request_data)
        
        # FastAPI validation should catch this
        assert response.status_code == 422
    
    @patch('main.client.messages.create')
    def test_generate_response_text_not_string(self, mock_create):
        """Test handling when Claude response text is not a string."""
        mock_response = Mock()
        mock_response.content = [Mock(text=None)]  # Not a string
        mock_create.return_value = mock_response
        
        request = GenerateRequest(
            template_id="template-1",
            user_input={"name": "John"}
        )
        
        response = client.post("/generate", json=request.model_dump())
        
        assert response.status_code == 200
        data = response.json()
        assert "error" in data
        assert "Failed to parse Claude response" in data["error"]


class TestHealthEndpoint:
    """Test suite for /health endpoint."""
    
    def test_health_check(self):
        """Test health check endpoint is responsive."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "ai-service"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
