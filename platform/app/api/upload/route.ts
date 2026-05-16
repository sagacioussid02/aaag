import { NextResponse } from "next/server";
import { getTemplate } from "@/lib/db/templates";
import { uploadFile, createSignedUrl } from "@/lib/storage";
import type { FieldDef, MediaRef } from "@/lib/types";

// Signed URL TTL for wizard preview (1 hour).
// Long-lived URLs are generated at app generation time.
const PREVIEW_TTL_SECONDS = 60 * 60;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const pendingAppId  = (form.get("pending_app_id") as string | null)?.trim();
  const fieldKey      = (form.get("field_key")      as string | null)?.trim();
  const templateSlug  = (form.get("template_slug")  as string | null)?.trim();
  const file          = form.get("file") as File | null;

  if (!pendingAppId || !fieldKey || !templateSlug || !file) {
    return NextResponse.json(
      { error: "pending_app_id, field_key, template_slug and file are required" },
      { status: 400 }
    );
  }

  // ── Load template to validate field constraints ──────────────────────────────
  const template = await getTemplate(templateSlug);
  if (!template) {
    return NextResponse.json({ error: `Unknown template: ${templateSlug}` }, { status: 404 });
  }

  const fieldDef = template.config_schema.steps
    .flatMap((s) => s.fields)
    .find((f): f is FieldDef & { type: "image_upload" } =>
      f.key === fieldKey && f.type === "image_upload"
    );

  if (!fieldDef) {
    return NextResponse.json(
      { error: `Field "${fieldKey}" is not an image_upload field in template "${templateSlug}"` },
      { status: 400 }
    );
  }

  // ── Validate mime type ───────────────────────────────────────────────────────
  const allowed = fieldDef.accept ?? ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json(
      { error: `File type ${file.type} not allowed. Accepted: ${allowed.join(", ")}` },
      { status: 422 }
    );
  }

  // ── Validate file size ───────────────────────────────────────────────────────
  const maxBytes = (fieldDef.max_size_mb ?? 5) * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File exceeds ${fieldDef.max_size_mb ?? 5} MB limit` },
      { status: 422 }
    );
  }

  // ── Build storage path and upload ───────────────────────────────────────────
  const ext         = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const storagePath = `apps/${pendingAppId}/${fieldKey}/${Date.now()}.${ext}`;

  try {
    await uploadFile(storagePath, file, file.type);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[upload]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // ── Generate short-lived signed URL for wizard preview ───────────────────────
  let publicUrl: string;
  try {
    publicUrl = await createSignedUrl(storagePath, PREVIEW_TTL_SECONDS);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signed URL failed";
    console.error("[upload:sign]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const mediaRef: MediaRef = {
    storage_path: storagePath,
    public_url:   publicUrl,
    mime_type:    file.type,
    size_bytes:   file.size,
  };

  return NextResponse.json(mediaRef, { status: 201 });
}
