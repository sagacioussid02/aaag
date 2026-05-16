import db from "./client";
import type {
  AppConfigEnvelope,
  AppRecord,
  PortfolioBuild,
  PortfolioBuildLog,
  PortfolioBuildStatus,
  PortfolioConfig,
  PortfolioDeploymentStrategy,
  PortfolioPlan,
  PortfolioPlanType,
  PortfolioSourceDocument,
} from "../types";

export const PORTFOLIO_PLANS: Record<PortfolioPlanType, PortfolioPlan> = {
  free_trial: {
    type: "free_trial",
    label: "Free trial",
    price_label: "$0",
    duration_days: 2,
    deployment_strategy: "shared_template",
    public_deploy: true,
    maintenance_included: false,
    traffic_note: "Public preview for two days.",
  },
  one_time: {
    type: "one_time",
    label: "One-time",
    price_label: "Manual for MVP",
    duration_days: null,
    deployment_strategy: "shared_template",
    public_deploy: true,
    maintenance_included: false,
    traffic_note: "Shared-template public portfolio. Stripe comes later.",
  },
  managed: {
    type: "managed",
    label: "Managed",
    price_label: "Manual for MVP",
    duration_days: null,
    deployment_strategy: "shared_template",
    public_deploy: true,
    maintenance_included: true,
    traffic_note: "Traffic-based maintenance pricing comes later.",
  },
};

type CreatePortfolioDraftInput = {
  appId?: string;
  userId?: string;
  buyerEmail: string;
  recipientName: string;
  giftMode: "gift" | "self";
};

type StoreSourceDocumentInput = Omit<
  PortfolioSourceDocument,
  "id" | "extraction_status" | "created_at"
> & {
  extraction_status?: PortfolioSourceDocument["extraction_status"];
};

type SavePortfolioConfigInput = {
  appId: string;
  config: AppConfigEnvelope;
  publicUrl?: string;
};

type CreateOrderAndBuildInput = {
  appId: string;
  userId?: string;
  templateId?: string;
  selectedPlanType: PortfolioPlanType;
  deploymentStrategy?: PortfolioDeploymentStrategy;
  publicUrl?: string;
};

export type PortfolioBuildWithApp = {
  build: PortfolioBuild;
  app: AppRecord | null;
};

type UpdateBuildInput = {
  buildId: string;
  status: PortfolioBuildStatus;
  publicUrl?: string | null;
  costEstimateCents?: number | null;
  aiCostEstimateCents?: number | null;
  deploymentCostEstimateCents?: number | null;
};

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildPortfolioSubdomain(recipientName: string): string {
  const name = slugify(recipientName) || "portfolio";
  const suffix = Math.random().toString(36).slice(2, 7);
  return `portfolio-${name}-${suffix}`;
}

function normalizeAppRecord(row: Record<string, unknown>): AppRecord {
  return row as unknown as AppRecord;
}

async function getBuildLogs(buildId: string): Promise<PortfolioBuildLog[]> {
  return db.select<PortfolioBuildLog>("app_build_logs", {
    eq: { build_id: buildId },
    order: "created_at.asc",
  });
}

async function hydrateBuild(row: Record<string, unknown>): Promise<PortfolioBuild> {
  const logs = await getBuildLogs(row.id as string);
  return {
    ...(row as unknown as Omit<PortfolioBuild, "logs">),
    logs,
  };
}

export async function createPortfolioDraft(
  input: CreatePortfolioDraftInput
): Promise<AppRecord> {
  const envelope: AppConfigEnvelope = {
    _version: "1",
    meta: {
      template_slug: "portfolio-website",
      app_name: `${input.recipientName}'s Portfolio`,
      theme: "cinematic",
      plan_type: "free_trial",
      buyer_email: input.buyerEmail,
      recipient_name: input.recipientName,
    },
    user_inputs: {
      gift_mode: input.giftMode,
    },
    media: {},
    ai_content: {},
  };

  const payload: Record<string, unknown> = {
    subdomain: buildPortfolioSubdomain(input.recipientName),
    template_slug: "portfolio-website",
    config: envelope,
    status: "generating",
    owner_user_id: input.userId ?? null,
  };

  if (input.appId) payload.id = input.appId;

  const rows = await db.insert<Record<string, unknown>>("apps", payload);
  return normalizeAppRecord(rows[0]);
}

export async function storePortfolioSourceDocument(
  input: StoreSourceDocumentInput
): Promise<PortfolioSourceDocument> {
  const rows = await db.insert<PortfolioSourceDocument>("portfolio_source_documents", {
    app_id: input.app_id,
    field_key: input.field_key,
    document_type: input.document_type,
    file_name: input.file_name,
    storage_path: input.storage_path,
    public_url: input.public_url ?? null,
    mime_type: input.mime_type,
    size_bytes: input.size_bytes,
    extraction_status: input.extraction_status ?? "uploaded",
    extracted_text: input.extracted_text ?? null,
  });

  return rows[0];
}

export async function listPortfolioSourceDocuments(
  appId: string
): Promise<PortfolioSourceDocument[]> {
  return db.select<PortfolioSourceDocument>("portfolio_source_documents", {
    eq: { app_id: appId },
    order: "created_at.asc",
  });
}

export async function savePortfolioConfig(
  input: SavePortfolioConfigInput
): Promise<AppRecord> {
  const rows = await db.update<Record<string, unknown>>(
    "apps",
    { id: input.appId },
    {
      config: input.config,
      public_url: input.publicUrl ?? null,
      updated_at: new Date().toISOString(),
    }
  );

  return normalizeAppRecord(rows[0]);
}

export async function saveGeneratedPortfolioContent(
  appId: string,
  portfolio: PortfolioConfig
): Promise<AppRecord> {
  const existing = await db.select<Record<string, unknown>>("apps", {
    eq: { id: appId },
    limit: 1,
  });

  if (!existing[0]) {
    throw new Error(`Portfolio app ${appId} not found`);
  }

  const current = existing[0].config as AppConfigEnvelope;
  return savePortfolioConfig({
    appId,
    config: {
      ...current,
      ai_content: portfolio as unknown as Record<string, unknown>,
    },
  });
}

export async function createPortfolioOrderAndBuild(
  input: CreateOrderAndBuildInput
): Promise<PortfolioBuild> {
  const selectedPlan = PORTFOLIO_PLANS[input.selectedPlanType];
  const deploymentStrategy = input.deploymentStrategy ?? selectedPlan.deployment_strategy;
  const now = new Date().toISOString();
  const expiresAt = selectedPlan.duration_days
    ? new Date(Date.now() + selectedPlan.duration_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const orderRows = await db.insert<{ id: string }>("orders", {
    user_id: input.userId ?? null,
    template_id: input.templateId ?? null,
    template_slug: "portfolio-website",
    app_id: input.appId,
    plan_type: "spark",
    portfolio_plan_type: selectedPlan.type,
    amount_cents: 0,
    user_config: {},
    status: "pending",
    payment_status: selectedPlan.type === "free_trial" ? "not_required_mvp" : "pending_manual",
    deployment_strategy: deploymentStrategy,
    updated_at: now,
  });

  const buildRows = await db.insert<Record<string, unknown>>("app_builds", {
    app_id: input.appId,
    order_id: orderRows[0].id,
    status: "queued",
    selected_plan: selectedPlan,
    deployment_strategy: deploymentStrategy,
    public_url: input.publicUrl ?? null,
    cost_estimate_cents: 0,
    ai_cost_estimate_cents: null,
    deployment_cost_estimate_cents: 0,
    updated_at: now,
  });

  await appendPortfolioBuildLog({
    buildId: buildRows[0].id as string,
    message: "Portfolio build request created.",
  });

  await db.update("apps", { id: input.appId }, {
    order_id: orderRows[0].id,
    status: "live",
    public_url: input.publicUrl ?? null,
    expires_at: expiresAt,
    updated_at: now,
  });

  const liveBuild = await updatePortfolioBuild({
    buildId: buildRows[0].id as string,
    status: "live",
    publicUrl: input.publicUrl ?? null,
    costEstimateCents: 0,
    deploymentCostEstimateCents: 0,
  });

  await appendPortfolioBuildLog({
    buildId: buildRows[0].id as string,
    message: "Shared-template portfolio is live.",
  });

  return {
    ...liveBuild,
    logs: await getBuildLogs(buildRows[0].id as string),
  };
}

export async function appendPortfolioBuildLog(input: {
  buildId: string;
  message: string;
  level?: PortfolioBuildLog["level"];
}): Promise<PortfolioBuildLog> {
  const rows = await db.insert<PortfolioBuildLog>("app_build_logs", {
    build_id: input.buildId,
    level: input.level ?? "info",
    message: input.message,
  });

  return rows[0];
}

export async function updatePortfolioBuild(
  input: UpdateBuildInput
): Promise<PortfolioBuild> {
  const payload: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  };

  if ("publicUrl" in input) payload.public_url = input.publicUrl;
  if ("costEstimateCents" in input) payload.cost_estimate_cents = input.costEstimateCents;
  if ("aiCostEstimateCents" in input) payload.ai_cost_estimate_cents = input.aiCostEstimateCents;
  if ("deploymentCostEstimateCents" in input) {
    payload.deployment_cost_estimate_cents = input.deploymentCostEstimateCents;
  }

  const rows = await db.update<Record<string, unknown>>(
    "app_builds",
    { id: input.buildId },
    payload
  );

  return hydrateBuild(rows[0]);
}

export async function getPortfolioBuildByAppId(
  appId: string
): Promise<PortfolioBuild | null> {
  const rows = await db.select<Record<string, unknown>>("app_builds", {
    eq: { app_id: appId },
    order: "created_at.desc",
    limit: 1,
  });

  if (!rows[0]) return null;
  return hydrateBuild(rows[0]);
}

export async function getPortfolioApp(appId: string): Promise<AppRecord | null> {
  const rows = await db.select<Record<string, unknown>>("apps", {
    eq: { id: appId },
    limit: 1,
  });

  if (!rows[0]) return null;
  return normalizeAppRecord(rows[0]);
}

export async function listPortfolioBuilds(limit = 12): Promise<PortfolioBuildWithApp[]> {
  const rows = await db.select<Record<string, unknown>>("app_builds", {
    order: "created_at.desc",
    limit,
  });

  const builds = await Promise.all(rows.map((row) => hydrateBuild(row)));
  return Promise.all(builds.map(async (build) => ({
    build,
    app: await getPortfolioApp(build.app_id),
  })));
}
