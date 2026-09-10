/**
 * Toss 결제 취소 (서버 전용) — CS 자동 환불에서만 사용.
 * - Idempotency-Key 필수: 같은 주문의 환불 액션이 여러 번 호출돼도
 *   Toss가 두 번 취소하지 않음. (DB cs_actions.idempotency_key unique로 이중 방어)
 * - TOSS_SECRET_KEY는 서버에서만 사용, 응답의 민감 필드는 반환하지 않음.
 */
import "server-only";

export type CancelResult =
  | { ok: true; alreadyCanceled: boolean }
  | { ok: false; code: string };

export async function cancelTossPayment(
  paymentKey: string,
  cancelReason: string,
  idempotencyKey: string
): Promise<CancelResult> {
  const secret = process.env.TOSS_SECRET_KEY?.trim();
  if (!secret) return { ok: false, code: "no_secret" };
  try {
    const res = await fetch(
      `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ cancelReason }),
      }
    );
    const json = (await res.json().catch(() => null)) as {
      code?: string;
      status?: string;
    } | null;
    if (res.ok) {
      return { ok: true, alreadyCanceled: false };
    }
    /* 이미 취소된 결제 → 성공으로 간주 (중복 취소 없음) */
    if (json?.code === "ALREADY_CANCELED_PAYMENT") {
      return { ok: true, alreadyCanceled: true };
    }
    return { ok: false, code: json?.code ?? `http_${res.status}` };
  } catch {
    return { ok: false, code: "network_error" };
  }
}
