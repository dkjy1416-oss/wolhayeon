/**
 * 결제 승인 처리 (서버 전용) — /payment/success 에서 호출.
 *
 * "success URL에 도착했다" ≠ "결제 완료".
 * 반드시 아래 검증을 모두 통과한 뒤 토스 승인 API를 호출하고,
 * 토스 승인이 성공한 경우에만 payment_status를 paid로 바꿉니다.
 *
 * 서버 검증 6단계
 *  1. orderId(주문번호)에 해당하는 주문이 실제 존재하는가
 *  2. 현재 payment_status가 pending인가 (이미 paid면 재승인 금지)
 *  3. DB payment_amount가 정확히 16,900원인가
 *  4. success URL의 amount가 16,900원인가
 *  5. 클라이언트가 보낸 금액이 아닌 DB 금액으로 토스에 승인 요청
 *  6. 같은 paymentKey 재전송/새로고침 → 멱등 처리 (paid면 그대로 성공)
 *
 * 로그에는 secret·paymentKey 전체·개인정보를 남기지 않습니다.
 * (requestId + 결과 코드만)
 */
import "server-only";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { confirmTossPayment } from "@/lib/toss";
import { RITUAL_PRICE_KRW } from "@/lib/ritual-types";

const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

export type PaymentConfirmOutcome =
  | { status: "success"; orderNumber: string }
  | { status: "already_paid"; orderNumber: string }
  | { status: "not_found" }
  | { status: "invalid_request" }
  | { status: "amount_mismatch" }
  | { status: "confirm_failed"; message: string }
  | { status: "server_error" };

export async function confirmOrderPayment(params: {
  paymentKey?: string;
  orderId?: string;
  amount?: string;
}): Promise<PaymentConfirmOutcome> {
  const requestId = randomUUID().slice(0, 8);
  const { paymentKey, orderId, amount } = params;

  /* 파라미터 형식 검증 */
  const orderNumber =
    typeof orderId === "string" && ORDER_NUMBER_RE.test(orderId)
      ? orderId
      : null;
  if (!orderNumber) return { status: "invalid_request" };

  const validKey =
    typeof paymentKey === "string" &&
    paymentKey.length >= 1 &&
    paymentKey.length <= 200;
  const amountNumber = Number(amount);

  try {
    const supabase = getSupabaseAdmin();

    /* 1) 주문 존재 확인 — 개인정보 컬럼은 조회하지 않음 */
    const found = await supabase
      .from("ritual_orders")
      .select("id, payment_amount, payment_status")
      .eq("order_number", orderNumber)
      .single();
    if (found.error || !found.data) return { status: "not_found" };
    const row = found.data;

    /* 2) 이미 paid → 재승인/새로고침/paymentKey 재전송 모두 그대로 성공 (멱등) */
    if (row.payment_status === "paid") {
      return { status: "already_paid", orderNumber };
    }
    if (row.payment_status !== "pending") {
      return { status: "invalid_request" };
    }

    if (!validKey || !Number.isInteger(amountNumber)) {
      return { status: "invalid_request" };
    }

    /* 3) DB 금액 = 16,900원 / 4) URL amount = 16,900원.
       하나라도 다르면 변조 가능성 → 승인 자체를 하지 않음 */
    if (
      row.payment_amount !== RITUAL_PRICE_KRW ||
      amountNumber !== RITUAL_PRICE_KRW ||
      amountNumber !== row.payment_amount
    ) {
      console.error(`[pay:${requestId}] amount_mismatch`);
      return { status: "amount_mismatch" };
    }

    /* 5) 토스 승인 — 금액은 DB 값 사용 */
    const confirm = await confirmTossPayment({
      paymentKey: paymentKey as string,
      orderId: orderNumber,
      amount: row.payment_amount,
    });

    if (!confirm.ok) {
      /* 6) 이미 승인된 결제의 재전송 → 성공 처리 후 DB 상태 보정 */
      if (confirm.code === "ALREADY_PROCESSED_PAYMENT") {
        await supabase
          .from("ritual_orders")
          .update({
            payment_status: "paid",
            payment_key: paymentKey,
            paid_at: new Date().toISOString(),
          })
          .eq("id", row.id)
          .eq("payment_status", "pending");
        return { status: "already_paid", orderNumber };
      }
      console.error(`[pay:${requestId}] confirm_failed code=${confirm.code}`);
      return {
        status: "confirm_failed",
        message:
          confirm.message ??
          "결제 승인에 실패했습니다. 다시 시도하시거나 잠시 후 이용해주세요.",
      };
    }

    /* 승인 성공 후에만 paid 반영 — pending 조건부 갱신이라 동시 요청에도 1회만 */
    const upd = await supabase
      .from("ritual_orders")
      .update({
        payment_status: "paid",
        payment_key: paymentKey,
        payment_method: confirm.method ?? null,
        paid_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("payment_status", "pending");
    if (upd.error) {
      // 승인은 성공했으므로 사용자에게는 성공으로 안내, 내부에만 코드 기록
      console.error(`[pay:${requestId}] db_update_failed code=${upd.error.code}`);
    }

    return { status: "success", orderNumber };
  } catch {
    console.error(`[pay:${requestId}] server_error`);
    return { status: "server_error" };
  }
}
