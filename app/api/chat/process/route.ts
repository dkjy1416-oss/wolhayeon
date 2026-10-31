/**
 * POST /api/chat/process — 결제 완료 주문의 분석 생성/상태 확인
 * body: { orderNumber, t }  (t = 주문 토큰)
 */
import { NextResponse } from "next/server";
import { verifyChatToken } from "@/lib/chat/auth";
import { processChatOrder } from "@/lib/chat/process";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const order = typeof b?.orderNumber === "string" ? b.orderNumber : "";
  if (!verifyChatToken("order", order, b?.t)) return NextResponse.json({ ok: false }, { status: 401 });
  const r = await processChatOrder(order);
  return NextResponse.json({ ok: r.status !== "failed" && r.status !== "not_paid", ...r });
}
