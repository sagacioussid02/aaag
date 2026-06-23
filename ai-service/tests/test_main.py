import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
import json
from datetime import datetime

# Import the app from main.py
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from main import app, ErrorResponse, GenerateRequest


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def mock_anthropic_client():
    """Mock Anthropic client."""
    with patch('main.client') as mock_client:
        yield mock_client


class TestGenerateEndpoint:
    """Tests for POST /generate endpoint."""

    def test_generate_success(self, client):
        """Test successful content generation."""
        with patch('main.client') as mock_client:
            mock_response = Mock()
            mock_response.content[0].text = "Generated personalized content here."
            mock_client.messages.create.return_value = mock_response

            response = client.post(
                "/generate",
                json={
                    "user_input": "Create a birthday app",
                    "template_context": "birthday"
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert "content" in data
            assert data["content"] == "Generated personalized content here."

    def test_generate_empty_input(self, client):
        """Test generation with empty user input returns 400."""
        response = client.post(
            "/generate",
            json={
                "user_input": "",
                "template_context": "birthday"
            }
        )

        assert response.status_code == 400
        data = response.json()
        assert isinstance(data, dict)
        assert "message" in data or "detail" in data

    def test_generate_missing_input(self, client):
        """Test generation with missing user_input field returns 400."""
        response = client.post(
            "/generate",
            json={
                "template_context": "birthday"
            }
        )

        assert response.status_code == 400

    def test_generate_anthropic_auth_failure(self, client):
        """Test generation when Anthropic API key is invalid returns 401."""
        with patch('main.client') as mock_client:
            from anthropic import AuthenticationError
            mock_client.messages.create.side_effect = AuthenticationError("Invalid API key")

            response = client.post(
                "/generate",
                json={
                    "user_input": "Create a birthday app",
                    "template_context": "birthday"
                }
            )

            assert response.status_code == 401
            data = response.json()
            assert "message" in data
            assert "request_id" in data

    def test_generate_anthropic_rate_limit(self, client):
        """Test generation when rate limit is exceeded returns 429."""
        with patch('main.client') as mock_client:
            from anthropic import RateLimitError
            mock_client.messages.create.side_effect = RateLimitError("Rate limit exceeded")

            response = client.post(
                "/generate",
                json={
                    "user_input": "Create a birthday app",
                    "template_context": "birthday"
                }
            )

            assert response.status_code == 429
            data = response.json()
            assert "message" in data
            assert "request_id" in data

    def test_generate_anthropic_api_error(self, client):
        """Test generation when Anthropic API returns error returns 502."""
        with patch('main.client') as mock_client:
            from anthropic import APIError
            mock_client.messages.create.side_effect = APIError("API error")

            response = client.post(
                "/generate",
                json={
                    "user_input": "Create a birthday app",
                    "template_context": "birthday"
                }
            )

            assert response.status_code == 502
            data = response.json()
            assert "message" in data
            assert "request_id" in data

    def test_generate_malformed_response(self, client):
        """Test generation when Claude response is malformed returns structured error."""
        with patch('main.client') as mock_client:
            # Simulate a response with missing content
            mock_response = Mock()
            mock_response.content = []  # Empty content list
            mock_client.messages.create.return_value = mock_response

            response = client.post(
                "/generate",
                json={
                    "user_input": "Create a birthday app",
                    "template_context": "birthday"
                }
            )

            # Should return 502 or 500 for malformed response
            assert response.status_code in [500, 502]
            data = response.json()
            assert "message" in data
            assert "request_id" in data

    def test_generate_timeout(self, client):
        """Test generation when request times out returns 504."""
        with patch('main.client') as mock_client:
            import asyncio
            mock_client.messages.create.side_effect = asyncio.TimeoutError("Request timeout")

            response = client.post(
                "/generate",
                json={
                    "user_input": "Create a birthday app",
                    "template_context": "birthday"
                }
            )

            # Timeout should map to 504 or 500
            assert response.status_code in [500, 504]
            data = response.json()
            assert "message" in data
            assert "request_id" in data

    def test_generate_client_unavailable(self, client):
        """Test generation when Anthropic client is None returns 503."""
        with patch('main.client', None):
            response = client.post(
                "/generate",
                json={
                    "user_input": "Create a birthday app",
                    "template_context": "birthday"
                }
            )

            assert response.status_code == 503
            data = response.json()
            assert "message" in data


class TestHealthEndpoint:
    """Tests for GET /health endpoint."""

    def test_health_ok(self, client):
        """Test health endpoint returns 200 when service is ready."""
        with patch('main.client') as mock_client:
            mock_client is not None  # Client is available
            response = client.get("/health")

            assert response.status_code == 200
            data = response.json()
            assert "status" in data
            assert data["status"] == "ok"

    def test_health_unavailable(self, client):
        """Test health endpoint returns 503 when Anthropic client is unavailable."""
        with patch('main.client', None):
            response = client.get("/health")

            assert response.status_code == 503
            data = response.json()
            assert "status" in data
            assert data["status"] in ["unavailable", "error"]

    def test_health_anthropic_unreachable(self, client):
        """Test health endpoint returns 503 when Anthropic API is unreachable."""
        with patch('main.client') as mock_client:
            from anthropic import APIConnectionError
            # Simulate a lightweight connectivity check (e.g., list models)
            mock_client.models.list.side_effect = APIConnectionError("Cannot reach Anthropic API")

            response = client.get("/health")

            assert response.status_code == 503
            data = response.json()
            assert "status" in data


class TestErrorResponse:
    """Tests for ErrorResponse structure."""

    def test_error_response_has_request_id(self, client):
        """Test that error responses include a request_id for tracing."""
        with patch('main.client') as mock_client:
            from anthropic import AuthenticationError
            mock_client.messages.create.side_effect = AuthenticationError("Invalid API key")

            response = client.post(
                "/generate",
                json={
                    "user_input": "Create a birthday app",
                    "template_context": "birthday"
                }
            )

            data = response.json()
            assert "request_id" in data
            # request_id should be a valid UUID or string
            assert isinstance(data["request_id"], str)
            assert len(data["request_id"]) > 0

    def test_error_response_has_timestamp(self, client):
        """Test that error responses include a timestamp."""
        with patch('main.client') as mock_client:
            from anthropic import AuthenticationError
            mock_client.messages.create.side_effect = AuthenticationError("Invalid API key")

            response = client.post(
                "/generate",
                json={
                    "user_input": "Create a birthday app",
                    "template_context": "birthday"
                }
            )

            data = response.json()
            assert "timestamp" in data
            # Verify timestamp is ISO format
            try:
                datetime.fromisoformat(data["timestamp"].replace('Z', '+00:00'))
            except ValueError:
                pytest.fail("timestamp is not in ISO format")

    def test_error_response_no_stack_trace(self, client):
        """Test that error responses do not leak stack traces."""
        with patch('main.client') as mock_client:
            from anthropic import APIError
            mock_client.messages.create.side_effect = APIError("Internal server error")

            response = client.post(
                "/generate",
                json={
                    "user_input": "Create a birthday app",
                    "template_context": "birthday"
                }
            )

            data = response.json()
            message = data.get("message", "")
            # Ensure no Python traceback or internal details are exposed
            assert "Traceback" not in message
            assert "File " not in message
            assert "line " not in message
