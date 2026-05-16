import db from "./client";
import type { TemplateRecord } from "../types";

export async function getTemplates(): Promise<TemplateRecord[]> {
  return db.select<TemplateRecord>("templates", {
    eq: { active: true },
    order: "is_system.desc,created_at.asc",
  });
}

export async function getTemplate(slug: string): Promise<TemplateRecord | null> {
  const rows = await db.select<TemplateRecord>("templates", {
    eq: { slug, active: true },
    limit: 1,
  });
  return rows[0] ?? null;
}
