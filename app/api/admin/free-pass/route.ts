/**
 * POST /api/admin/free-pass { orderNumber }
 * 11/17 운영자 요청: 관리자로 로그인한 상태면 '내 테스트 주문'을 결제 없이 끝까지(전체 결과) 볼 수 있게.
 * 안전장치
 *  - 관리자 세션 쿠키 필수
 *  - 운영자·테스트 이메일(isOperatorEmail) 주문만 — 손님 주문은 절대 무료 처리하지 않음
 *  - 결제 전(pending) 주문만. 결제수단 admin_free 로 기록(운영 통계에서는 운영자 이메일이라 제외됨)
 * 처리 후 손님 흐름과 같은 결제 완료 화면(/payment/success)으로 보내 결과를 생성·표시한다.
 */
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isOperatorEmail } from "@/lib/admin-util";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isAllowedPrice } from "@/lib/ritual-types";
import { logPayEventServer } from "@/lib/pay-events-server";

export const dynamic = "force-dynamic";

const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const orderNumber = (body as Record<string, unknown>)?.orderNumber;
  if (typeof orderNumber !== "string" || !ORDER_NUMBER_RE.test(orderNumber)) {
    return NextResponse.json({ ok: false, error: "invalid_order_number" }, { status: 400 });
  }
  const sb = getSupabaseAdmin();
  const r = await sb
    .from("ritual_orders")
    .select("payment_status, payment_amount, email")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (r.error || !r.data) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (!isOperatorEmail(r.data.email)) {
    return NextResponse.json({ ok: false, error: "not_operator_order" }, { status: 403 });
  }
  if (r.data.payment_status !== "pending" || !isAllowedPrice(r.data.payment_amount)) {
    return NextResponse.json({ ok: false, error: "not_pending" }, { status: 409 });
  }
  const key = `admin-${orderNumber}`;
  const upd = await sb
    .from("ritual_orders")
    .update({
      payment_status: "paid",
      payment_key: key,
      payment_method: "admin_free",
      paid_at: new Date().toISOString(),
    })
    .eq("order_number", orderNumber)
    .eq("payment_status", "pending")
    .select("id");
  if (upd.error || !upd.data?.length) {
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
  await logPayEventServer(orderNumber, "pay_success", "admin_free");
  return NextResponse.json({
    ok: true,
    redirect: `/payment/success?paymentKey=${encodeURIComponent(key)}&orderId=${orderNumber}&amount=${r.data.payment_amount}`,
  });
}
