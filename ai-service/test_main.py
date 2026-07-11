import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app, WizardInput

client = TestClient(app)


class TestWizardInputValidation:
    """Test WizardInput schema validation."""

    def test_valid_wizard_input(self):
        """Test that valid wizard input passes validation."""
        valid_input = {
            "name": "John Doe",
            "email": "john@example.com",
            "template_id": "template_123",
            "customization": {"color": "blue", "theme": "dark"}
        }
        wizard_input = WizardInput(**valid_input)
        assert wizard_input.name == "John Doe"
        assert wizard_input.email == "john@example.com"

    def test_empty_name_fails_validation(self):
        """Test that empty name fails validation."""
        invalid_input = {
            "name": "",
            "email": "john@example.com",
            "template_id": "template_123",
            "customization": {}
        }
        with pytest.raises(ValueError):
            WizardInput(**invalid_input)

    def test_invalid_email_fails_validation(self):
        """Test that invalid email fails validation."""
        invalid_input = {
            "name": "John Doe",
            "email": "not-an-email",
            "template_id": "template_123",
            "customization": {}
        }
        with pytest.raises(ValueError):
            WizardInput(**invalid_input)

    def test_missing_required_field_fails_validation(self):
        """Test that missing required field fails validation."""
        invalid_input = {
            "name": "John Doe",
            "email": "john@example.com"
            # Missing template_id
        }
        with pytest.raises(ValueError):
            WizardInput(**invalid_input)


class TestGenerateEndpoint:
    """Test /generate endpoint."""

    @pytest.mark.asyncio
    @patch('main.client.messages.create')
    def test_generate_happy_path(self, mock_create):
        """Test successful content generation."""
        mock_create.return_value = MagicMock(
            content=[MagicMock(text="Generated content")]
        )

        payload = {
            "name": "John Doe",
            "email": "john@example.com",
            "template_id": "template_123",
            "customization": {"color": "blue"}
        }
        response = client.post("/generate", json=payload)
        assert response.status_code == 200
        assert "content" in response.json()

    @pytest.mark.asyncio
    @patch('main.client.messages.create')
    def test_generate_anthropic_timeout(self, mock_create):
        """Test that Anthropic timeout returns 504 Gateway Timeout."""
        from anthropic import APITimeoutError
        mock_create.side_effect = APITimeoutError("Request timed out")

        payload = {
            "name": "John Doe",
            "email": "john@example.com",
            "template_id": "template_123",
            "customization": {}
        }
        response = client.post("/generate", json=payload)
        assert response.status_code == 504
        assert "error" in response.json()

    @pytest.mark.asyncio
    @patch('main.client.messages.create')
    def test_generate_anthropic_api_error(self, mock_create):
        """Test that Anthropic API error returns 502 Bad Gateway with structured error."""
        from anthropic import APIError
        mock_create.side_effect = APIError("API error occurred")

        payload = {
            "name": "John Doe",
            "email": "john@example.com",
            "template_id": "template_123",
            "customization": {}
        }
        response = client.post("/generate", json=payload)
        assert response.status_code == 502
        assert "error" in response.json()
        # Confirm no raw traceback is exposed
        assert "Traceback" not in response.text
        assert "File \"" not in response.text

    @pytest.mark.asyncio
    def test_generate_invalid_customization_dict(self):
        """Test that invalid customization dict returns 422 Unprocessable Entity."""
        payload = {
            "name": "John Doe",
            "email": "john@example.com",
            "template_id": "template_123",
            "customization": "not-a-dict"  # Invalid: should be dict
        }
        response = client.post("/generate", json=payload)
        assert response.status_code == 422
        assert "error" in response.json() or "detail" in response.json()

    @pytest.mark.asyncio
    def test_generate_unhandled_exception_regression(self):
        """Regression test: confirm original unhandled exception is now caught.
        
        Original bug: malformed wizard input produced raw Python traceback (500).
        Expected behavior: structured JSON error response (4xx).
        """
        # Simulate malformed input that would have triggered unhandled exception
        payload = {
            "name": "",  # Empty name violates validation
            "email": "john@example.com",
            "template_id": "template_123",
            "customization": {}
        }
        response = client.post("/generate", json=payload)
        # Should return 4xx validation error, not 500 with raw traceback
        assert response.status_code in [400, 422]
        # Confirm response is valid JSON with error field
        assert "error" in response.json() or "detail" in response.json()
        # Confirm no raw Python traceback is exposed
        assert "Traceback" not in response.text
        assert "File \"" not in response.text
        assert "line" not in response.text.lower() or "error" in response.json()
