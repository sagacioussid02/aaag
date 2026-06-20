import os
import pytest


def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers", "smoke: marks tests as smoke tests requiring live API credentials"
    )


@pytest.fixture(scope="session", autouse=True)
def skip_smoke_tests_without_credentials(request):
    """Skip smoke tests if ANTHROPIC_API_KEY is not available."""
    if "smoke" in request.config.option.markexpr or request.config.option.markexpr is None:
        if not os.getenv("ANTHROPIC_API_KEY"):
            # Mark all smoke tests to be skipped
            for item in request.session.items:
                if "smoke" in item.keywords:
                    item.add_marker(pytest.mark.skip(reason="ANTHROPIC_API_KEY not set"))
