/**
 * 결제 정보 기반 본인확인 보조 경로 (서버 전용).
 *
 * 보안 원칙:
 * - Toss GET /v1/payments/{paymentKey}는 서버에서만 호출한다.
 * - 카드번호 원문/paymentKey/Toss 응답은 클라이언트로 반환하지 않는다.
 * - 카드번호의 마지막 4자리가 Toss 마스킹 응답에 "4자리 모두" 보이는 경우에만
 *   사용자가 입력한 뒷 4자리와 정확 일치 비교한다.
 * - 일부 자리만 보이는 경우 부분일치로 인증하지 않고 unavailable 처리한다.
 * - 결제수단+시각은 금액이 고정된 서비스에서 인증 강도가 낮으므로
 *   결과 원문/이메일 변경/환불 같은 민감 액션 인증에는 사용하지 않는다.
 */
import "server-only";

export interface PaymentCardInfo {
  cardNumberMasked: string | null;
}

export async function fetchPaymentCardInfo(
  paymentKey: string
): Promise<PaymentCardInfo | null> {
  const secret = process.env.TOSS_SECRET_KEY?.trim();
  if (!secret) return null;

  try {
    const res = await fetch(
      `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;

    const j = (await res.json().catch(() => null)) as {
      card?: { number?: string };
    } | null;

    if (!j) return null;
    return { cardNumberMasked: j.card?.number ?? null };
  } catch {
    return null;
  }
}

export type CardFactorResult =
  | { ok: true }
  | { ok: false; code: "mismatch" | "unavailable" | "bad_input" };

export function compareExactCardLast4(
  masked: string | null,
  userLast4: string
): CardFactorResult {
  if (!/^\d{4}$/.test(userLast4)) {
    return { ok: false, code: "bad_input" };
  }
  if (!masked) return { ok: false, code: "unavailable" };

  const compact = masked.replace(/[^0-9*]/g, "");
  const tail = compact.slice(-4);

  /* 4자리 모두 실제 숫자로 보일 때만 인증에 사용 */
  if (!/^\d{4}$/.test(tail)) {
    return { ok: false, code: "unavailable" };
  }

  return tail === userLast4
    ? { ok: true }
    : { ok: false, code: "mismatch" };
}
