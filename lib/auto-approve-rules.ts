/**
 * 자동 승인 판정 규칙 (순수 함수 — DB/네트워크 없음, 유닛 테스트 대상).
 *
 * 원칙
 *  - generated_content(AI 원본)는 절대 덮어쓰지 않음.
 *  - 고객 제공본 reviewed_content 는:
 *      · 이미 있으면(관리자 수정본 포함) 그대로 유지
 *      · 없으면 스키마 검증을 통과한 generated_content 사본
 *  - 이미 승인된 결과는 다시 승인/덮어쓰기하지 않음(already_approved).
 */
import { RitualResultSchema, type RitualResult } from "@/lib/ritual-result-schema";

export interface OrderForAutoApprove {
  payment_status: string;
  generation_status: string;
  review_status: string;
}

export interface ResultForAutoApprove {
  generated_content: unknown;
  reviewed_content: unknown;
  approved_at: string | null;
  result_token: string | null;
}

export type AutoApproveDecision =
  | { kind: "already_approved"; token: string }
  | { kind: "approve"; finalContent: RitualResult; token: string }
  | { kind: "not_paid" }
  | { kind: "not_generated" }
  | { kind: "no_result" }
  | { kind: "no_token" }
  | { kind: "needs_admin" } // 관리자가 수정 필요로 표시한 주문
  | { kind: "invalid_content" };

export function decideAutoApprove(
  order: OrderForAutoApprove | null,
  result: ResultForAutoApprove | null
): AutoApproveDecision {
  if (!order) return { kind: "not_paid" };
  if (order.payment_status !== "paid") return { kind: "not_paid" };
  if (!result) return { kind: "no_result" };
  if (!result.result_token) return { kind: "no_token" };

  /* 이미 승인 완료 — 고객 제공본이 정상이면 그대로 ready */
  if (
    order.review_status === "approved" &&
    result.approved_at &&
    result.reviewed_content !== null &&
    result.reviewed_content !== undefined
  ) {
    return { kind: "already_approved", token: result.result_token };
  }

  if (order.generation_status !== "generated") return { kind: "not_generated" };
  if (order.review_status === "revision_required") return { kind: "needs_admin" };
  if (result.generated_content === null || result.generated_content === undefined)
    return { kind: "no_result" };

  /* 고객 제공본 결정: 기존 reviewed_content(관리자 수정본) 우선, 없으면 AI 원본 사본 */
  const candidate =
    result.reviewed_content !== null && result.reviewed_content !== undefined
      ? result.reviewed_content
      : result.generated_content;

  const parsed = RitualResultSchema.safeParse(candidate);
  if (!parsed.success) return { kind: "invalid_content" };

  return { kind: "approve", finalContent: parsed.data, token: result.result_token };
}
