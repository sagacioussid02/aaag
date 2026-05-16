import { NextResponse } from "next/server";
import { generateContent } from "@/lib/ai/generateContent";
import { createApp, insertAppMedia } from "@/lib/db/apps";
import type { AppConfigEnvelope, GenerateResponse, GenerateError } from "@/lib/types";

export async function POST(req: Request) {
  let config: AppConfigEnvelope;
  let pendingAppId: string | undefined;

  try {
    const body    = await req.json();
    config        = body.user_config  as AppConfigEnvelope;
    pendingAppId  = body.pending_app_id as string | undefined;

    if (!config?._version || !config?.meta?.template_slug) {
      throw new Error("Missing _version or meta.template_slug in user_config");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body";
    return NextResponse.json<GenerateError>({ error: message }, { status: 400 });
  }

  try {
    const templateSlug = config.meta.template_slug;

    // Generate AI content and merge into envelope
    const aiContent   = await generateContent(templateSlug, config);
    const fullConfig: AppConfigEnvelope = { ...config, ai_content: aiContent };

    // Create app — pass pendingAppId so storage paths (apps/{id}/...) stay consistent
    const app = await createApp(fullConfig, pendingAppId);

    // Record media files in app_media table (enables signed-URL refresh job)
    if (Object.keys(fullConfig.media).length > 0) {
      await insertAppMedia(app.id, fullConfig.media);
    }

    return NextResponse.json<GenerateResponse>({ app_id: app.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate]", message);
    return NextResponse.json<GenerateError>({ error: message }, { status: 500 });
  }
}
