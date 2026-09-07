/**
 * 실제 고객 후기 데이터.
 *
 * ⚠️ 정책: 실제 동의받은 후기만 이 배열에 추가한다.
 * 가짜 후기·가상의 닉네임·검증되지 않은 통계는 절대 넣지 않는다.
 * 현재는 실제 데이터가 없어 빈 배열이며,
 * 화면에는 "후기 준비 중" 안내가 표시된다.
 *
 * 실제 후기가 생기면 아래 형식으로 추가:
 * {
 *   text: "후기 본문",
 *   nickname: "달빛***",            // 익명 처리된 닉네임
 *   age_group: "20대 후반",         // 선택
 *   relationship_context: "2년 연애", // 선택
 *   breakup_elapsed: "이별 3개월",   // 선택
 * }
 */
export interface HomeReview {
  text: string;
  nickname: string;
  age_group?: string;
  relationship_context?: string;
  breakup_elapsed?: string;
}

export const HOME_REVIEWS: HomeReview[] = [];
