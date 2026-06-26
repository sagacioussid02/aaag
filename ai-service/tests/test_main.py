import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app, ErrorResponse


client = TestClient(app)


class TestGenerateEndpoint:
    """Test cases for the /generate endpoint error handling and happy path."""

    def test_generate_success(self):
        """Test successful content generation."""
        with patch('main.client.messages.create') as mock_create:
            mock_create.return_value = MagicMock(
                content=[MagicMock(text='Generated content for the user')]
            )
            response = client.post(
                '/generate',
                json={'user_input': 'Create a birthday app', 'template': 'birthday'}
            )
            assert response.status_code == 200
            assert response.json()['content'] == 'Generated content for the user'

    def test_generate_empty_input(self):
        """Test that empty user input returns 400 Bad Request."""
        response = client.post(
            '/generate',
            json={'user_input': '', 'template': 'birthday'}
        )
        assert response.status_code == 400
        data = response.json()
        assert data['status'] == 400
        assert 'error' in data
        assert 'request_id' in data
        assert 'timestamp' in data

    @pytest.mark.parametrize('status_code,error_type', [
        (401, 'AuthenticationError'),
        (429, 'RateLimitError'),
        (503, 'APIConnectionError'),
        (504, 'APITimeoutError'),
    ])
    def test_generate_api_errors(self, status_code, error_type):
        """Test that Anthropic SDK errors are converted to structured responses."""
        with patch('main.client.messages.create') as mock_create:
            # Simulate Anthropic SDK error
            error_class = type(error_type, (Exception,), {})
            mock_create.side_effect = error_class(f'Mock {error_type}')
            
            response = client.post(
                '/generate',
                json={'user_input': 'Create a birthday app', 'template': 'birthday'}
            )
            assert response.status_code == status_code
            data = response.json()
            assert data['status'] == status_code
            assert 'error' in data
            assert 'request_id' in data
            assert 'timestamp' in data

    def test_generate_malformed_response(self):
        """Test that malformed Claude response is handled gracefully."""
        with patch('main.client.messages.create') as mock_create:
            # Return a response with no content blocks
            mock_create.return_value = MagicMock(content=[])
            response = client.post(
                '/generate',
                json={'user_input': 'Create a birthday app', 'template': 'birthday'}
            )
            assert response.status_code == 502
            data = response.json()
            assert data['status'] == 502
            assert 'error' in data
            assert 'request_id' in data
            assert 'timestamp' in data

    def test_generate_truncated_response(self):
        """Test that truncated Claude response is handled gracefully."""
        with patch('main.client.messages.create') as mock_create:
            # Return a response with stop_reason='max_tokens' (truncated)
            mock_create.return_value = MagicMock(
                content=[MagicMock(text='Incomplete content...')],
                stop_reason='max_tokens'
            )
            response = client.post(
                '/generate',
                json={'user_input': 'Create a birthday app', 'template': 'birthday'}
            )
            # Should still succeed but log a warning
            assert response.status_code == 200
            assert 'content' in response.json()


class TestHealthEndpoint:
    """Test cases for the /health endpoint."""

    def test_health_ok(self):
        """Test that /health returns 200 when Anthropic client is available."""
        with patch('main.client.messages.create') as mock_create:
            mock_create.return_value = MagicMock()
            response = client.get('/health')
            assert response.status_code == 200
            data = response.json()
            assert data['status'] == 'healthy'
            assert 'timestamp' in data

    def test_health_unavailable(self):
        """Test that /health returns 503 when Anthropic client is unavailable."""
        with patch('main.client.messages.create') as mock_create:
            mock_create.side_effect = Exception('Client unavailable')
            response = client.get('/health')
            assert response.status_code == 503
            data = response.json()
            assert data['status'] == 'unavailable'
            assert 'timestamp' in data


class TestErrorResponseStructure:
    """Test that ErrorResponse maintains consistent structure across all error paths."""

    def test_error_response_has_required_fields(self):
        """Verify ErrorResponse includes status, error, request_id, and timestamp."""
        response = client.post(
            '/generate',
            json={'user_input': '', 'template': 'birthday'}
        )
        data = response.json()
        assert 'status' in data
        assert 'error' in data
        assert 'request_id' in data
        assert 'timestamp' in data
        # Verify types
        assert isinstance(data['status'], int)
        assert isinstance(data['error'], str)
        assert isinstance(data['request_id'], str)
        assert isinstance(data['timestamp'], str)
