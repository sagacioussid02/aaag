import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app, parse_claude_response, ErrorResponse

client = TestClient(app)


class TestParseClaudeResponse:
    """Unit tests for parse_claude_response() function."""

    def test_parse_valid_response(self):
        """Test parsing a valid Claude API response."""
        response = {
            "content": [
                {"type": "text", "text": "Generated content here"}
            ]
        }
        result = parse_claude_response(response)
        assert result == "Generated content here"

    def test_parse_missing_content_field(self):
        """Test parsing a response missing the 'content' field."""
        response = {"id": "msg_123", "model": "claude-3-sonnet"}
        with pytest.raises(ValueError, match="Missing 'content' field"):
            parse_claude_response(response)

    def test_parse_empty_content_array(self):
        """Test parsing a response with an empty 'content' array."""
        response = {"content": []}
        with pytest.raises(ValueError, match="Empty 'content' array"):
            parse_claude_response(response)

    def test_parse_missing_text_attribute(self):
        """Test parsing a response where content item is missing 'text' attribute."""
        response = {
            "content": [
                {"type": "text"}  # Missing 'text' field
            ]
        }
        with pytest.raises(AttributeError):
            parse_claude_response(response)

    def test_parse_type_mismatch(self):
        """Test parsing a response with unexpected type."""
        response = {"content": "not a list"}  # Should be a list
        with pytest.raises((TypeError, AttributeError)):
            parse_claude_response(response)


class TestGenerateEndpoint:
    """Integration tests for the /generate HTTP endpoint."""

    @patch('main.anthropic.Anthropic')
    def test_generate_endpoint_happy_path(self, mock_anthropic_class):
        """Test successful generation flow."""
        # Mock the Anthropic client and response
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_client.messages.create.return_value = MagicMock(
            content=[
                MagicMock(type="text", text="Generated micro-app content")
            ]
        )

        payload = {
            "template_id": "template_001",
            "user_input": "A gift for my friend"
        }
        response = client.post("/generate", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "Generated micro-app content"

    @patch('main.anthropic.Anthropic')
    def test_generate_endpoint_returns_422_on_parse_failure(self, mock_anthropic_class):
        """Test that parse failures return HTTP 422 Unprocessable Entity."""
        # Mock the Anthropic client to return a malformed response
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_client.messages.create.return_value = MagicMock(
            content=[]  # Empty content array triggers ValueError in parse_claude_response
        )

        payload = {
            "template_id": "template_001",
            "user_input": "A gift for my friend"
        }
        response = client.post("/generate", json=payload)

        # Verify HTTP status is 422, not 200
        assert response.status_code == 422
        data = response.json()
        assert isinstance(data, dict)
        assert "error" in data
        assert len(data["error"]) > 0
        # Verify error message does not leak internal details
        assert "Empty 'content' array" in data["error"] or "parse" in data["error"].lower()

    @patch('main.anthropic.Anthropic')
    def test_generate_endpoint_returns_500_on_internal_error(self, mock_anthropic_class):
        """Test that unexpected exceptions return HTTP 500 Internal Server Error."""
        # Mock the Anthropic client to raise an unexpected exception
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_client.messages.create.side_effect = RuntimeError("Unexpected API failure")

        payload = {
            "template_id": "template_001",
            "user_input": "A gift for my friend"
        }
        response = client.post("/generate", json=payload)

        # Verify HTTP status is 500, not 200
        assert response.status_code == 500
        data = response.json()
        assert isinstance(data, dict)
        assert "error" in data
        assert len(data["error"]) > 0

    @patch('main.anthropic.Anthropic')
    def test_generate_endpoint_with_empty_content_array(self, mock_anthropic_class):
        """Test boundary case: structurally valid but semantically empty response."""
        # Mock the Anthropic client to return a valid structure with empty content
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_client.messages.create.return_value = MagicMock(
            content=[]  # Structurally valid but semantically empty
        )

        payload = {
            "template_id": "template_001",
            "user_input": "A gift for my friend"
        }
        response = client.post("/generate", json=payload)

        # Verify endpoint does not return 200 OK
        assert response.status_code == 422
        data = response.json()
        assert "error" in data
        # Verify error message is informative
        assert len(data["error"]) > 0

    @patch('main.anthropic.Anthropic')
    def test_generate_endpoint_missing_content_field(self, mock_anthropic_class):
        """Test that missing 'content' field returns HTTP 422."""
        # Mock the Anthropic client to return a response missing 'content'
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_client.messages.create.return_value = MagicMock(
            spec=["id", "model"]  # Missing 'content' attribute
        )
        # Make accessing 'content' raise AttributeError
        type(mock_client.messages.create.return_value).content = PropertyMock(
            side_effect=AttributeError("'content' field missing")
        )

        payload = {
            "template_id": "template_001",
            "user_input": "A gift for my friend"
        }
        response = client.post("/generate", json=payload)

        # Verify HTTP status is 422 or 500 (internal error), not 200
        assert response.status_code in [422, 500]
        data = response.json()
        assert "error" in data

    def test_generate_endpoint_error_response_schema(self):
        """Test that error responses conform to ErrorResponse schema."""
        # Trigger an error by sending invalid payload
        payload = {}  # Missing required fields
        response = client.post("/generate", json=payload)

        # Verify response is an error (4xx or 5xx)
        assert response.status_code >= 400
        data = response.json()
        # Verify ErrorResponse schema: must have 'error' field
        assert isinstance(data, dict)
        assert "error" in data or "detail" in data
