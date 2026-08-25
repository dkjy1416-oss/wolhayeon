/**
 * ─────────────────────────────────────────────────────────────
 *  테스트 결제 단계 전용 안내 문구 모음
 *
 *  실결제(라이브 키) 전환 시 반드시 제거하세요.
 *  제거 방법 (둘 중 하나):
 *   1) 아래 SHOW_TEST_NOTICES 를 false 로 변경 (한 번에 모두 숨김)
 *   2) 또는 이 파일과 각 사용처의 import/JSX 한 줄씩 삭제
 *     - <TestPaymentNotice />  : /apply/complete 결제 버튼 아래
 *     - <GenerationPendingNotice /> : /payment/success 하단
 * ─────────────────────────────────────────────────────────────
 */
const SHOW_TEST_NOTICES = true;

/** 결제 버튼 아래: 테스트 환경 안내 */
export function TestPaymentNotice() {
  if (!SHOW_TEST_NOTICES) return null;
  return (
    <p className="mt-4 text-center text-xs leading-relaxed text-ivory-dim/50">
      현재 테스트 결제 환경입니다. 실제 금액은 청구되지 않습니다.
    </p>
  );
}

/** 결제 성공 화면 하단: 리추얼 생성 미연결 안내 */
export function GenerationPendingNotice() {
  if (!SHOW_TEST_NOTICES) return null;
  return (
    <p className="mt-6 text-center text-xs leading-relaxed text-ivory-dim/50">
      결제 테스트 단계에서는 실제 리추얼 생성 기능이 아직 연결되지 않습니다.
    </p>
  );
}
