/**
 * 고객 결과 공개 여부 판정 (순수 함수 — 유닛 테스트 대상).
 *
 * 아래 조건을 하나라도 만족하지 않으면 결과를 절대 반환하지 않으며,
 * 실패 사유(토큰 없음/승인 전/미결제 등)는 외부에 구분해 주지 않습니다.
 */

/** result_token 형식: gen_random_bytes(24) hex = 48자 소문자 hex */
export const RESULT_TOKEN_RE = /^[0-9a-f]{48}$/;

export interface ResultRowForAccess {
  approved_at: string | null;
  reviewed_content: unknown;
}

export interface OrderRowForAccess {
  payment_status: string;
  generation_status: string;
  review_status: string;
}

export function canShowResult(
  result: ResultRowForAccess | null,
  order: OrderRowForAccess | null
): boolean {
  if (!result || !order) return false;
  if (!result.approved_at) return false;
  if (
    result.reviewed_content === null ||
    result.reviewed_content === undefined
  )
    return false;
  if (order.payment_status !== "paid") return false;
  if (order.generation_status !== "generated") return false;
  if (order.review_status !== "approved") return false;
  return true;
}
