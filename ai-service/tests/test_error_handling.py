import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from anthropic import APITimeoutError, APIConnectionError, APIError
import json

from main import app

client = TestClient(app)


class TestSuccessfulGeneration:
    """Test successful content generation (happy path)."""
    
    @patch("anthropic.Anthropic.messages.create")
    def test_successful_generation(self, mock_create):
        """Test successful generation returns 200 with content."""
        # Mock successful response
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text="Generated personalized content")]
        mock_create.return_value = mock_message
        
        response = client.post(
            "/generate",
            json={
                "template_id": "template-1",
                "user_input": "Create a birthday app",
                "template_context": "Birthday celebration template",
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["content"] == "Generated personalized content"


class TestTimeoutErrors:
    """Test timeout error handling."""
    
    @patch("anthropic.Anthropic.messages.create")
    def test_timeout_error(self, mock_create):
        """Test timeout returns 504 with structured error."""
        mock_create.side_effect = APITimeoutError("Request timed out")
        
        response = client.post(
            "/generate",
            json={
                "template_id": "template-1",
                "user_input": "Create a birthday app",
                "template_context": "Birthday celebration template",
            },
        )
        
        assert response.status_code == 504
        data = json.loads(response.json()["detail"])
        assert data["status"] == "error"
        assert data["error"] == "Request timeout"
        assert "raw traceback" not in str(data)


class TestConnectionErrors:
    """Test connection error handling."""
    
    @patch("anthropic.Anthropic.messages.create")
    def test_connection_error(self, mock_create):
        """Test connection error returns 503 with structured error."""
        mock_create.side_effect = APIConnectionError("Connection failed")
        
        response = client.post(
            "/generate",
            json={
                "template_id": "template-1",
                "user_input": "Create a birthday app",
                "template_context": "Birthday celebration template",
            },
        )
        
        assert response.status_code == 503
        data = json.loads(response.json()["detail"])
        assert data["status"] == "error"
        assert data["error"] == "Service unavailable"
        assert "raw traceback" not in str(data)


class TestAPIErrors:
    """Test API error handling."""
    
    @patch("anthropic.Anthropic.messages.create")
    def test_api_error(self, mock_create):
        """Test API error returns 502 with structured error."""
        mock_create.side_effect = APIError("API error")
        
        response = client.post(
            "/generate",
            json={
                "template_id": "template-1",
                "user_input": "Create a birthday app",
                "template_context": "Birthday celebration template",
            },
        )
        
        assert response.status_code == 502
        data = json.loads(response.json()["detail"])
        assert data["status"] == "error"
        assert data["error"] == "AI service error"
        assert "raw traceback" not in str(data)


class TestValidationErrors:
    """Test input validation error handling."""
    
    def test_missing_template_id(self):
        """Test missing template_id returns 422."""
        response = client.post(
            "/generate",
            json={
                "user_input": "Create a birthday app",
                "template_context": "Birthday celebration template",
            },
        )
        
        assert response.status_code == 422
    
    def test_missing_user_input(self):
        """Test missing user_input returns 422."""
        response = client.post(
            "/generate",
            json={
                "template_id": "template-1",
                "template_context": "Birthday celebration template",
            },
        )
        
        assert response.status_code == 422
    
    def test_missing_template_context(self):
        """Test missing template_context returns 422."""
        response = client.post(
            "/generate",
            json={
                "template_id": "template-1",
                "user_input": "Create a birthday app",
            },
        )
        
        assert response.status_code == 422
    
    def test_empty_user_input(self):
        """Test empty user_input returns 422 (validation error)."""
        response = client.post(
            "/generate",
            json={
                "template_id": "template-1",
                "user_input": "",
                "template_context": "Birthday celebration template",
            },
        )
        
        assert response.status_code == 422
    
    def test_empty_template_id(self):
        """Test empty template_id returns 422 (validation error)."""
        response = client.post(
            "/generate",
            json={
                "template_id": "",
                "user_input": "Create a birthday app",
                "template_context": "Birthday celebration template",
            },
        )
        
        assert response.status_code == 422
    
    def test_empty_template_context(self):
        """Test empty template_context returns 422 (validation error)."""
        response = client.post(
            "/generate",
            json={
                "template_id": "template-1",
                "user_input": "Create a birthday app",
                "template_context": "",
            },
        )
        
        assert response.status_code == 422
    
    def test_whitespace_only_user_input(self):
        """Test whitespace-only user_input returns 422 (validation error)."""
        response = client.post(
            "/generate",
            json={
                "template_id": "template-1",
                "user_input": "   ",
                "template_context": "Birthday celebration template",
            },
        )
        
        assert response.status_code == 422
    
    def test_whitespace_only_template_id(self):
        """Test whitespace-only template_id returns 422 (validation error)."""
        response = client.post(
            "/generate",
            json={
                "template_id": "   ",
                "user_input": "Create a birthday app",
                "template_context": "Birthday celebration template",
            },
        )
        
        assert response.status_code == 422
    
    def test_whitespace_only_template_context(self):
        """Test whitespace-only template_context returns 422 (validation error)."""
        response = client.post(
            "/generate",
            json={
                "template_id": "template-1",
                "user_input": "Create a birthday app",
                "template_context": "   ",
            },
        )
        
        assert response.status_code == 422


class TestHealthCheck:
    """Test health check endpoint."""
    
    def test_health_check(self):
        """Test health check returns 200."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
