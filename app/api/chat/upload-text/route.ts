/**
 * POST /api/chat/upload-text — 대화 내보내기 파일에서 만든 원문 저장 (결제 전 주문만)
 * body: { order, t, text }  · 상대 이름은 브라우저에서 이미 호칭으로 바꿔서 보냄 · 최대 120KB
 */
import { NextResponse } from "next/server";
import { verifyChatToken } from "@/lib/chat/auth";
import { getChatOrder, saveChatText, updateChatOrder } from "@/lib/chat/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const order = typeof b?.order === "string" ? b.order : "";
  if (!verifyChatToken("order", order, b?.t)) return NextResponse.json({ ok: false }, { status: 401 });
  const text = typeof b?.text === "string" ? b.text.slice(0, 120_000) : "";
  if (text.split("\n").length < 5) return NextResponse.json({ ok: false, message: "대화가 너무 짧아요." }, { status: 400 });
  const o = await getChatOrder(order);
  if (!o || o.pay_status !== "pending") return NextResponse.json({ ok: false }, { status: 409 });
  if (!(await saveChatText(order, text))) return NextResponse.json({ ok: false, message: "저장에 실패했어요." }, { status: 500 });
  await updateChatOrder(order, (cur) => ({ ...cur, source: "file", image_count: 0 }));
  return NextResponse.json({ ok: true, lines: text.split("\n").length });
}
