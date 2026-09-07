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

/* ================================================================
 * 디자인/전환 테스트용 "예시 후기" (실제 고객 후기 아님)
 *
 * ⚠️ 모든 카드에 "예시 후기" badge가 표시되며, 섹션 상단에도
 *    예시임을 명시하는 안내 문구가 함께 노출된다.
 * ⚠️ 실제 고객 후기가 준비되면:
 *    1) 위 HOME_REVIEWS에 실제 후기를 추가 → 화면이 자동으로
 *       실제 후기 carousel로 전환되고 예시 후기는 표시되지 않음
 *    2) 아래 DEMO_REVIEWS 배열을 비우거나 삭제해 완전 제거
 * ================================================================ */
export interface DemoReview {
  id: string;
  text: string;
  context: string;
  type: "demo";
  outcome: ReviewOutcome;
}

/** 예시 후기 전용 보조 배지 (결과 과장 없는 절제된 표현) */
export function demoBadgeFor(outcome: ReviewOutcome): string | null {
  switch (outcome) {
    case "reunited":
      return "다시 대화 시작";
    case "contact_resumed":
      return "연락 재개";
    case "relationship_rebuilt":
      return "관계 다시 보기";
    case "clarity":
      return "마음 정리";
    default:
      return null;
  }
}

export const DEMO_REVIEWS: DemoReview[] = [
  {
    id: "demo-001",
    type: "demo",
    outcome: "reunited",
    context: "장기연애 후 이별 · 재회 고민",
    text: "헤어진 뒤 한 달 넘게 매일 연락할까 말까만 고민했어요. 결과를 보고 바로 연락하기보다 왜 계속 같은 문제로 부딪혔는지부터 정리했어요. 며칠 뒤 감정적으로 붙잡는 방식이 아니라 차분하게 대화를 시작했고, 다시 만나서 천천히 이야기해보기로 했어요.",
  },
  {
    id: "demo-002",
    type: "demo",
    outcome: "contact_resumed",
    context: "이별 후 3주 · 연락 단절",
    text: "상대가 아직 마음이 있는지만 알고 싶어서 들어왔는데, 오히려 제가 왜 답장 하나에 이렇게 흔들리는지 먼저 보게 됐어요. 연락을 계속 보내는 대신 며칠 멈췄고, 그 뒤 상대 쪽에서 먼저 연락이 와서 다시 대화를 시작했어요.",
  },
  {
    id: "demo-003",
    type: "demo",
    outcome: "relationship_rebuilt",
    context: "3년 연애 · 반복 이별",
    text: "3년 넘게 만난 사람이라 그냥 잊으라는 말이 제일 힘들었어요. 재회를 하든 아니든 다시 만나면 무엇이 달라져야 하는지가 처음으로 정리됐어요. 그 뒤 다시 만나서 예전처럼 바로 돌아가는 대신 서로 힘들었던 부분부터 이야기했어요.",
  },
  {
    id: "demo-004",
    type: "demo",
    outcome: "clarity",
    context: "이별 후 2개월 · 재회 여부 고민",
    text: "전 남친이 너무 그리워서 무조건 다시 만나고 싶다고 생각했어요. 그런데 읽다 보니까 그 사람이 그리운 건지, 그때 안정적이었던 제 모습이 그리운 건지 처음 구분하게 됐어요. 덕분에 급하게 연락하지 않고 제 마음부터 정리할 수 있었어요.",
  },
];
