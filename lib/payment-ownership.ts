/**
 * 이미 결제(paid)된 주문에 대한 "결제 소유 증명" 판정 (순수 함수).
 *
 * success URL 재접근 시 orderId만으로는 절대 통과시키지 않고,
 * 실제 결제 리다이렉트에만 존재하는 paymentKey + amount 가
 * DB에 저장된 값과 정확히 일치해야만 already_paid 를 인정합니다.
 * (paymentKey 비교는 timing-safe)
 */
import { createHash, timingSafeEqual } from "crypto";

export interface PaidOwnershipInput {
  dbPaymentKey: string | null | undefined;
  dbAmount: number;
  expectedAmount: number;
  paymentKey: unknown;
  amount: unknown;
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function verifyPaidOwnership(input: PaidOwnershipInput): boolean {
  const { dbPaymentKey, dbAmount, expectedAmount, paymentKey, amount } = input;
  if (
    typeof paymentKey !== "string" ||
    paymentKey.length < 1 ||
    paymentKey.length > 200
  )
    return false;
  const amountNumber = Number(amount);
  if (!Number.isInteger(amountNumber)) return false;
  if (amountNumber !== dbAmount) return false;
  if (amountNumber !== expectedAmount) return false;
  if (!dbPaymentKey) return false;
  return safeEqual(paymentKey, dbPaymentKey);
}
