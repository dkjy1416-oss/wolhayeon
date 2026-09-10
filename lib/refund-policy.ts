/**
 * 환불정책 단일 소스.
 *
 * - /refund 공개 페이지, AI CS 안내, RefundPolicyEngine이 전부 이 파일 하나만
 *   사용한다 (세 곳 하드코딩 금지).
 * - AI는 환불 여부를 판단하지 않는다: evaluateRefund()의 deterministic 결과
 *   (eligible + reason_code)만 자연어로 설명한다.
 * - 열람 판단은 이메일 오픈 트래킹이 아니라 서버가 기록한 결과 페이지
 *   실제 열람(result_open_count / result_first_opened_at)을 주 자료로 쓴다.
 *
 * ⚠️ 이 정책 문구는 기존 사이트에 공개 환불정책이 없어(footer 링크 미연결)
 *   전자상거래법 청약철회 기준(디지털 콘텐츠 제공 개시 전 7일)을 바탕으로
 *   새로 작성한 초안입니다 — 운영자 확인 후 문구를 확정하세요.
 *   법정 기준보다 고객에게 불리한 임의 조건은 넣지 않았습니다.
 */
import type { RitualOrderRow } from "@/lib/supabase/types";

export const REFUND_WINDOW_DAYS = 7;

/** /refund 페이지와 챗봇 정책 안내가 공유하는 공개 문구 */
export const REFUND_POLICY_SECTIONS: Array<{ title: string; body: string }> = [
  {
    title: "1. 전액 자동 환불이 가능한 경우",
    body: `· 결제 후 전체 결과를 아직 열람하지 않은 경우, 결제일로부터 ${REFUND_WINDOW_DAYS}일 이내에 전액 환불됩니다.
· 동일한 신청에 대해 결제가 중복으로 승인된 경우, 중복 결제 건은 기간과 무관하게 전액 취소됩니다.
· 시스템 오류로 전체 결과가 끝내 제공되지 못한 경우, 열람 전이라면 기간과 무관하게 전액 환불됩니다.`,
  },
  {
    title: "2. 환불이 어려운 경우",
    body: `· 전체 결과 페이지를 이미 열람하신 경우에는, 1회성 맞춤 제작 디지털 콘텐츠의 특성상(전자상거래법 제17조제2항제5호) 단순 변심에 의한 환불이 제한됩니다.
· 결과 열람 여부는 이메일 수신이 아니라, 결과 페이지가 실제로 열린 서버 기록을 기준으로 판단합니다.`,
  },
  {
    title: "3. 표시·광고 또는 계약 내용과 다르게 제공된 경우",
    body: `· 결과가 표시·광고의 내용과 다르거나 계약 내용과 다르게 제공된 경우에는 전자상거래법 제17조제3항에 따른 별도의 청약철회 권리가 적용될 수 있습니다.
· 빈 결과, 다른 사람의 정보가 섞인 결과 등 객관적으로 확인 가능한 제공 오류는 자동 시스템이 주문 상태를 확인해 처리합니다.`,
  },
  {
    title: "4. 환불 처리 방식",
    body: `· 환불은 상담원 승인 없이, 위 기준에 따라 자동으로 판정·처리됩니다.
· 환불이 승인되면 결제하신 수단으로 즉시 취소 요청되며, 월하연은 취소 요청을 즉시 처리하며, 카드사·결제수단 화면에 반영되는 시점은 각 결제수단의 처리 일정에 따라 달라질 수 있습니다.
· 환불 관련 문의는 사이트의 "월화에게 물어보기"에서 본인확인 후 바로 확인·처리하실 수 있습니다.`,
  },
];

export type RefundReasonCode =
  | "BEFORE_RESULT_ACCESS" // 열람 전 + 기간 내 → 환불 가능
  | "DUPLICATE_PAYMENT" // 중복 결제 → 환불 가능
  | "SERVICE_NOT_DELIVERED" // 생성 실패 지속 + 미열람 → 환불 가능
  | "DIGITAL_CONTENT_ACCESSED" // 결과 열람됨 → 불가
  | "REFUND_WINDOW_EXPIRED" // 미열람이지만 기간 경과 → 불가
  | "ALREADY_REFUNDED" // 이미 환불됨
  | "NOT_PAID"; // 결제 이력 없음

export interface RefundEvaluation {
  eligible: boolean;
  reason_code: RefundReasonCode;
}

/**
 * Deterministic 환불 판정 엔진 — 위 공개 정책과 1:1 대응.
 * @param isDuplicatePayment 서버가 조회한 "같은 사람의 더 이른 정상 결제 존재" 여부
 */
export function evaluateRefund(
  order: Pick<
    RitualOrderRow,
    "payment_status" | "paid_at" | "generation_status"
  > & {
    result_open_count?: number | null;
    refunded_at?: string | null;
  },
  opts: { isDuplicatePayment?: boolean } = {}
): RefundEvaluation {
  if (order.payment_status === "refunded" || order.refunded_at) {
    return { eligible: false, reason_code: "ALREADY_REFUNDED" };
  }
  if (order.payment_status !== "paid") {
    return { eligible: false, reason_code: "NOT_PAID" };
  }
  if (opts.isDuplicatePayment) {
    return { eligible: true, reason_code: "DUPLICATE_PAYMENT" };
  }
  const opened = (order.result_open_count ?? 0) > 0;
  if (opened) {
    return { eligible: false, reason_code: "DIGITAL_CONTENT_ACCESSED" };
  }
  /* 미열람 + 생성이 끝내 실패 상태면 기간 무관 환불 */
  if (order.generation_status === "failed") {
    return { eligible: true, reason_code: "SERVICE_NOT_DELIVERED" };
  }
  const paidAt = order.paid_at ? Date.parse(order.paid_at) : NaN;
  const withinWindow =
    Number.isFinite(paidAt) &&
    Date.now() - paidAt <= REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  if (withinWindow) {
    return { eligible: true, reason_code: "BEFORE_RESULT_ACCESS" };
  }
  return { eligible: false, reason_code: "REFUND_WINDOW_EXPIRED" };
}

/** AI/화면이 사용하는 한국어 설명 (정책 문구와 일치) */
export function refundReasonMessage(code: RefundReasonCode): string {
  switch (code) {
    case "BEFORE_RESULT_ACCESS":
      return "전체 결과를 아직 열람하지 않으셨고 환불 가능 기간 안이라, 전액 환불이 가능한 상태예요.";
    case "DUPLICATE_PAYMENT":
      return "같은 신청에 결제가 중복으로 승인된 것이 확인되어, 중복 결제 건은 전액 취소 대상이에요.";
    case "SERVICE_NOT_DELIVERED":
      return "결과가 정상적으로 제공되지 못한 상태로 확인되어, 전액 환불이 가능한 상태예요.";
    case "DIGITAL_CONTENT_ACCESSED":
      return "이 주문은 전체 결과가 이미 열람된 상태예요. 공개된 환불 규정상, 열람된 맞춤 디지털 콘텐츠는 자동 환불 대상에 포함되지 않아요.";
    case "REFUND_WINDOW_EXPIRED":
      return `결제일로부터 ${REFUND_WINDOW_DAYS}일의 환불 가능 기간이 지나, 자동 환불 대상에 포함되지 않아요.`;
    case "ALREADY_REFUNDED":
      return "이 결제는 이미 환불 처리가 완료되어 있어요. 결제수단 화면에 반영되는 시점은 카드사·결제수단의 처리 일정에 따라 달라질 수 있어요.";
    case "NOT_PAID":
      return "이 주문에는 완료된 결제 내역이 없어서 환불 대상이 아니에요.";
  }
}
