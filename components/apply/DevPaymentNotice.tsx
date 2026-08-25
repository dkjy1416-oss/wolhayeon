/**
 * ─────────────────────────────────────────────────────────────
 *  개발 단계 전용 안내 문구
 *
 *  결제 기능을 실제로 연결할 때 반드시 제거하세요.
 *  제거 방법 (둘 중 하나):
 *    1) 아래 SHOW_DEV_NOTICE 를 false 로 변경
 *    2) 또는 이 파일과, ready/page.tsx 의
 *       `import DevPaymentNotice ...` 한 줄 + `<DevPaymentNotice />` 한 줄 삭제
 * ─────────────────────────────────────────────────────────────
 */
const SHOW_DEV_NOTICE = true;

export default function DevPaymentNotice() {
  if (!SHOW_DEV_NOTICE) return null;
  return (
    <p className="mt-4 text-center text-xs text-ivory-dim/50">
      결제 기능은 다음 개발 단계에서 연결됩니다.
    </p>
  );
}
