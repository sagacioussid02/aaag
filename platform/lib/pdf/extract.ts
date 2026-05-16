import { randomUUID } from "crypto";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { spawn } from "child_process";

const MAX_EXTRACTED_CHARS = 80_000;

export async function extractPdfText(file: File): Promise<string> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "aaag-pdf-"));
  const pdfPath = path.join(tempDir, `${randomUUID()}.pdf`);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(pdfPath, buffer);
    const scriptPath = path.join(process.cwd(), "scripts", "extract_pdf_text.py");

    const text = await runPython(scriptPath, pdfPath);
    return text.replace(/\u0000/g, "").trim().slice(0, MAX_EXTRACTED_CHARS);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function runPython(scriptPath: string, pdfPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [scriptPath, pdfPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(stderr.trim() || `PDF extraction failed with exit code ${code}`));
    });
  });
}
