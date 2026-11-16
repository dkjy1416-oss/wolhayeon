/**
 * GET /api/orders/checkout?order=WH-...&product=message|bundle
 * 11/17: 미리보기 화면 위에서 여는 결제 시트용. 상품을 바꾸면(결제 전 주문만) 서버가 금액을 다시 정하고
 * 결제에 필요한 값만 돌려준다 (개인정보 없음).
 */
import { NextResponse } from "next/server";
import { prepareCheckout } from "@/lib/checkout-state";

export const dynamic = "force-dynamic";

const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const order = sp.get("order") ?? "";
  if (!ORDER_NUMBER_RE.test(order)) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 400 });
  }
  const product = sp.get("product");
  const state = await prepareCheckout(order, product, sp.get("paytest") === "1");
  const code = state.ok ? 200 : state.error === "not_found" ? 404 : 500;
  return NextResponse.json(state, { status: code, headers: { "Cache-Control": "no-store" } });
}
