/**
 * 카톡 분석 패키지(34,900원) → 재회 분석 무료 이용 (서버 전용)
 * /chat/bundle 이 쿠키(wh_cb = 주문번호.토큰)를 심고 /apply 로 보냄 →
 * 신청 후 결제 화면(/apply/complete)에서 이 쿠키가 유효하면 결제 없이 결제 완료 처리 후 결과 생성 화면으로.
 * 재회 주문에는 메시지 기본가(12,900원)를 '패키지 배분 금액'으로 기록하고, 결제수단은 chat_bundle 로 남긴다.
 */
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyChatToken } from "@/lib/chat/auth";
import { getChatOrder, updateChatOrder } from "@/lib/chat/store";
import { RITUAL_PRICE_KRW } from "@/lib/ritual-types";
import { logPayEventServer } from "@/lib/pay-events-server";

export const BUNDLE_COOKIE = "wh_cb";

export async function redeemChatBundle(ritualOrder: string, cookieVal: string | undefined): Promise<string | null> {
  if (!cookieVal) return null;
  const [wc, tok] = cookieVal.split(".");
  if (!wc || !verifyChatToken("bundle", wc, tok)) return null;
  const co = await getChatOrder(wc);
  if (!co || co.product !== "chat_bundle" || co.pay_status !== "paid") return null;
  if (co.bundle_redeemed_order && co.bundle_redeemed_order !== ritualOrder) return null;

  const sb = getSupabaseAdmin();
  const key = `bundle-${wc}`;
  const upd = await sb
    .from("ritual_orders")
    .update({
      payment_status: "paid",
      payment_key: key,
      payment_method: "chat_bundle",
      payment_amount: RITUAL_PRICE_KRW,
      product: "message",
      paid_at: new Date().toISOString(),
    })
    .eq("order_number", ritualOrder)
    .eq("payment_status", "pending")
    .select("id");
  if (upd.error || !upd.data?.length) return null;
  await updateChatOrder(wc, (cur) => ({ ...cur, bundle_redeemed_order: ritualOrder }));
  await logPayEventServer(ritualOrder, "pay_success", "chat_bundle");
  return `/payment/success?paymentKey=${encodeURIComponent(key)}&orderId=${ritualOrder}&amount=${RITUAL_PRICE_KRW}`;
}
