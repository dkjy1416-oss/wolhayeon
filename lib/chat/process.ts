/**
 * 카톡 분석 — 결제 승인 + 결과 생성 오케스트레이션 (서버 전용)
 */
import "server-only";
import { Resend } from "resend";
import { confirmTossPayment, getTossPayment } from "@/lib/toss";
import { sendOpsAlert } from "@/lib/ops-alert";
import { sanitizeSiteUrl } from "@/lib/delivery-rules";
import { analyzeChat } from "@/lib/chat/analyze";
import { chatToken } from "@/lib/chat/auth";
import {
  getChatOrder,
  updateChatOrder,
  listChatImages,
  downloadChatImage,
  deleteChatImages,
} from "@/lib/chat/store";
import { CHAT_ORDER_RE, CHAT_PRODUCTS, type ChatOrder } from "@/lib/chat/types";

export type ChatConfirmOutcome =
  | { status: "paid"; orderNumber: string }
  | { status: "invalid" }
  | { status: "failed"; message: string };

export async function confirmChatPayment(p: {
  paymentKey?: string;
  orderId?: string;
  amount?: string;
}): Promise<ChatConfirmOutcome> {
  const orderNumber = typeof p.orderId === "string" && CHAT_ORDER_RE.test(p.orderId) ? p.orderId : null;
  const key = typeof p.paymentKey === "string" && p.paymentKey.length > 0 && p.paymentKey.length <= 200 ? p.paymentKey : null;
  const amount = Number(p.amount);
  if (!orderNumber || !key || !Number.isInteger(amount)) return { status: "invalid" };
  const o = await getChatOrder(orderNumber);
  if (!o) return { status: "invalid" };
  if (o.pay_status === "paid") {
    return o.payment_key === key && o.amount === amount ? { status: "paid", orderNumber } : { status: "invalid" };
  }
  /* 금액은 서버 저장값 기준 — 브라우저가 보낸 금액이 다르면 승인하지 않음 */
  if (amount !== o.amount || amount !== CHAT_PRODUCTS[o.product].price) return { status: "invalid" };

  let method: string | null = null;
  const c = await confirmTossPayment({ paymentKey: key, orderId: orderNumber, amount: o.amount });
  if (c.ok) method = c.method ?? null;
  else {
    /* 이미 승인된 결제(새로고침 등)인지 토스에 다시 확인 */
    const t = await getTossPayment(key);
    if (!(t && t.status === "DONE" && t.orderId === orderNumber && t.totalAmount === o.amount)) {
      return { status: "failed", message: c.message ?? "결제가 완료되지 않았습니다." };
    }
    method = t.method ?? null;
  }
  const saved = await updateChatOrder(orderNumber, (cur) =>
    cur.pay_status === "paid"
      ? null
      : { ...cur, pay_status: "paid", payment_key: key, payment_method: method, paid_at: new Date().toISOString() }
  );
  if (!saved) {
    await sendOpsAlert("payment_error", {
      orderNumber,
      code: "chat_save_failed",
      detail: "카톡 분석 결제는 승인됐지만 주문 저장에 실패했습니다. 관리자 > 카톡 분석에서 확인해 주세요.",
    });
  }
  await notifyOperator(o, method);
  return { status: "paid", orderNumber };
}

async function notifyOperator(o: ChatOrder, method: string | null) {
  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.RESEND_FROM_EMAIL?.trim();
    const to = process.env.OPERATOR_NOTIFY_EMAIL?.trim() || "dkjy1416@naver.com";
    if (!apiKey || !from) return;
    await new Resend(apiKey).emails.send(
      {
        from: `월하연 알림 <${from}>`,
        to,
        subject: `💰 [월하연] 카톡 분석 결제 ${o.amount.toLocaleString()}원 — ${o.name || "(이름 없음)"}님 (${o.order_number})`,
        text: `상품: ${CHAT_PRODUCTS[o.product].name}\n금액: ${o.amount.toLocaleString()}원\n결제수단: ${method ?? "-"}\n관리자: ${(process.env.SITE_URL ?? "").replace(/\/$/, "")}/admin/chat`,
      },
      { idempotencyKey: `op-chat-paid-${o.order_number}` }
    );
  } catch {
    /* 알림 실패는 무시 */
  }
}

export type ChatProcessOutcome =
  | { status: "ready"; resultPath: string }
  | { status: "processing" }
  | { status: "not_paid" }
  | { status: "failed" };

export async function processChatOrder(orderNumber: string): Promise<ChatProcessOutcome> {
  const o = await getChatOrder(orderNumber);
  if (!o || o.pay_status !== "paid") return { status: "not_paid" };
  const path = () => `/chat/result/${orderNumber}?t=${chatToken("result", orderNumber)}`;
  if (o.gen_status === "done" && o.result) return { status: "ready", resultPath: path() };
  if (
    o.gen_status === "generating" &&
    o.gen_started_at &&
    Date.now() - new Date(o.gen_started_at).getTime() < 4 * 60 * 1000
  )
    return { status: "processing" };

  const claimed = await updateChatOrder(orderNumber, (cur) =>
    cur.gen_status === "done" ? null : { ...cur, gen_status: "generating", gen_started_at: new Date().toISOString() }
  );
  if (!claimed || claimed.gen_status !== "generating") return { status: "processing" };

  const paths = await listChatImages(orderNumber);
  const images = (await Promise.all(paths.slice(0, 10).map(downloadChatImage))).filter(
    (x): x is { data: string; type: string } => !!x
  );
  const result = await analyzeChat(claimed, images);
  if (!result) {
    await updateChatOrder(orderNumber, (cur) => ({ ...cur, gen_status: "failed" }));
    await sendOpsAlert("generation_failed", {
      orderNumber,
      code: images.length ? "chat_ai_failed" : "chat_no_images",
      detail: images.length ? "카톡 분석 생성 실패 — 다시 시도 필요" : "결제됐지만 캡처가 없습니다. 손님에게 캡처 재업로드 안내가 필요합니다.",
    });
    return { status: "failed" };
  }
  const token = chatToken("result", orderNumber);
  await updateChatOrder(orderNumber, (cur) => ({ ...cur, gen_status: "done", result, result_token: token }));
  /* 캡처 원본은 분석 직후 삭제 */
  await deleteChatImages(orderNumber);
  await updateChatOrder(orderNumber, (cur) => ({ ...cur, images_deleted_at: new Date().toISOString() }));
  await sendResultEmail(orderNumber);
  return { status: "ready", resultPath: path() };
}

async function sendResultEmail(orderNumber: string) {
  const o = await getChatOrder(orderNumber);
  if (!o || o.email_sent_at) return;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const site = sanitizeSiteUrl(process.env.SITE_URL);
  if (!apiKey || !from || !site) return;
  const url = `${site}/chat/result/${orderNumber}?t=${chatToken("result", orderNumber)}`;
  const name = (o.name || "손님").replace(/[<>&"]/g, "");
  try {
    const r = await new Resend(apiKey).emails.send(
      {
        from: `월하연 月下緣 <${from}>`,
        to: o.email,
        subject: `[월하연] ${name}님의 카톡 대화 분석이 완성됐어요`,
        text: `${name}님,\n\n올려 주신 대화를 읽고 정리한 분석이 완성됐어요.\n아래 링크에서 30일 동안 다시 볼 수 있어요.\n\n${url}\n\n올려 주신 캡처는 분석 직후 삭제했어요.\n\n— 월하연 月下緣`,
        html: `<div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;line-height:1.9;color:#2a2224"><p style="font-size:12px;letter-spacing:.25em;color:#8a6d3b">月下緣 · 월하연</p><p>${name}님,</p><p>올려 주신 대화를 읽고 정리한 분석이 완성됐어요.<br/>아래 버튼에서 30일 동안 다시 볼 수 있어요.</p><p style="text-align:center;margin:28px 0"><a href="${url}" style="display:inline-block;background:#6d1f2c;color:#fff;text-decoration:none;border-radius:999px;padding:14px 28px;font-weight:600">카톡 분석 결과 보기</a></p><p style="font-size:12px;color:#8d8779">올려 주신 캡처는 분석 직후 삭제했어요.</p></div>`,
      },
      { idempotencyKey: `chat-result-${orderNumber}` }
    );
    if (!r.error) await updateChatOrder(orderNumber, (cur) => ({ ...cur, email_sent_at: new Date().toISOString() }));
  } catch {
    /* 메일 실패는 결과 공개를 막지 않음 */
  }
}
