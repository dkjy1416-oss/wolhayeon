/**
 * POST /api/admin/chat/credits — 관리자: 카톡 분석 주문에 '월화에게 묻기' 횟수 3번 추가 (테스트·보상용, 결제 없음)
 * form: orderNumber
 */
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { updateChatOrder } from "@/lib/chat/store";
import { ASK_PACK_COUNT, CHAT_ORDER_RE } from "@/lib/chat/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 });
  const f = await request.formData().catch(() => null);
  const on = String(f?.get("orderNumber") ?? "");
  if (!CHAT_ORDER_RE.test(on)) return NextResponse.json({ ok: false }, { status: 400 });
  await updateChatOrder(on, (cur) => ({
    ...cur,
    ask_credits: (cur.ask_credits ?? 0) + ASK_PACK_COUNT,
    ask_payments: [...(cur.ask_payments ?? []), { order_id: `${on}-ADMIN`, payment_key: `admin-${Date.now()}`, amount: 0, at: new Date().toISOString() }],
  }));
  return NextResponse.redirect(new URL(`/admin/chat?credited=${on}`, request.url), 303);
}
