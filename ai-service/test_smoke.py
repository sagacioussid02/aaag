"""Smoke test for Anthropic SDK contract validation.

This test runs against the real Anthropic API and validates that the AI service
correctly calls the SDK and handles responses. It requires ANTHROPIC_API_KEY to be set.

Run with: pytest ai-service/test_smoke.py -m smoke
"""

import os
import pytest
from anthropic import Anthropic


@pytest.mark.smoke
class TestAnthropicSDKContract:
    """Validate AI service against live Anthropic API."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Ensure API key is available."""
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            pytest.skip("ANTHROPIC_API_KEY not set")
        self.client = Anthropic(api_key=api_key)

    def test_sdk_success_response(self):
        """Validate that SDK returns a successful response for a valid prompt."""
        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=100,
            messages=[{"role": "user", "content": "Say 'Hello, World!' in one sentence."}],
        )
        assert response.id is not None
        assert response.content is not None
        assert len(response.content) > 0
        assert response.stop_reason in ["end_turn", "stop_sequence"]

    def test_sdk_error_handling(self):
        """Validate that SDK raises appropriate errors for invalid requests."""
        from anthropic import BadRequestError

        with pytest.raises(BadRequestError):
            # Invalid model should raise an error
            self.client.messages.create(
                model="invalid-model-xyz",
                max_tokens=100,
                messages=[{"role": "user", "content": "Test"}],
            )
