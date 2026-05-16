import db from "./client";
import type { AppConfigEnvelope, AppRecord, MediaRef } from "../types";

function slugPrefix(templateSlug: string): string {
  const first = templateSlug.split("-")[0];
  return first ?? templateSlug;
}

function makeSubdomain(templateSlug: string, recipientName: string): string {
  const prefix = slugPrefix(templateSlug);
  const name   = recipientName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${name}-${suffix}`;
}

// id is the pre-generated pendingAppId from the wizard (ensures media paths match).
export async function createApp(
  config: AppConfigEnvelope,
  id?: string
): Promise<AppRecord> {
  const subdomain    = makeSubdomain(config.meta.template_slug, config.meta.recipient_name);
  const templateSlug = config.meta.template_slug;

  const payload: Record<string, unknown> = {
    subdomain,
    template_slug: templateSlug,
    config,
    status: "live",
  };

  if (id) payload.id = id;

  const rows = await db.insert<Record<string, unknown>>("apps", payload);

  return normalizeAppRecord(rows[0]);
}

export async function getApp(id: string): Promise<AppRecord | null> {
  const rows = await db.select<Record<string, unknown>>("apps", {
    eq: { id },
    limit: 1,
  });
  if (!rows[0]) return null;
  return normalizeAppRecord(rows[0]);
}

// Insert app_media rows for all uploaded files in the envelope.
// Called after createApp so we have the real app id.
export async function insertAppMedia(
  appId: string,
  media: Record<string, MediaRef | MediaRef[]>
): Promise<void> {
  const rows: Array<{ appId: string; fieldKey: string; storagePath: string; publicUrl: string; mimeType: string; sizeBytes: number; sortOrder: number }> = [];

  for (const [fieldKey, value] of Object.entries(media)) {
    const refs = Array.isArray(value) ? value : [value];
    refs.forEach((ref, i) => {
      rows.push({
        appId,
        fieldKey,
        storagePath: ref.storage_path,
        publicUrl:   ref.public_url,
        mimeType:    ref.mime_type,
        sizeBytes:   ref.size_bytes,
        sortOrder:   i,
      });
    });
  }

  if (rows.length === 0) return;

  // Insert all rows in a single statement
  await db.insert("app_media", rows.map((r) => ({
    app_id:       r.appId,
    field_key:    r.fieldKey,
    storage_path: r.storagePath,
    public_url:   r.publicUrl,
    mime_type:    r.mimeType,
    size_bytes:   r.sizeBytes,
    sort_order:   r.sortOrder,
  })), { returning: false });
}

function normalizeAppRecord(row: Record<string, unknown>): AppRecord {
  const config = row.config as Record<string, unknown>;

  if (config._version === "1") {
    return row as unknown as AppRecord;
  }

  // Legacy flat record (pre-envelope) — wrap so old apps stay viewable
  const wrapped: AppConfigEnvelope = {
    _version: "1",
    meta: {
      template_slug:  (row.template_slug as string | undefined) ?? "recipe-app",
      app_name:       (config.recipient_name as string | undefined) ?? "",
      theme:          (config.theme          as string | undefined) ?? "Warm Rose",
      plan_type:      (config.plan_type      as string | undefined) ?? "spark",
      buyer_email:    (config.buyer_email    as string | undefined) ?? "",
      recipient_name: (config.recipient_name as string | undefined) ?? "",
    },
    user_inputs: config as Record<string, string | string[] | number | boolean>,
    media:       {},
    ai_content:  (row.ai_content as Record<string, unknown>) ?? {},
  };

  return { ...(row as unknown as AppRecord), config: wrapped };
}
