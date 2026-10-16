/**
 * GET /api/orders/price?order=WH-... — 결제 버튼을 누르기 직전, 화면의 금액이 지금 주문 금액과 같은지 확인용.
 * 개인정보 없음: 결제 상태와 금액만 돌려준다.
 */
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { firstOfferEndsAt, isFirstOfferActive, isPromoActive, offerAnchor, productPrice, regularPriceFor, isProduct } from "@/lib/ritual-types";

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
      .select("payment_amount, payment_status, product, created_at, remind_sent_at")
      .eq("order_number", order)
      .maybeSingle();
    if (r.error || !r.data) return NextResponse.json({ ok: false }, { status: 404 });
    /* 홈 '사연 이어보기' 카드용 — 개인정보 없이 상태·현재 가격·첫 구매 혜택 마감(서버 기준)만 */
    const product = isProduct(r.data.product) ? r.data.product : "message";
    const anchor = offerAnchor(r.data);
    const pending = r.data.payment_status === "pending";
    const offerOn = pending && product !== "book" && !isPromoActive() && isFirstOfferActive(anchor);
    return NextResponse.json(
      {
        ok: true,
        amount: r.data.payment_amount,
        status: r.data.payment_status,
        product,
        priceNow: pending ? productPrice(product, r.data.payment_amount, Date.now(), anchor) : null,
        regular: regularPriceFor(product),
        offerEndsAt: offerOn ? firstOfferEndsAt(anchor) : null,
        serverNow: Date.now(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
