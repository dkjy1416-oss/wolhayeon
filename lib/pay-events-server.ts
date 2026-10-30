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
  "offer_seen", // 미리보기 '전체 분석에서 추가로 확인할 내용'까지 도달 (10/12)
  "example_seen", // 결과 예시 카드를 봄 (code: contact | lover | boundary)
  "package_open", // 'PDF 책도 함께 받고 싶다면' 펼침 (code: preview | pay)
  "book_view", // 'PDF 책 실제 페이지 넘겨 보기' (구매 클릭과 구분)
  "product_change", // 결제 화면에서 상품 변경 (code: 바뀐 상품)
  "pay_page_leave", // 결제 화면을 떠남 (code: 도달단계_머문초 — view|paybtn|clicked|error, 예: paybtn_35s) (10/30)
  "pay_timeout", // 결제하기 후 8초 넘게 결제창으로 안 넘어감 (code: 앱 안 브라우저 이름 | none) (10/30)
  "external_open_click", // '외부 브라우저로 열기' (code: android_chrome | kakao_auto | kakao | line | copy) (10/30)
  "preview_lock_click", // 미리보기 잠긴 항목 클릭 → 결제 안내로 이동 (code: 항목 번호) (10/30)
] as const;

/** 서버에서만 기록하는 이벤트 */
export type ServerPayEvent =
  | "pay_fail" // 토스가 failUrl로 돌려보냄 (code: 토스 오류 코드)
  | "pay_success" // 승인 완료
  | "confirm_failed" // 승인 API 실패 (code)
  | "amount_mismatch" // 금액 불일치로 승인 거부
  | "confirm_pending" // 승인 응답 유실 — 자동 재확인 대기
  | "mail_open" // 메일 열람 (1×1 이미지, code: remind | preview_link | apology | book …) (10/30)
  | "mail_click" // 메일 링크 클릭 → /api/remind/open (code: 위와 같음) (10/30)
  | "apology_sent" // 결제 오류 사과 쿠폰 메일 발송
  | "upgrade_invite_sent" // 책 추가 구매 안내 메일 발송 (후기 남기기 → 쿠폰)
  | "upgrade_issued"; // 후기 작성 후 책 추가 구매 쿠폰(주문) 발급 (code: 발급된 책 주문번호)

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
