// Supabase Storage REST client — server-side only.
// SUPABASE_SERVICE_ROLE_KEY is never exposed to the browser.

const SUPABASE_URL         = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const BUCKET               = "app-media";

function storageBase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return `${SUPABASE_URL}/storage/v1`;
}

function authHeader() {
  return { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
}

/** Upload a file and return its storage path. */
export async function uploadFile(
  storagePath: string,
  file: Blob,
  contentType: string
): Promise<string> {
  const url = `${storageBase()}/object/${BUCKET}/${storagePath}`;
  const res = await fetch(url, {
    method:  "POST",
    headers: { ...authHeader(), "Content-Type": contentType, "x-upsert": "true" },
    body:    file,
  });
  if (!res.ok) {
    throw new Error(`Storage upload failed (${res.status}): ${await res.text()}`);
  }
  return storagePath;
}

/** Create a signed URL for a stored file. expiresIn is in seconds. */
export async function createSignedUrl(
  storagePath: string,
  expiresIn: number
): Promise<string> {
  const url = `${storageBase()}/object/sign/${BUCKET}/${storagePath}`;
  const res = await fetch(url, {
    method:  "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body:    JSON.stringify({ expiresIn }),
  });
  if (!res.ok) {
    throw new Error(`Signed URL creation failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return `${storageBase()}${data.signedURL}`;
}

/** Delete a stored file. Non-fatal — logs on failure. */
export async function deleteFile(storagePath: string): Promise<void> {
  const url = `${storageBase()}/object/${BUCKET}/${storagePath}`;
  await fetch(url, { method: "DELETE", headers: authHeader() }).catch(console.error);
}
