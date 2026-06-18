"""Smoke test for AI service Anthropic SDK contract validation.

This test validates the full request/response cycle and can be wired into
the CI pipeline to verify Anthropic SDK contract compliance.
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app
import anthropic

client = TestClient(app)


class TestAIServiceSmoke:
    """Smoke tests for CI integration."""
    
    @patch('main.client.messages.create')
    def test_full_success_flow(self, mock_create):
        """Test full success flow: request validation → API call → response formatting."""
        # Mock successful API response
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="This is a generated response.")]
        mock_response.stop_reason = "end_turn"
        mock_response.usage = MagicMock(input_tokens=15, output_tokens=25)
        mock_create.return_value = mock_response
        
        # Make request
        response = client.post(
            "/generate",
            json={
                "prompt": "Generate a product description for a personalized gift app.",
                "max_tokens": 2048
            }
        )
        
        # Validate complete flow
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure matches contract
        assert "content" in data
        assert "stop_reason" in data
        assert "usage" in data
        assert "input_tokens" in data["usage"]
        assert "output_tokens" in data["usage"]
        
        # Verify content is not empty
        assert len(data["content"]) > 0
        assert data["content"] == "This is a generated response."
        
        # Verify SDK was called with correct parameters
        mock_create.assert_called_once()
        call_kwargs = mock_create.call_args[1]
        assert call_kwargs["model"] == "claude-3-5-sonnet-20241022"
        assert call_kwargs["max_tokens"] == 2048
        assert "Generate a product description" in call_kwargs["messages"][0]["content"]
    
    @patch('main.client.messages.create')
    def test_error_propagation_flow(self, mock_create):
        """Test that errors are properly caught and propagated to caller."""
        # Simulate API error
        mock_create.side_effect = anthropic.APIStatusError(
            "Service unavailable",
            response=MagicMock(status_code=503),
            body={}
        )
        
        # Make request
        response = client.post(
            "/generate",
            json={"prompt": "Test prompt", "max_tokens": 1024}
        )
        
        # Verify error is propagated
        assert response.status_code == 503
        data = response.json()
        assert "detail" in data
        assert len(data["detail"]) > 0
    
    @patch('main.client.messages.create')
    def test_validation_error_flow(self, mock_create):
        """Test that validation errors are caught before API call."""
        # Make request with invalid data
        response = client.post(
            "/generate",
            json={"prompt": "", "max_tokens": 1024}
        )
        
        # Verify validation error
        assert response.status_code == 400
        
        # Verify API was never called
        mock_create.assert_not_called()
    
    def test_health_endpoint_available(self):
        """Test that health endpoint is available for CI checks."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
    
    @patch('main.client.messages.create')
    def test_concurrent_requests_handling(self, mock_create):
        """Test that service can handle multiple concurrent requests."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="Response")]
        mock_response.stop_reason = "end_turn"
        mock_response.usage = MagicMock(input_tokens=5, output_tokens=10)
        mock_create.return_value = mock_response
        
        # Make multiple requests
        for i in range(3):
            response = client.post(
                "/generate",
                json={"prompt": f"Request {i}", "max_tokens": 1024}
            )
            assert response.status_code == 200
        
        # Verify all requests were processed
        assert mock_create.call_count == 3
