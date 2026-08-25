/**
 * ─────────────────────────────────────────────────────────────
 *  테스트 결제 모드 안내 문구
 *
 *  실결제(라이브 키)로 전환할 때 반드시 제거하세요.
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
      현재는 테스트 결제 모드입니다. 실제 금액이 청구되지 않습니다.
    </p>
  );
}
