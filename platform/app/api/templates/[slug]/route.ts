import { NextResponse } from "next/server";
import { getTemplate } from "@/lib/db/templates";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: Params) {
  const { slug } = await params;
  const template = await getTemplate(slug);

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
}
