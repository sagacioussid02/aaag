import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from anthropic import APIError, APIConnectionError, APITimeoutError

from ai_service.main import app, WizardInput, sanitize_error_detail

client = TestClient(app)


class TestWizardInputValidation:
    """Test WizardInput Pydantic model validation."""

    def test_valid_input(self):
        """Test that valid input passes validation."""
        data = {
            "template_id": "template_1",
            "user_input": "Create a birthday card",
            "user_name": "Alice",
            "user_email": "alice@example.com"
        }
        request = WizardInput(**data)
        assert request.template_id == "template_1"
        assert request.user_input == "Create a birthday card"
        assert request.user_name == "Alice"
        assert request.user_email == "alice@example.com"

    def test_missing_template_id(self):
        """Test that missing template_id raises validation error."""
        data = {
            "user_input": "Create a birthday card"
        }
        with pytest.raises(ValueError):
            WizardInput(**data)

    def test_missing_user_input(self):
        """Test that missing user_input raises validation error."""
        data = {
            "template_id": "template_1"
        }
        with pytest.raises(ValueError):
            WizardInput(**data)

    def test_empty_template_id(self):
        """Test that empty template_id raises validation error."""
        data = {
            "template_id": "",
            "user_input": "Create a birthday card"
        }
        with pytest.raises(ValueError):
            WizardInput(**data)

    def test_empty_user_input(self):
        """Test that empty user_input raises validation error."""
        data = {
            "template_id": "template_1",
            "user_input": ""
        }
        with pytest.raises(ValueError):
            WizardInput(**data)

    def test_invalid_email(self):
        """Test that invalid email raises validation error."""
        data = {
            "template_id": "template_1",
            "user_input": "Create a birthday card",
            "user_email": "not-an-email"
        }
        with pytest.raises(ValueError):
            WizardInput(**data)

    def test_invalid_customization_type(self):
        """Test that non-dict customization raises validation error."""
        data = {
            "template_id": "template_1",
            "user_input": "Create a birthday card",
            "customization": "not a dict"
        }
        with pytest.raises(ValueError):
            WizardInput(**data)

    def test_valid_customization_dict(self):
        """Test that valid customization dict is accepted."""
        data = {
            "template_id": "template_1",
            "user_input": "Create a birthday card",
            "customization": {"color": "blue", "font": "Arial"}
        }
        request = WizardInput(**data)
        assert request.customization == {"color": "blue", "font": "Arial"}


class TestGenerateEndpoint:
    """Test /generate endpoint."""

    @patch('ai_service.main.client')
    def test_generate_success(self, mock_client):
        """Test successful content generation."""
        # Mock the Anthropic client response
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text="Generated birthday card content")]
        mock_client.messages.create.return_value = mock_message

        payload = {
            "template_id": "birthday_card",
            "user_input": "Make it fun and colorful",
            "user_name": "Bob",
            "user_email": "bob@example.com"
        }
        response = client.post("/generate", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["generated_content"] == "Generated birthday card content"
        assert data["template_id"] == "birthday_card"
        assert data["user_name"] == "Bob"

    @patch('ai_service.main.client')
    def test_generate_with_customization(self, mock_client):
        """Test content generation with customization options."""
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text="Customized content")]
        mock_client.messages.create.return_value = mock_message

        payload = {
            "template_id": "template_1",
            "user_input": "User input",
            "customization": {"theme": "dark", "language": "es"}
        }
        response = client.post("/generate", json=payload)
        
        assert response.status_code == 200
        assert response.json()["generated_content"] == "Customized content"

    def test_generate_missing_template_id(self):
        """Test that missing template_id returns 422 validation error."""
        payload = {
            "user_input": "Make it fun"
        }
        response = client.post("/generate", json=payload)
        
        assert response.status_code == 422

    def test_generate_missing_user_input(self):
        """Test that missing user_input returns 422 validation error."""
        payload = {
            "template_id": "birthday_card"
        }
        response = client.post("/generate", json=payload)
        
        assert response.status_code == 422

    def test_generate_empty_template_id(self):
        """Test that empty template_id returns 422 validation error."""
        payload = {
            "template_id": "",
            "user_input": "Make it fun"
        }
        response = client.post("/generate", json=payload)
        
        assert response.status_code == 422

    def test_generate_empty_user_input(self):
        """Test that empty user_input returns 422 validation error."""
        payload = {
            "template_id": "birthday_card",
            "user_input": ""
        }
        response = client.post("/generate", json=payload)
        
        assert response.status_code == 422

    @patch('ai_service.main.client')
    def test_generate_anthropic_timeout(self, mock_client):
        """Test that Anthropic timeout returns 504 with sanitized error."""
        mock_client.messages.create.side_effect = APITimeoutError(
            "Request timed out after 30s"
        )

        payload = {
            "template_id": "template_1",
            "user_input": "User input"
        }
        response = client.post("/generate", json=payload)
        
        assert response.status_code == 504
        assert "ANTHROPIC_TIMEOUT" in response.headers.get("X-Error-Code", "")
        # Verify error detail is present and sanitized
        assert response.json()["detail"]

    @patch('ai_service.main.client')
    def test_generate_anthropic_connection_error(self, mock_client):
        """Test that Anthropic connection error returns 502 with sanitized error."""
        mock_client.messages.create.side_effect = APIConnectionError(
            "Failed to connect to Anthropic API"
        )

        payload = {
            "template_id": "template_1",
            "user_input": "User input"
        }
        response = client.post("/generate", json=payload)
        
        assert response.status_code == 502
        assert "ANTHROPIC_CONNECTION_ERROR" in response.headers.get("X-Error-Code", "")
        assert response.json()["detail"]

    @patch('ai_service.main.client')
    def test_generate_anthropic_api_error(self, mock_client):
        """Test that Anthropic API error returns 502 with sanitized error."""
        mock_client.messages.create.side_effect = APIError(
            "Invalid API key"
        )

        payload = {
            "template_id": "template_1",
            "user_input": "User input"
        }
        response = client.post("/generate", json=payload)
        
        assert response.status_code == 502
        assert "ANTHROPIC_API_ERROR" in response.headers.get("X-Error-Code", "")
        assert response.json()["detail"]

    @patch('ai_service.main.client')
    def test_generate_invalid_customization_dict(self, mock_client):
        """Test that invalid customization dict returns 422 validation error."""
        payload = {
            "template_id": "template_1",
            "user_input": "User input",
            "customization": "not a dict"
        }
        response = client.post("/generate", json=payload)
        
        assert response.status_code == 422

    @patch('ai_service.main.client')
    def test_generate_regression_unhandled_exception(self, mock_client):
        """Regression test: verify unhandled exception returns structured error, not raw traceback."""
        # Simulate an unexpected error that would have caused an unhandled exception
        mock_client.messages.create.side_effect = Exception(
            "Unexpected error in /path/to/file.py line 42"
        )

        payload = {
            "template_id": "template_1",
            "user_input": "User input"
        }
        response = client.post("/generate", json=payload)
        
        # Should return 500 with structured error, not raw traceback
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
        # Verify no raw traceback is exposed
        assert "Traceback" not in data["detail"]
        assert "File \"" not in data["detail"]
        # Verify sanitization redacted the file path
        assert "[REDACTED_STACK_TRACE]" in data["detail"]


class TestSanitizeErrorDetail:
    """Test error sanitization function."""

    def test_sanitize_api_key(self):
        """Test that API keys are redacted."""
        error = "Error: sk-1234567890abcdefghij failed"
        sanitized = sanitize_error_detail(error)
        assert "sk-" not in sanitized
        assert "[REDACTED_API_KEY]" in sanitized

    def test_sanitize_bearer_token(self):
        """Test that Bearer tokens are redacted."""
        error = "Authorization failed: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        sanitized = sanitize_error_detail(error)
        assert "Bearer" not in sanitized or "[REDACTED_TOKEN]" in sanitized

    def test_sanitize_stack_trace(self):
        """Test that stack traces are redacted."""
        error = 'File "/app/main.py", line 42 in generate()'
        sanitized = sanitize_error_detail(error)
        assert "[REDACTED_STACK_TRACE]" in sanitized

    def test_sanitize_traceback_marker(self):
        """Test that traceback markers are redacted."""
        error = "Traceback (most recent call last): ValueError: invalid input"
        sanitized = sanitize_error_detail(error)
        assert "[REDACTED_TRACEBACK]" in sanitized

    def test_sanitize_preserves_safe_content(self):
        """Test that safe error messages are preserved."""
        error = "Invalid template ID: template_xyz"
        sanitized = sanitize_error_detail(error)
        assert "Invalid template ID" in sanitized
        assert "template_xyz" in sanitized


class TestHealthEndpoint:
    """Test /health endpoint."""

    def test_health_check(self):
        """Test that health endpoint returns 200 OK."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
