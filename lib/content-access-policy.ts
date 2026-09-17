/**
 * 콘텐츠 열람 가능 기간(NDX) 단일 소스 — 토스페이먼츠 심사 고지용.
 *
 * 현재 적용 범위: 고객 화면의 기간 고지/표시.
 * 실제 30일 경과 후 접근 차단은 아직 적용하지 않는다.
 */
export const CONTENT_VIEW_DAYS = 30;

/** 결제 전/결제 직전 화면용 한 줄 고지 */
export const CONTENT_VIEW_LINE = `열람 가능 기간: 결제일로부터 ${CONTENT_VIEW_DAYS}일`;

/** 정책 페이지용 표준 문장 */
export const CONTENT_VIEW_SENTENCE = `본 상품의 콘텐츠 열람 가능 기간은 결제일로부터 ${CONTENT_VIEW_DAYS}일입니다.`;

/**
 * 결제일을 1일차로 포함해 30일째를 마지막 날짜로 표시한다.
 * 예: 2026-09-17 결제 → 2026-10-16 표시.
 * 표시 전용이며 접근 권한 판정에는 사용하지 않는다.
 */
export function formatViewWindow(
  paidAtIso: string | null | undefined
): string | null {
  if (!paidAtIso) return null;
  const start = Date.parse(paidAtIso);
  if (!Number.isFinite(start)) return null;

  const end = start + (CONTENT_VIEW_DAYS - 1) * 24 * 60 * 60 * 1000;
  const formatKstDate = (ms: number) => {
    const kst = new Date(ms + 9 * 60 * 60 * 1000);
    const y = kst.getUTCFullYear();
    const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
    const d = String(kst.getUTCDate()).padStart(2, "0");
    return `${y}.${m}.${d}`;
  };

  return `${formatKstDate(start)} ~ ${formatKstDate(end)}`;
}
