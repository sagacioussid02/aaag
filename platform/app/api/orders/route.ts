import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/orders
 *
 * Creates an order in the Go backend and returns a Stripe checkout URL.
 * The frontend redirects the user to Stripe to complete payment.
 * After payment, Stripe webhook triggers the generation pipeline.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  const res = await fetch(`${process.env.API_URL}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Forward auth from Supabase session — extract from cookie in production
      Authorization: req.headers.get("Authorization") ?? "",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data.error || "Order failed" }, { status: res.status });
  }

  return NextResponse.json(data);
}
