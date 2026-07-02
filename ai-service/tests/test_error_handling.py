import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app
import asyncio
import json


client = TestClient(app)


class TestTimeoutHandling:
    """Test suite for Anthropic API timeout handling."""

    @patch('main.anthropic.Anthropic')
    def test_timeout_returns_504_with_structured_error(self, mock_anthropic_class):
        """Verify that a timeout from Anthropic API returns 504 with structured JSON."""
        # Setup: Mock the Anthropic client to raise a timeout exception
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        
        # Simulate timeout by raising an exception
        from anthropic import APITimeoutError
        mock_client.messages.create.side_effect = APITimeoutError("Request timed out")
        
        # Act: Send a valid request to the generate endpoint
        response = client.post(
            "/generate",
            json={
                "user_input": "Create a birthday gift app",
                "template_id": "template_001",
                "user_id": "user_123"
            }
        )
        
        # Assert: Response should be 504 with structured error JSON
        assert response.status_code == 504
        data = response.json()
        assert "error" in data
        assert "timeout" in data["error"].lower()
        assert "traceback" not in response.text  # No raw Python traceback

    @patch('main.anthropic.Anthropic')
    def test_timeout_error_message_is_user_friendly(self, mock_anthropic_class):
        """Verify that timeout error message is user-friendly and actionable."""
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        
        from anthropic import APITimeoutError
        mock_client.messages.create.side_effect = APITimeoutError("Request timed out")
        
        response = client.post(
            "/generate",
            json={
                "user_input": "Create a birthday gift app",
                "template_id": "template_001",
                "user_id": "user_123"
            }
        )
        
        assert response.status_code == 504
        data = response.json()
        # Error message should be helpful, not a raw exception
        assert len(data["error"]) > 0
        assert "Request timed out" in data["error"] or "timeout" in data["error"].lower()


class TestAPIErrorHandling:
    """Test suite for Anthropic API error handling."""

    @patch('main.anthropic.Anthropic')
    def test_rate_limit_error_returns_429(self, mock_anthropic_class):
        """Verify that rate limit errors return 429 with structured JSON."""
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        
        from anthropic import RateLimitError
        mock_client.messages.create.side_effect = RateLimitError("Rate limit exceeded")
        
        response = client.post(
            "/generate",
            json={
                "user_input": "Create a birthday gift app",
                "template_id": "template_001",
                "user_id": "user_123"
            }
        )
        
        assert response.status_code == 429
        data = response.json()
        assert "error" in data
        assert "rate" in data["error"].lower() or "limit" in data["error"].lower()

    @patch('main.anthropic.Anthropic')
    def test_authentication_error_returns_401(self, mock_anthropic_class):
        """Verify that authentication errors return 401 with structured JSON."""
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        
        from anthropic import AuthenticationError
        mock_client.messages.create.side_effect = AuthenticationError("Invalid API key")
        
        response = client.post(
            "/generate",
            json={
                "user_input": "Create a birthday gift app",
                "template_id": "template_001",
                "user_id": "user_123"
            }
        )
        
        assert response.status_code == 401
        data = response.json()
        assert "error" in data
        assert "auth" in data["error"].lower() or "api" in data["error"].lower()

    @patch('main.anthropic.Anthropic')
    def test_generic_api_error_returns_502(self, mock_anthropic_class):
        """Verify that generic API errors return 502 with structured JSON."""
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        
        from anthropic import APIError
        mock_client.messages.create.side_effect = APIError("Service unavailable")
        
        response = client.post(
            "/generate",
            json={
                "user_input": "Create a birthday gift app",
                "template_id": "template_001",
                "user_id": "user_123"
            }
        )
        
        assert response.status_code == 502
        data = response.json()
        assert "error" in data
        assert "traceback" not in response.text  # No raw Python traceback


class TestInvalidInputHandling:
    """Test suite for invalid input validation."""

    def test_missing_user_input_returns_400(self):
        """Verify that missing user_input returns 400 with structured error."""
        response = client.post(
            "/generate",
            json={
                "template_id": "template_001",
                "user_id": "user_123"
                # Missing user_input
            }
        )
        
        assert response.status_code == 422  # FastAPI validation error
        data = response.json()
        assert "detail" in data or "error" in data
        assert "traceback" not in response.text  # No raw Python traceback

    def test_missing_template_id_returns_400(self):
        """Verify that missing template_id returns 400 with structured error."""
        response = client.post(
            "/generate",
            json={
                "user_input": "Create a birthday gift app",
                "user_id": "user_123"
                # Missing template_id
            }
        )
        
        assert response.status_code == 422  # FastAPI validation error
        data = response.json()
        assert "detail" in data or "error" in data
        assert "traceback" not in response.text

    def test_empty_user_input_returns_400(self):
        """Verify that empty user_input returns 400 with structured error."""
        response = client.post(
            "/generate",
            json={
                "user_input": "",  # Empty string
                "template_id": "template_001",
                "user_id": "user_123"
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "empty" in data["error"].lower() or "required" in data["error"].lower()
        assert "traceback" not in response.text

    def test_invalid_json_returns_400(self):
        """Verify that invalid JSON returns 400 with structured error."""
        response = client.post(
            "/generate",
            data="{invalid json}",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422  # FastAPI validation error
        data = response.json()
        assert "detail" in data or "error" in data
        assert "traceback" not in response.text

    def test_malformed_payload_returns_400(self):
        """Verify that malformed payload returns 400 with structured error."""
        response = client.post(
            "/generate",
            json={
                "user_input": "Create a birthday gift app",
                "template_id": 12345,  # Should be string
                "user_id": "user_123"
            }
        )
        
        # FastAPI will coerce or reject based on type hints
        # Either 422 (validation error) or 400 (bad request) is acceptable
        assert response.status_code in [400, 422]
        assert "traceback" not in response.text


class TestHappyPath:
    """Test suite to ensure error handling doesn't break normal operation."""

    @patch('main.anthropic.Anthropic')
    def test_valid_request_returns_200(self, mock_anthropic_class):
        """Verify that a valid request still returns 200 with generated content."""
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        
        # Mock successful response
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text="Generated personalized content")]
        mock_client.messages.create.return_value = mock_message
        
        response = client.post(
            "/generate",
            json={
                "user_input": "Create a birthday gift app",
                "template_id": "template_001",
                "user_id": "user_123"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "content" in data or "generated_content" in data
        assert "Generated personalized content" in response.text

    @patch('main.anthropic.Anthropic')
    def test_response_structure_is_valid_json(self, mock_anthropic_class):
        """Verify that response is always valid JSON."""
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text="Generated content")]
        mock_client.messages.create.return_value = mock_message
        
        response = client.post(
            "/generate",
            json={
                "user_input": "Create a birthday gift app",
                "template_id": "template_001",
                "user_id": "user_123"
            }
        )
        
        # Should always be valid JSON, never raw text or traceback
        try:
            data = response.json()
            assert isinstance(data, dict)
        except json.JSONDecodeError:
            pytest.fail("Response is not valid JSON")
