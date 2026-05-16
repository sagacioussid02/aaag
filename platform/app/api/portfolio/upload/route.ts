import { NextResponse } from "next/server";
import { storePortfolioSourceDocument } from "@/lib/db/portfolio";
import { extractPdfText } from "@/lib/pdf/extract";
import { createSignedUrl, uploadFile } from "@/lib/storage";

export const runtime = "nodejs";

const PREVIEW_TTL_SECONDS = 60 * 60;
const MAX_PDF_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const appId = (form.get("app_id") as string | null)?.trim();
  const fieldKey = (form.get("field_key") as string | null)?.trim();
  const file = form.get("file") as File | null;

  if (!appId || !fieldKey || !file) {
    return NextResponse.json(
      { error: "app_id, field_key and file are required" },
      { status: 400 }
    );
  }

  if (fieldKey !== "resume_pdf" && fieldKey !== "cover_letter_pdf") {
    return NextResponse.json({ error: "Unsupported portfolio document field" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF uploads are supported for MVP" }, { status: 422 });
  }

  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF exceeds the 8 MB limit" }, { status: 422 });
  }

  const documentType = fieldKey === "resume_pdf" ? "resume" : "cover_letter";
  const storagePath = `portfolio/${appId}/${fieldKey}/${Date.now()}.pdf`;

  try {
    let extractedText = "";
    let extractionStatus: "extracted" | "failed" = "failed";
    try {
      extractedText = await extractPdfText(file);
      extractionStatus = extractedText ? "extracted" : "failed";
    } catch (err) {
      console.error("[portfolio:upload:extract]", err instanceof Error ? err.message : err);
    }

    await uploadFile(storagePath, file, file.type);
    const publicUrl = await createSignedUrl(storagePath, PREVIEW_TTL_SECONDS);

    const document = await storePortfolioSourceDocument({
      app_id: appId,
      field_key: fieldKey,
      document_type: documentType,
      file_name: file.name,
      storage_path: storagePath,
      public_url: publicUrl,
      mime_type: file.type,
      size_bytes: file.size,
      extraction_status: extractionStatus,
      extracted_text: extractedText,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Portfolio PDF upload failed";
    console.error("[portfolio:upload]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
