import anthropic
import os

_client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


async def ask(system_prompt: str, user_prompt: str, max_tokens: int = 4096) -> str:
    """Single-turn Claude call. Returns text content."""
    message = _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return message.content[0].text


async def ask_json(system_prompt: str, user_prompt: str, max_tokens: int = 4096) -> dict:
    """Like ask() but parses the response as JSON. Prompt must instruct Claude to return JSON."""
    import json
    text = await ask(system_prompt, user_prompt + "\n\nRespond with valid JSON only. No markdown, no explanation.", max_tokens)
    # Strip ```json fences if Claude added them despite instruction
    text = text.strip().removeprefix("```json").removesuffix("```").strip()
    return json.loads(text)