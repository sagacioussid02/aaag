import { NextResponse } from "next/server";
import {
  createPortfolioOrderAndBuild,
  savePortfolioConfig,
} from "@/lib/db/portfolio";
import type {
  AppConfigEnvelope,
  PortfolioConfig,
  PortfolioPlanType,
} from "@/lib/types";

function publicUrl(req: Request, appId: string) {
  const url = new URL(req.url);
  return `${url.origin}/apps/${appId}`;
}

function isPlan(value: unknown): value is PortfolioPlanType {
  return value === "free_trial" || value === "one_time" || value === "managed";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const appId = String(body.app_id ?? "").trim();
    const selectedPlanType = body.selected_plan_type;
    const config = body.user_config as AppConfigEnvelope | undefined;
    const portfolio = body.portfolio as PortfolioConfig | undefined;

    if (!appId || !isPlan(selectedPlanType) || !config?._version) {
      return NextResponse.json(
        { error: "app_id, selected_plan_type and user_config are required" },
        { status: 400 }
      );
    }

    const fullConfig: AppConfigEnvelope = {
      ...config,
      meta: {
        ...config.meta,
        plan_type: selectedPlanType,
      },
      user_inputs: {
        ...config.user_inputs,
        selected_plan: selectedPlanType,
        deployment_strategy: "shared_template",
      },
      ai_content: (portfolio ?? config.ai_content) as unknown as Record<string, unknown>,
    };

    const url = publicUrl(req, appId);
    await savePortfolioConfig({ appId, config: fullConfig, publicUrl: url });

    const build = await createPortfolioOrderAndBuild({
      appId,
      selectedPlanType,
      deploymentStrategy: "shared_template",
      publicUrl: url,
    });

    return NextResponse.json({
      build,
      public_url: url,
      status_url: `/apps/${appId}/status`,
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Portfolio order failed";
    console.error("[portfolio:order]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
