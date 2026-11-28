/**
 * 11/28: 카톡 분석 리포트 뒤 '월화에게 묻기' (서버 전용)
 * - 무료 1번 + 결제(4,900원)마다 3번 추가
 * - 대화 원문은 분석 직후 지웠으므로, 완성된 리포트 내용만 근거로 답한다
 * - 가벼운 모델(Haiku)로 짧게 — 질문 1번에 약 10~20원
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ALL_CHAT_QUESTIONS } from "@/lib/chat/questions";
import { confirmTossPayment, getTossPayment } from "@/lib/toss";
import { getChatOrder, updateChatOrder } from "@/lib/chat/store";
import { sendOpsAlert } from "@/lib/ops-alert";
import { ASK_FREE, ASK_PACK_COUNT, ASK_PACK_PRICE_KRW, ASK_PAY_RE, PERSONA_TURNS, type ChatAsk, type ChatOrder } from "@/lib/chat/types";

export function askLeft(o: ChatOrder): number {
  return Math.max(0, ASK_FREE + (o.ask_credits ?? 0) - (o.asks?.length ?? 0));
}

const SYSTEM = `당신은 '월하연'의 상담 캐릭터 월화입니다. 손님은 카톡 대화 분석 리포트를 이미 받았고, 그 리포트를 읽은 뒤 궁금한 것을 묻습니다.

규칙
- 반드시 [리포트] 내용과 손님이 알려 준 상황만 근거로 답합니다. 리포트에 없는 대화 내용을 지어내지 않습니다.
- 상대의 마음·연락·재회를 단정하거나 보장하지 않습니다. "~일 가능성이 있어요", "대화에서는 ~로 보여요"처럼 말합니다.
- "재회 성공", "속마음 확인", "100%", 확률 숫자는 쓰지 않습니다.
- 재회를 부추기거나 이별을 강요하지 않습니다. 손님의 존엄과 일상을 지키는 쪽으로 안내합니다.
- 보낼 문장을 묻으면 카톡에 바로 쓸 수 있는 짧은 문장 1~2개를 따옴표로 제안합니다.
- 상대를 몰래 확인·추적하거나 괴롭히는 방법은 돕지 않습니다.
- 손님이 크게 힘들어 보이면 먼저 마음을 살피고, 믿을 수 있는 사람이나 전문가와 이야기해 보길 부드럽게 권합니다.
- 반말 아닌 다정한 존댓말, 4~8문장. 마크다운 기호(#, *, -)는 쓰지 않습니다.`;

function context(o: ChatOrder): string {
  const r = o.result;
  const answers = ALL_CHAT_QUESTIONS.filter((q) => o.answers?.[q.id])
    .map((q) => `- ${q.q} → ${q.options.find((x) => x.v === o.answers[q.id])?.label ?? ""}`)
    .join("\n");
  const report = JSON.stringify(r).slice(0, 9000);
  return `[손님] ${o.name || "손님"} · 상대 호칭: ${o.partner_label || "그 사람"}
${answers ? `[손님이 알려 준 상황]\n${answers}\n` : ""}[리포트]
${report}`;
}

export async function askWolhwa(o: ChatOrder, q: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey || !o.result) return null;
  const client = new Anthropic({ apiKey, maxRetries: 1 });
  const model = process.env.GEN_LIGHT_MODEL?.trim() || "claude-haiku-4-5";
  const prev = (o.asks ?? []).filter((x) => x.kind !== "persona").slice(-3);
  const messages: Anthropic.MessageParam[] = [];
  prev.forEach((x, i) => {
    messages.push({ role: "user", content: i === 0 ? `${context(o)}\n\n[질문]\n${x.q}` : x.q });
    messages.push({ role: "assistant", content: x.a });
  });
  messages.push({ role: "user", content: prev.length ? q : `${context(o)}\n\n[질문]\n${q}` });
  try {
    const msg = await client.messages.create({ model, max_tokens: 900, system: SYSTEM, messages }, { timeout: 45_000 });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .replace(/[#*]/g, "")
      .trim();
    return text || null;
  } catch {
    return null;
  }
}

const PERSONA_SYSTEM = (partner: string) => `지금부터 당신은 '${partner}'의 카톡 말투를 흉내 내는 연습 상대입니다. 손님이 ${partner}에게 보내 보고 싶은 메시지를 보내면, [리포트]에 나온 ${partner}의 대화 습관(답장 길이, 말끝, 이모티콘, 답장 온도, 자주 쓰는 말, 피하는 주제)에 맞춰 ${partner}처럼 카톡 답장을 씁니다.

규칙
- 카톡 답장처럼 짧게. 보통 1~3줄, 리포트에서 단답이 많은 사람이면 더 짧게. 여러 말풍선이면 줄바꿈으로 나눔.
- 리포트에 근거한 말투와 반응만 씁니다. 리포트에 없는 사실(새 약속, 새 사건, 다른 사람)을 지어내지 않습니다.
- 리포트에서 확인되지 않은 고백·재회 약속·확답은 하지 않습니다. 애매하면 ${partner}의 평소 패턴대로 애매하게 답합니다.
- 손님을 비하하거나 상처 주는 말, 성적인 말, 위협은 쓰지 않습니다.
- 손님이 크게 힘들어 보이면 연습을 멈추고 "(월화) 잠깐 쉬어 가요."로 시작해 마음을 살피는 한두 문장을 씁니다.
- 설명·해설·따옴표 없이 답장 문장만 씁니다.`;

/** 그 사람 말투 가상 채팅: 한 세션(질문권 1번) = 최대 PERSONA_TURNS 턴 */
export async function askPersona(o: ChatOrder, msg: string, turns: { me: string; them: string }[]): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey || !o.result) return null;
  const partner = o.partner_label || "그 사람";
  const client = new Anthropic({ apiKey, maxRetries: 1 });
  const model = process.env.GEN_LIGHT_MODEL?.trim() || "claude-haiku-4-5";
  const messages: Anthropic.MessageParam[] = [];
  turns.forEach((t, i) => {
    messages.push({ role: "user", content: i === 0 ? `${context(o)}\n\n[손님이 ${partner}에게 보낸 메시지]\n${t.me}` : t.me });
    messages.push({ role: "assistant", content: t.them });
  });
  messages.push({ role: "user", content: turns.length ? msg : `${context(o)}\n\n[손님이 ${partner}에게 보낸 메시지]\n${msg}` });
  try {
    const r = await client.messages.create({ model, max_tokens: 300, system: PERSONA_SYSTEM(partner), messages }, { timeout: 30_000 });
    const text = r.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .replace(/[#*]/g, "")
      .trim();
    return text || null;
  } catch {
    return null;
  }
}

/** 진행 중인 가상 채팅(턴이 남은 마지막 세션)이 있으면 그 위치 */
export function openPersona(o: ChatOrder): number {
  const asks = o.asks ?? [];
  const i = asks.length - 1;
  return i >= 0 && asks[i].kind === "persona" && (asks[i].turns?.length ?? 0) < PERSONA_TURNS ? i : -1;
}

export async function savePersonaTurn(orderNumber: string, turn: { me: string; them: string }): Promise<ChatOrder | null> {
  return updateChatOrder(orderNumber, (cur) => {
    const asks = [...(cur.asks ?? [])];
    const i = openPersona(cur);
    if (i >= 0) {
      asks[i] = { ...asks[i], turns: [...(asks[i].turns ?? []), turn] };
      return { ...cur, asks };
    }
    if (askLeft(cur) <= 0) return null;
    asks.push({ q: "(그 사람 말투 가상 채팅)", a: "", at: new Date().toISOString(), kind: "persona", turns: [turn] });
    return { ...cur, asks };
  });
}

/** 질문 저장 (남은 횟수를 저장 시점에 다시 확인) */
export async function saveAsk(orderNumber: string, ask: ChatAsk): Promise<ChatOrder | null> {
  return updateChatOrder(orderNumber, (cur) => (askLeft(cur) <= 0 ? null : { ...cur, asks: [...(cur.asks ?? []), ask] }));
}

export function askPayOrderId(o: ChatOrder): string {
  return `${o.order_number}-Q${(o.ask_payments?.length ?? 0) + 1}`;
}

/** 추가 질문 결제 승인 → 질문 3번 추가 (같은 결제는 한 번만) */
export async function confirmAskPayment(p: {
  paymentKey?: string;
  orderId?: string;
  amount?: string;
}): Promise<{ ok: true; orderNumber: string } | { ok: false; message: string }> {
  const m = typeof p.orderId === "string" ? p.orderId.match(ASK_PAY_RE) : null;
  const key = typeof p.paymentKey === "string" && p.paymentKey.length > 0 && p.paymentKey.length <= 200 ? p.paymentKey : null;
  const amount = Number(p.amount);
  if (!m || !key || amount !== ASK_PACK_PRICE_KRW) return { ok: false, message: "결제 정보를 확인할 수 없어요." };
  const orderId = p.orderId as string;
  const orderNumber = m[1];
  const o = await getChatOrder(orderNumber);
  if (!o || o.pay_status !== "paid") return { ok: false, message: "주문을 찾을 수 없어요." };
  if (o.ask_payments?.some((x) => x.payment_key === key)) return { ok: true, orderNumber };

  const c = await confirmTossPayment({ paymentKey: key, orderId, amount });
  if (!c.ok) {
    const t = await getTossPayment(key);
    if (!(t && t.status === "DONE" && t.orderId === orderId && t.totalAmount === amount))
      return { ok: false, message: c.message ?? "결제가 완료되지 않았어요." };
  }
  const saved = await updateChatOrder(orderNumber, (cur) =>
    cur.ask_payments?.some((x) => x.payment_key === key)
      ? null
      : {
          ...cur,
          ask_credits: (cur.ask_credits ?? 0) + ASK_PACK_COUNT,
          ask_payments: [...(cur.ask_payments ?? []), { order_id: orderId, payment_key: key, amount, at: new Date().toISOString() }],
        }
  );
  if (!saved) {
    const again = await getChatOrder(orderNumber);
    if (!again?.ask_payments?.some((x) => x.payment_key === key)) {
      await sendOpsAlert("payment_error", {
        orderNumber,
        code: "chat_ask_save_failed",
        detail: `월화에게 묻기 추가 결제(${orderId})는 승인됐지만 저장에 실패했어요. 질문 ${ASK_PACK_COUNT}번을 직접 추가하거나 환불해 주세요.`,
      }).catch(() => null);
    }
  }
  return { ok: true, orderNumber };
}
