/**
 * 실제 고객 후기 데이터.
 *
 * ⚠️ 정책: 실제 동의받은 후기만 이 배열에 추가한다.
 * 가짜 후기·가상의 닉네임·검증되지 않은 통계·성공률은 절대 넣지 않는다.
 * 현재는 실데이터가 없어 빈 배열이며, 같은 자리에는
 * "재회 고민에서 많이 마주치는 순간" 콘텐츠가 대신 표시된다.
 * 아래 배열에 객체 하나만 추가하면 (JSX 수정 없이) 후기 carousel로 자동 전환된다.
 *
 * 추가 예:
 * {
 *   id: "review-001",
 *   text: "...실제 고객 후기 본문...",
 *   nickname: "지*",
 *   context: "2년 연애 후 이별",
 *   breakupElapsed: "이별 후 5주",
 *   outcome: "contact_resumed",
 *   verified: true,
 * }
 */
export type ReviewOutcome =
  | "reunited" // 재회
  | "contact_resumed" // 다시 연락 시작
  | "relationship_rebuilt" // 관계 회복
  | "clarity" // 마음이 선명해짐
  | "recovery"; // 감정적 안정

export interface HomeReview {
  id: string;
  text: string;
  nickname?: string;
  context?: string;
  breakupElapsed?: string;
  outcome?: ReviewOutcome;
  /** 실제 고객임이 확인된 후기만 true */
  verified?: boolean;
}

/** verified=true + 재회 계열 outcome에만 badge 문구 반환 (그 외 null) */
export function badgeFor(r: HomeReview): string | null {
  if (!r.verified) return null;
  switch (r.outcome) {
    case "reunited":
      return "재회 후 이야기";
    case "contact_resumed":
      return "다시 연락 시작";
    case "relationship_rebuilt":
      return "관계 회복";
    default:
      return null;
  }
}

export const HOME_REVIEWS: HomeReview[] = [];
