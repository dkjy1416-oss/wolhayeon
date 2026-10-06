/**
 * 결제 퍼널 이벤트 기록 (서버 전용).
 *
 * 결제 단계별로 "어디까지 갔고, 어디서 왜 막혔는지"를 남긴다.
 * - 개인정보 없음: 주문번호 + 이벤트명 + (실패 시) 토스 오류 코드만.
 * - 테이블이 없거나 실패해도 결제 흐름에는 절대 영향 없음.
 *
 * 필요한 테이블: PAYMENT_EVENTS.sql 참고.
 */
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendOpsAlert, isMerchantPaymentCode } from "@/lib/ops-alert";

export const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

/** 브라우저에서 보낼 수 있는 이벤트 (화이트리스트) */
export const CLIENT_PAY_EVENTS = [
  "preview_cta_click", // 미리보기 결제 버튼 클릭 (code: main | sticky | lock05 | bundle)
  "preview_end_seen", // 미리보기 끝(결제 안내)까지 읽음
  "inapp_browser", // 결제 화면을 연 브라우저 (code: instagram | kakaotalk | … | none)
  "share_card", // 미리보기 스토리 카드 (code: shared | saved)
  "pay_page_view", // 결제 페이지 진입 (code: open | closed)
  "widget_ready", // 결제수단 위젯 표시 완료
  "widget_error", // 결제수단 위젯 로드 실패
  "pay_request", // "결제하기" 클릭 → 결제창 호출
  "pay_request_error", // 결제창 호출 실패/사용자 취소 (code: 토스 오류 코드)
] as const;

/** 서버에서만 기록하는 이벤트 */
export type ServerPayEvent =
  | "pay_fail" // 토스가 failUrl로 돌려보냄 (code: 토스 오류 코드)
  | "pay_success" // 승인 완료
  | "confirm_failed" // 승인 API 실패 (code)
  | "amount_mismatch" // 금액 불일치로 승인 거부
  | "confirm_pending" // 승인 응답 유실 — 자동 재확인 대기
  | "apology_sent"; // 결제 오류 사과 쿠폰 메일 발송

export type PayEvent = (typeof CLIENT_PAY_EVENTS)[number] | ServerPayEvent;

/** 토스 오류 코드 등 — 영문 대문자/숫자/_ 만, 최대 60자 */
export function sanitizeCode(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const c = v.trim().slice(0, 60);
  return /^[A-Za-z0-9_\-.]+$/.test(c) ? c : null;
}

export async function logPayEventServer(
  orderNumber: string,
  event: PayEvent,
  code?: string | null
): Promise<void> {
  try {
    if (!ORDER_NUMBER_RE.test(orderNumber)) return;
    await getSupabaseAdmin()
      .from("payment_events")
      .insert({
        order_number: orderNumber,
        event,
        code: sanitizeCode(code ?? null),
      });
  } catch {
    /* 기록 실패는 무시 — 결제가 우선 */
  }
  try {
    const c = sanitizeCode(code ?? null);
    if (
      (event === "pay_fail" || event === "confirm_failed" || event === "pay_request_error") &&
      isMerchantPaymentCode(c)
    ) {
      await sendOpsAlert("payment_merchant", { code: c });
    } else if (event === "widget_error") {
      await sendOpsAlert("payment_widget", { code: c });
    }
  } catch {
    /* 기록 실패는 무시 — 결제가 우선 */
  }
}
