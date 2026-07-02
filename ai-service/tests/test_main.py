import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from ai_service.main import app, WizardInput

client = TestClient(app)


class TestWizardInputValidation:
    """Test Pydantic model validation for WizardInput."""
    
    def test_valid_input(self):
        """Test that valid input passes validation."""
        data = {
            "template_id": "template-1",
            "user_name": "John Doe",
            "user_email": "john@example.com",
            "customization": {"color": "blue"}
        }
        input_obj = WizardInput(**data)
        assert input_obj.template_id == "template-1"
        assert input_obj.user_name == "John Doe"
        assert input_obj.user_email == "john@example.com"
    
    def test_missing_template_id(self):
        """Test that missing template_id raises validation error."""
        data = {
            "user_name": "John Doe",
            "user_email": "john@example.com"
        }
        with pytest.raises(ValueError):
            WizardInput(**data)
    
    def test_missing_user_name(self):
        """Test that missing user_name raises validation error."""
        data = {
            "template_id": "template-1",
            "user_email": "john@example.com"
        }
        with pytest.raises(ValueError):
            WizardInput(**data)
    
    def test_missing_user_email(self):
        """Test that missing user_email raises validation error."""
        data = {
            "template_id": "template-1",
            "user_name": "John Doe"
        }
        with pytest.raises(ValueError):
            WizardInput(**data)
    
    def test_empty_template_id(self):
        """Test that empty template_id raises validation error."""
        data = {
            "template_id": "",
            "user_name": "John Doe",
            "user_email": "john@example.com"
        }
        with pytest.raises(ValueError):
            WizardInput(**data)
    
    def test_invalid_email(self):
        """Test that invalid email raises validation error."""
        data = {
            "template_id": "template-1",
            "user_name": "John Doe",
            "user_email": "invalid-email"
        }
        with pytest.raises(ValueError):
            WizardInput(**data)


class TestGenerateEndpoint:
    """Test /generate endpoint with various inputs."""
    
    @patch('ai_service.main.client.messages.create')
    def test_generate_valid_input(self, mock_create):
        """Test that valid input returns 200 with generated content."""
        # Mock Anthropic response
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text="Generated content")]
        mock_create.return_value = mock_message
        
        payload = {
            "template_id": "template-1",
            "user_name": "John Doe",
            "user_email": "john@example.com",
            "customization": {"color": "blue"}
        }
        
        response = client.post("/generate", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["content"] == "Generated content"
        assert data["template_id"] == "template-1"
    
    def test_generate_missing_template_id(self):
        """Test that missing template_id returns 422 with structured error."""
        payload = {
            "user_name": "John Doe",
            "user_email": "john@example.com"
        }
        
        response = client.post("/generate", json=payload)
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    def test_generate_missing_user_name(self):
        """Test that missing user_name returns 422 with structured error."""
        payload = {
            "template_id": "template-1",
            "user_email": "john@example.com"
        }
        
        response = client.post("/generate", json=payload)
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    def test_generate_missing_user_email(self):
        """Test that missing user_email returns 422 with structured error."""
        payload = {
            "template_id": "template-1",
            "user_name": "John Doe"
        }
        
        response = client.post("/generate", json=payload)
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    def test_generate_invalid_email(self):
        """Test that invalid email returns 422 with structured error."""
        payload = {
            "template_id": "template-1",
            "user_name": "John Doe",
            "user_email": "invalid-email"
        }
        
        response = client.post("/generate", json=payload)
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    def test_generate_empty_template_id(self):
        """Test that empty template_id returns 422 with structured error."""
        payload = {
            "template_id": "",
            "user_name": "John Doe",
            "user_email": "john@example.com"
        }
        
        response = client.post("/generate", json=payload)
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    def test_generate_malformed_json(self):
        """Test that malformed JSON returns 422 with structured error."""
        response = client.post(
            "/generate",
            content="{invalid json}",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    @patch('ai_service.main.client.messages.create')
    def test_generate_anthropic_error(self, mock_create):
        """Test that Anthropic API error returns 502 with structured error."""
        import anthropic
        mock_create.side_effect = anthropic.APIError("API error")
        
        payload = {
            "template_id": "template-1",
            "user_name": "John Doe",
            "user_email": "john@example.com"
        }
        
        response = client.post("/generate", json=payload)
        
        assert response.status_code == 502
        data = response.json()
        assert "detail" in data
    
    @patch('ai_service.main.client.messages.create')
    def test_generate_empty_response(self, mock_create):
        """Test that empty Anthropic response returns 400 with structured error."""
        mock_message = MagicMock()
        mock_message.content = []
        mock_create.return_value = mock_message
        
        payload = {
            "template_id": "template-1",
            "user_name": "John Doe",
            "user_email": "john@example.com"
        }
        
        response = client.post("/generate", json=payload)
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data


class TestHealthEndpoint:
    """Test /health endpoint."""
    
    def test_health_check(self):
        """Test that health endpoint returns 200 with ok status."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
