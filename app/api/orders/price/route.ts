/**
 * GET /api/orders/price?order=WH-... — 결제 버튼을 누르기 직전, 화면의 금액이 지금 주문 금액과 같은지 확인용.
 * 개인정보 없음: 결제 상태와 금액만 돌려준다.
 */
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

export async function GET(request: Request) {
  const order = new URL(request.url).searchParams.get("order") ?? "";
  if (!ORDER_NUMBER_RE.test(order)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    const r = await getSupabaseAdmin()
      .from("ritual_orders")
      .select("payment_amount, payment_status")
      .eq("order_number", order)
      .maybeSingle();
    if (r.error || !r.data) return NextResponse.json({ ok: false }, { status: 404 });
    return NextResponse.json(
      { ok: true, amount: r.data.payment_amount, status: r.data.payment_status },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
