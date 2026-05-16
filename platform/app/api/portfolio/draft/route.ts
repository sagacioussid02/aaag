import { NextResponse } from "next/server";
import { createPortfolioDraft } from "@/lib/db/portfolio";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const recipientName = String(body.recipient_name ?? "").trim();
    const buyerEmail = String(body.buyer_email ?? "").trim();
    const giftMode = body.gift_mode === "self" ? "self" : "gift";
    const userId = typeof body.user_id === "string" ? body.user_id : undefined;
    const appId = typeof body.app_id === "string" ? body.app_id : undefined;

    if (!recipientName || !buyerEmail) {
      return NextResponse.json(
        { error: "recipient_name and buyer_email are required" },
        { status: 400 }
      );
    }

    const app = await createPortfolioDraft({
      appId,
      userId,
      buyerEmail,
      recipientName,
      giftMode,
    });

    return NextResponse.json({ app }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Draft creation failed";
    console.error("[portfolio:draft]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
