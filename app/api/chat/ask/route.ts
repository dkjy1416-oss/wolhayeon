/**
 * POST /api/chat/ask — 11/28 리포트 뒤 '월화에게 묻기'
 * body: { order, t (결과 토큰), q }
 */
import { NextResponse } from "next/server";
import { verifyChatToken } from "@/lib/chat/auth";
import { getChatOrder } from "@/lib/chat/store";
import { askLeft, askPersona, askWolhwa, openPersona, saveAsk, savePersonaTurn } from "@/lib/chat/ask";
import { CHAT_ORDER_RE } from "@/lib/chat/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as { order?: unknown; t?: unknown; q?: unknown; mode?: unknown } | null;
  const order = typeof b?.order === "string" && CHAT_ORDER_RE.test(b.order) ? b.order : null;
  const q = typeof b?.q === "string" ? b.q.replace(/\s+/g, " ").trim().slice(0, 300) : "";
  if (!order || !verifyChatToken("result", order, b?.t)) return NextResponse.json({ ok: false, message: "링크를 확인해 주세요." }, { status: 403 });
  if (q.length < 4) return NextResponse.json({ ok: false, message: "질문을 조금 더 자세히 적어 주세요." }, { status: 400 });
  const o = await getChatOrder(order);
  if (!o || o.pay_status !== "paid" || !o.result) return NextResponse.json({ ok: false, message: "리포트를 찾을 수 없어요." }, { status: 404 });
  /* 11/28: 그 사람 말투 가상 채팅 — 질문권 1번으로 6턴 */
  if (b?.mode === "persona") {
    const pi = openPersona(o);
    if (pi < 0 && askLeft(o) <= 0) return NextResponse.json({ ok: false, left: 0, message: "남은 질문이 없어요." }, { status: 402 });
    const turns = pi >= 0 ? o.asks?.[pi]?.turns ?? [] : [];
    const them = await askPersona(o, q, turns);
    if (!them) return NextResponse.json({ ok: false, message: "답장을 만들지 못했어요. 잠시 후 다시 보내 주세요. (횟수는 줄지 않았어요)" }, { status: 503 });
    const saved = await savePersonaTurn(order, { me: q, them });
    if (!saved) return NextResponse.json({ ok: false, left: 0, message: "남은 질문이 없어요." }, { status: 402 });
    const cur = saved.asks?.[saved.asks.length - 1];
    return NextResponse.json({ ok: true, them, left: askLeft(saved), turnsLeft: Math.max(0, 6 - (cur?.turns?.length ?? 0)) });
  }
  if (askLeft(o) <= 0) return NextResponse.json({ ok: false, left: 0, message: "남은 질문이 없어요." }, { status: 402 });
  const a = await askWolhwa(o, q);
  if (!a) return NextResponse.json({ ok: false, message: "월화가 답을 쓰지 못했어요. 잠시 후 다시 물어봐 주세요. (횟수는 줄지 않았어요)" }, { status: 503 });
  const saved = await saveAsk(order, { q, a, at: new Date().toISOString() });
  if (!saved) return NextResponse.json({ ok: false, left: 0, message: "남은 질문이 없어요." }, { status: 402 });
  return NextResponse.json({ ok: true, a, left: askLeft(saved) });
}
