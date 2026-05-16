import type { AppConfigEnvelope } from "../types";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://127.0.0.1:8000";
const AI_TIMEOUT_MS = 60_000;

export async function generateContent(
  templateSlug: string,
  config: AppConfigEnvelope
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${AI_SERVICE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template_slug: templateSlug,
        user_config:   config,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("AI generation timed out. Check that the AI service is running and Anthropic is responding.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`AI service responded ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.content as Record<string, unknown>;
}
