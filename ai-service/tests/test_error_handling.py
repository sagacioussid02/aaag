import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from anthropic import APIError, APITimeoutError, APIConnectionError
from main import app


client = TestClient(app)


class TestValidationErrors:
    """Test validation error handling."""
    
    def test_empty_user_input(self):
        """Test that empty user_input returns 400 validation error."""
        response = client.post(
            "/generate",
            json={
                "user_input": "",
                "template_context": "Test context",
                "template_id": "template-1",
            },
        )
        assert response.status_code == 400
        data = response.json()
        assert data["error"] == "validation_error"
        assert "user_input" in data["message"].lower()
    
    def test_missing_user_input(self):
        """Test that missing user_input returns 400 validation error."""
        response = client.post(
            "/generate",
            json={
                "template_context": "Test context",
                "template_id": "template-1",
            },
        )
        assert response.status_code == 400
        data = response.json()
        assert data["error"] == "validation_error"
    
    def test_empty_template_context(self):
        """Test that empty template_context returns 400 validation error."""
        response = client.post(
            "/generate",
            json={
                "user_input": "Test input",
                "template_context": "",
                "template_id": "template-1",
            },
        )
        assert response.status_code == 400
        data = response.json()
        assert data["error"] == "validation_error"
        assert "template_context" in data["message"].lower()
    
    def test_empty_template_id(self):
        """Test that empty template_id returns 400 validation error."""
        response = client.post(
            "/generate",
            json={
                "user_input": "Test input",
                "template_context": "Test context",
                "template_id": "",
            },
        )
        assert response.status_code == 400
        data = response.json()
        assert data["error"] == "validation_error"
        assert "template_id" in data["message"].lower()


class TestTimeoutErrors:
    """Test timeout error handling."""
    
    @patch("main.client.messages.create")
    def test_api_timeout(self, mock_create):
        """Test that APITimeoutError returns 408 timeout_error."""
        mock_create.side_effect = APITimeoutError("Request timed out")
        
        response = client.post(
            "/generate",
            json={
                "user_input": "Test input",
                "template_context": "Test context",
                "template_id": "template-1",
            },
        )
        assert response.status_code == 408
        data = response.json()
        assert data["error"] == "timeout_error"
        assert "timed out" in data["message"].lower()
        # Ensure no raw traceback is exposed
        assert "Traceback" not in data["message"]
        assert "APITimeoutError" not in data["message"]


class TestAPIErrors:
    """Test API error handling."""
    
    @patch("main.client.messages.create")
    def test_api_error(self, mock_create):
        """Test that APIError returns 502 api_error."""
        mock_create.side_effect = APIError("API error occurred")
        
        response = client.post(
            "/generate",
            json={
                "user_input": "Test input",
                "template_context": "Test context",
                "template_id": "template-1",
            },
        )
        assert response.status_code == 502
        data = response.json()
        assert data["error"] == "api_error"
        assert "error" in data["message"].lower()
        # Ensure no raw traceback is exposed
        assert "Traceback" not in data["message"]
        assert "APIError" not in data["message"]


class TestConnectionErrors:
    """Test connection error handling."""
    
    @patch("main.client.messages.create")
    def test_connection_error(self, mock_create):
        """Test that APIConnectionError returns 503 service_unavailable."""
        mock_create.side_effect = APIConnectionError("Connection failed")
        
        response = client.post(
            "/generate",
            json={
                "user_input": "Test input",
                "template_context": "Test context",
                "template_id": "template-1",
            },
        )
        assert response.status_code == 503
        data = response.json()
        assert data["error"] == "service_unavailable"
        assert "unavailable" in data["message"].lower()
        # Ensure no raw traceback is exposed
        assert "Traceback" not in data["message"]
        assert "APIConnectionError" not in data["message"]


class TestSuccessPath:
    """Test successful content generation."""
    
    @patch("main.client.messages.create")
    def test_successful_generation(self, mock_create):
        """Test that valid input returns 200 with generated content."""
        # Mock the Claude API response
        mock_message = MagicMock()
        mock_message.content = [
            MagicMock(text="Generated personalized content for the user.")
        ]
        mock_create.return_value = mock_message
        
        response = client.post(
            "/generate",
            json={
                "user_input": "Test input",
                "template_context": "Test context",
                "template_id": "template-1",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "Generated personalized content for the user."
        assert data["template_id"] == "template-1"
    
    @patch("main.client.messages.create")
    def test_empty_api_response(self, mock_create):
        """Test that empty Claude response returns 502 api_error."""
        # Mock empty response
        mock_message = MagicMock()
        mock_message.content = []
        mock_create.return_value = mock_message
        
        response = client.post(
            "/generate",
            json={
                "user_input": "Test input",
                "template_context": "Test context",
                "template_id": "template-1",
            },
        )
        assert response.status_code == 502
        data = response.json()
        assert data["error"] == "api_error"
        assert "empty" in data["message"].lower()


class TestHealthCheck:
    """Test health check endpoint."""
    
    def test_health_check(self):
        """Test that /health returns 200 ok."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
