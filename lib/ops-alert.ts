/**
 * 운영자 오류 알림 메일 (서버 전용)
 *
 * 손님 쪽에서 무언가 실패했을 때 운영자 메일(OPERATOR_NOTIFY_EMAIL)로 즉시 알린다.
 * - 같은 종류·같은 주문은 1시간에 1통만 (Resend idempotencyKey)
 * - 주문과 무관한 전체 장애(결제창 로드 실패 등)도 1시간에 1통
 * - 개인정보(사연·이메일)는 담지 않음: 주문번호·오류 코드·관리자 링크만
 * - 알림 실패는 절대 서비스 흐름을 막지 않음
 */
import "server-only";
import { Resend } from "resend";

export type OpsAlertKind =
  | "generation_failed" // 유료 결과 생성 실패
  | "delivery_failed" // 결과 메일 발송 실패
  | "process_error" // 결제 후 자동 처리(생성→승인→발송) 오류
  | "preview_error" // 무료 미리보기 서버 오류
  | "book_failed" // 책 PDF 제작 실패
  | "payment_error" // 결제 승인/저장 오류, 금액 불일치
  | "payment_merchant" // 토스 상점 설정 문제(전원 결제 불가 위험)
  | "payment_widget" // 결제수단 위젯 로드 실패
  | "order_save_failed" // 신청서 저장 실패
  | "cs_incident"; // 고객센터 장애 접수

const LABEL: Record<OpsAlertKind, string> = {
  generation_failed: "결과 생성 실패",
  delivery_failed: "결과 메일 발송 실패",
  process_error: "결제 후 자동 처리 오류",
  preview_error: "미리보기 오류",
  book_failed: "책 PDF 제작 실패",
  payment_error: "결제 처리 오류",
  payment_merchant: "결제 상점 설정 오류 (전체 결제 불가 위험)",
  payment_widget: "결제창 로드 실패",
  order_save_failed: "신청서 저장 실패",
  cs_incident: "고객센터 장애 접수",
};

const ADVICE: Partial<Record<OpsAlertKind, string>> = {
  generation_failed: "관리자 주문 화면에서 'AI 결과 생성'을 다시 누르면 재시도됩니다.",
  delivery_failed: "관리자 주문 화면의 이메일 발송 버튼으로 다시 보낼 수 있습니다.",
  payment_merchant: "토스페이먼츠 상점 관리자에서 계약·키 상태를 바로 확인하세요.",
  payment_widget: "결제 페이지가 열리는지 직접 확인해 보세요.",
  book_failed: "책 주문은 다시 열람 시 재제작을 시도합니다. 반복되면 확인이 필요합니다.",
};

export async function sendOpsAlert(
  kind: OpsAlertKind,
  opts: { orderNumber?: string | null; code?: string | null; detail?: string | null } = {}
): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.RESEND_FROM_EMAIL?.trim();
    const to = process.env.OPERATOR_NOTIFY_EMAIL?.trim() || "dkjy1416@naver.com";
    if (!apiKey || !from) return;

    const order = opts.orderNumber && /^WH-\d{8}-[A-Z0-9]{5}$/.test(opts.orderNumber)
      ? opts.orderNumber
      : null;
    const code = (opts.code ?? "").toString().replace(/[^\w.\-:]/g, "").slice(0, 80);
    const site = (process.env.SITE_URL ?? "").replace(/\/$/, "");
    const now = new Date();
    const hour = now.toISOString().slice(0, 13);

    const subject = `⚠️ [월하연 오류] ${LABEL[kind]}${order ? ` — ${order}` : ""}`;
    const text = [
      `${LABEL[kind]}이(가) 발생했습니다.`,
      ``,
      order ? `주문번호: ${order}` : `주문번호: (전체 영향)`,
      code ? `오류 코드: ${code}` : null,
      opts.detail ? `내용: ${opts.detail.slice(0, 300)}` : null,
      `시각: ${now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
      ADVICE[kind] ? `\n할 일: ${ADVICE[kind]}` : null,
      ``,
      order ? `주문 보기: ${site}/admin/orders/${order}` : `관리자: ${site}/admin`,
    ]
      .filter((l) => l !== null)
      .join("\n");

    await new Resend(apiKey).emails.send(
      { from: `월하연 알림 <${from}>`, to, subject, text },
      { idempotencyKey: `ops-v1-${kind}-${order ?? "all"}-${hour}` }
    );
  } catch {
    /* 알림 실패는 무시 */
  }
}

/** 토스 오류 코드 중 '상점 설정' 문제(손님 잘못이 아닌, 모두가 결제 못 하는 상황) */
export function isMerchantPaymentCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return /MERCHANT|UNAUTHORIZED|INVALID_API_KEY|NOT_REGISTERED|FORBIDDEN|INVALID_CLIENT_KEY|NOT_FOUND_TERMINAL/i.test(
    code
  );
}
