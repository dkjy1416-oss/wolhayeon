/**
 * 관리자 화면 공통 유틸 (서버 전용).
 */
import "server-only";

/** 운영자·테스트 계정 — 통계에서 제외 */
export const OPERATOR_EMAILS = new Set([
  "dkjy1416@naver.com",
  "tosstest@gmail.com",
]);

export function isOperatorEmail(email: string | null | undefined): boolean {
  return OPERATOR_EMAILS.has((email ?? "").toLowerCase());
}

/** ISO → KST 날짜 (YYYY-MM-DD) */
export function kstDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

/** 오늘(KST) 0시의 ISO */
export function kstTodayStartIso(): string {
  const d = kstDate(new Date().toISOString());
  return new Date(`${d}T00:00:00+09:00`).toISOString();
}

/** N일 전(KST 0시 기준) ISO */
export function kstDaysAgoStartIso(days: number): string {
  const start = new Date(kstTodayStartIso()).getTime();
  return new Date(start - days * 24 * 60 * 60 * 1000).toISOString();
}

/** 짧은 KST 시각 표기 (MM.DD HH:mm) */
export function kstShort(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function won(n: number): string {
  return `${n.toLocaleString()}원`;
}

/** CS 액션 코드 → 한글 라벨 */
export const CS_ACTION_LABELS: Record<string, string> = {
  LIGHT_LOOKUP: "주문 조회",
  OTP_REQUEST: "인증번호 요청",
  PAYMENT_VERIFY: "결제 확인",
  EMAIL_CHANGE: "이메일 변경",
  EMAIL_RESEND: "결과 메일 재발송",
  REFUND_CHECK: "환불 가능 확인",
  REFUND_EXECUTE: "환불 실행",
};

export const CS_STATUS_LABELS: Record<string, string> = {
  found: "찾음",
  not_found: "못 찾음",
  sent: "발송",
  ok: "완료",
  success: "완료",
  done: "완료",
  fail: "실패",
  failed: "실패",
  unavailable: "불가",
  denied: "거절",
  open: "처리 대기",
  resolved: "해결됨",
};

export const CS_TOPIC_LABELS: Record<string, string> = {
  refund: "환불",
  payment: "결제",
  result: "결과",
  email: "이메일",
  service: "이용안내",
  other: "기타",
};
