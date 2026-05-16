import { NextResponse } from "next/server";
import { generateContent } from "@/lib/ai/generateContent";
import {
  listPortfolioSourceDocuments,
  saveGeneratedPortfolioContent,
} from "@/lib/db/portfolio";
import type { AppConfigEnvelope, PortfolioConfig } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const appId = String(body.app_id ?? "").trim();
    const userConfig = body.user_config as AppConfigEnvelope | undefined;

    if (!appId || !userConfig?._version || userConfig.meta?.template_slug !== "portfolio-website") {
      return NextResponse.json(
        { error: "app_id and portfolio user_config are required" },
        { status: 400 }
      );
    }

    const sourceDocuments = await listPortfolioSourceDocuments(appId);
    const generationConfig = {
      ...userConfig,
      source_documents: sourceDocuments,
    };

    const portfolio = await generateContent(
      "portfolio-website",
      generationConfig
    ) as PortfolioConfig;

    const app = await saveGeneratedPortfolioContent(appId, portfolio);

    return NextResponse.json({ app, portfolio });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Portfolio generation failed";
    console.error("[portfolio:generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
