/**
 * 관리자 검수/승인 서버 판정 규칙 (순수 함수 — 유닛 테스트 대상).
 * 클라이언트가 보낸 상태값은 절대 신뢰하지 않고, 서버가 DB에서
 * 조회한 값만 이 함수들에 전달합니다.
 */

export interface OrderStateForReview {
  payment_status: string;
  generation_status: string;
  review_status: string;
}

export type ApproveGuardResult =
  | "ok"
  | "not_paid"
  | "not_generated"
  | "already_approved"
  | "stale_version";

/** 최종 승인 가능 여부 판정 */
export function approveGuard(
  order: OrderStateForReview,
  latestVersion: number,
  clientVersion: number | null
): ApproveGuardResult {
  if (order.payment_status !== "paid") return "not_paid";
  if (order.generation_status !== "generated") return "not_generated";
  if (order.review_status === "approved") return "already_approved";
  if (clientVersion !== null && clientVersion !== latestVersion)
    return "stale_version";
  return "ok";
}

export type EditGuardResult = "ok" | "already_approved" | "stale_version";

/** 검수 저장 / 수정 필요 처리 가능 여부 판정 */
export function editGuard(
  order: OrderStateForReview,
  latestVersion: number,
  clientVersion: number | null
): EditGuardResult {
  if (order.review_status === "approved") return "already_approved";
  if (clientVersion !== null && clientVersion !== latestVersion)
    return "stale_version";
  return "ok";
}
