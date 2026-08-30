/**
 * 이메일 발송 순수 규칙 (유닛 테스트 대상 — DB/네트워크 없음).
 * 서버 발송 모듈(lib/result-email.ts)이 이 함수들만 사용해 판정합니다.
 */

export interface OrderForDelivery {
  payment_status: string;
  generation_status: string;
  review_status: string;
  delivery_status: string;
  email: string;
}

export interface ResultForDelivery {
  approved_at: string | null;
  reviewed_content: unknown;
  result_token: string | null;
}

export type EligibilityResult =
  | "ok"
  | "not_paid"
  | "not_generated"
  | "not_approved"
  | "no_approved_at"
  | "no_reviewed_content"
  | "no_token";

/** 발송 가능 조건 — 하나라도 실패하면 메일 발송 금지 */
export function deliveryEligibility(
  order: OrderForDelivery | null,
  result: ResultForDelivery | null
): EligibilityResult | "not_found" {
  if (!order || !result) return "not_found";
  if (order.payment_status !== "paid") return "not_paid";
  if (order.generation_status !== "generated") return "not_generated";
  if (order.review_status !== "approved") return "not_approved";
  if (!result.approved_at) return "no_approved_at";
  if (result.reviewed_content === null || result.reviewed_content === undefined)
    return "no_reviewed_content";
  if (!result.result_token) return "no_token";
  return "ok";
}

/**
 * SITE_URL 검증 + 정리: 반드시 https, 앞뒤 공백/따옴표/끝 슬래시 제거.
 * 유효하지 않으면 null (fail-closed).
 */
export function sanitizeSiteUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  let u = raw.trim().replace(/^["']+|["']+$/g, "").trim();
  u = u.replace(/\/+$/g, "");
  if (!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(u)) return null;
  return u;
}

/** 고객 결과 URL — 반드시 SITE_URL 기반 (vercel.app/orderNumber 금지) */
export function buildResultUrl(siteUrl: string, token: string): string {
  return `${siteUrl}/result/${token}`;
}

/**
 * Resend idempotency key — 같은 승인 결과에는 항상 같은 키.
 * (네트워크 재시도가 중복 메일을 만들지 않도록. 256자 이하)
 */
export function buildIdempotencyKey(
  resultId: string,
  resultVersion: number
): string {
  return `wolhayeon-result/${resultId}/v${resultVersion}`.slice(0, 256);
}

/** Resend 오류 → 관리자용 안전 코드 (원문 메시지·개인정보 저장 금지) */
export function normalizeResendError(statusCode: number | null): string {
  if (statusCode === 429) return "resend_rate_limited";
  if (statusCode === 401 || statusCode === 403) return "resend_unauthorized";
  if (statusCode !== null && statusCode >= 400 && statusCode < 500)
    return "resend_rejected";
  if (statusCode === null) return "delivery_network_error";
  return "delivery_unknown_error";
}
