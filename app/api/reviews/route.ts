/** POST /api/reviews — 결제 고객이 후기 남기기 (후기 링크 토큰 필요, 주문 1건당 1개, 승인 전까지 수정 가능) */
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyReviewToken } from "@/lib/review-auth";

export const dynamic = "force-dynamic";

const ORDER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const o = typeof b.o === "string" ? b.o : "";
  if (!ORDER_RE.test(o) || !verifyReviewToken(o, b.t)) {
    return NextResponse.json({ ok: false, error: "invalid_link" }, { status: 403 });
  }
  const rating = Number(b.rating);
  const body = typeof b.body === "string" ? b.body.trim().replace(/\s+\n/g, "\n") : "";
  const displayName =
    typeof b.name === "string" ? b.name.trim().replace(/[<>]/g, "").slice(0, 12) || null : null;
  const consent = b.consent === true;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, error: "rating" }, { status: 400 });
  }
  if (body.length < 10 || body.length > 600) {
    return NextResponse.json({ ok: false, error: "body_length" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const ord = await supabase
      .from("ritual_orders")
      .select("payment_status, product")
      .eq("order_number", o)
      .maybeSingle();
    if (ord.error || !ord.data || ord.data.payment_status !== "paid") {
      return NextResponse.json({ ok: false, error: "not_paid" }, { status: 403 });
    }
    const prev = await supabase.from("reviews").select("status").eq("order_number", o).maybeSingle();
    if (prev.error) {
      console.error("[review] lookup_failed");
      return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
    }
    if (prev.data && prev.data.status !== "pending") {
      return NextResponse.json({ ok: false, error: "already_reviewed" }, { status: 409 });
    }
    const row = {
      order_number: o,
      product: (ord.data.product as string | null) ?? "message",
      rating,
      body,
      display_name: displayName,
      consent_public: consent,
      status: "pending",
      updated_at: new Date().toISOString(),
    };
    const w = prev.data
      ? await supabase.from("reviews").update(row).eq("order_number", o).eq("status", "pending")
      : await supabase.from("reviews").insert(row);
    if (w.error) {
      console.error("[review] write_failed");
      return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    console.error("[review] server_error");
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
