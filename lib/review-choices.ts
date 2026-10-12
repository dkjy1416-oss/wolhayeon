/**
 * 선택형 후기 — 질문 2개의 선택지와 문장 만들기 (클라이언트·서버 공용).
 * 고른 내용만 문장에 넣는다. 고르지 않은 칭찬을 덧붙이지 않는다.
 * 고객은 만들어진 문장을 확인·수정한 뒤 등록한다.
 */

export const HELPED_OPTIONS = [
  { id: "situation", label: "내 상황 정리", phrase: "지금 내 상황을 정리하는 데" },
  { id: "criteria", label: "연락 기준", phrase: "연락할지 말지 기준을 세우는 데" },
  { id: "message", label: "메시지 예시", phrase: "보낼 메시지를 고르는 데" },
  { id: "mind", label: "마음 정리", phrase: "마음을 정리하는 데" },
  { id: "little", label: "도움이 적었어요", phrase: "" },
] as const;

export const IMPRESSION_OPTIONS = [
  { id: "reflected", label: "내 사연이 잘 반영됐어요", sentence: "제가 쓴 사연이 잘 반영된 느낌이었어요." },
  { id: "specific", label: "설명이 구체적이었어요", sentence: "설명이 구체적이었어요." },
  { id: "long", label: "설명이 길었어요", sentence: "설명이 조금 길게 느껴졌어요." },
  { id: "more_specific", label: "더 구체적이면 좋겠어요", sentence: "조금 더 구체적이었으면 좋겠어요." },
] as const;

export type HelpedId = (typeof HELPED_OPTIONS)[number]["id"];
export type ImpressionId = (typeof IMPRESSION_OPTIONS)[number]["id"];

/** 함께 고를 수 없는 선택 (하나를 고르면 다른 쪽은 풀린다) */
export const EXCLUSIVE_HELPED: HelpedId = "little";
export const CONFLICT_IMPRESSION: Array<[ImpressionId, ImpressionId]> = [["specific", "more_specific"]];

const HELPED_IDS = new Set<string>(HELPED_OPTIONS.map((o) => o.id));
const IMPRESSION_IDS = new Set<string>(IMPRESSION_OPTIONS.map((o) => o.id));

/** 서버 검증 — 알 수 없는 값·충돌 조합 제거 */
export function cleanChoices(helped: unknown, impressions: unknown): { helped: HelpedId[]; impressions: ImpressionId[] } {
  let h = Array.isArray(helped)
    ? [...new Set(helped.filter((v): v is HelpedId => typeof v === "string" && HELPED_IDS.has(v)))]
    : [];
  if (h.includes(EXCLUSIVE_HELPED)) h = [EXCLUSIVE_HELPED];
  let i = Array.isArray(impressions)
    ? [...new Set(impressions.filter((v): v is ImpressionId => typeof v === "string" && IMPRESSION_IDS.has(v)))]
    : [];
  for (const [a, b] of CONFLICT_IMPRESSION) if (i.includes(a) && i.includes(b)) i = i.filter((x) => x !== b);
  return { helped: h, impressions: i };
}

/** 고른 내용만으로 후기 문장 만들기 */
export function buildReviewSentence(helped: HelpedId[], impressions: ImpressionId[]): string {
  const parts: string[] = [];
  if (helped.includes("little")) {
    parts.push("기대한 만큼 도움이 되지는 않았어요.");
  } else if (helped.length > 0) {
    const phrases = HELPED_OPTIONS.filter((o) => helped.includes(o.id) && o.phrase).map((o) => o.phrase);
    parts.push(`${phrases.join(", ")} 도움이 됐어요.`);
  }
  const positive = impressions.filter((x) => x === "reflected" || x === "specific");
  const negative = impressions.filter((x) => x === "long" || x === "more_specific");
  for (const id of positive) {
    parts.push(IMPRESSION_OPTIONS.find((o) => o.id === id)!.sentence);
  }
  negative.forEach((id, idx) => {
    const s = IMPRESSION_OPTIONS.find((o) => o.id === id)!.sentence;
    parts.push(idx === 0 && (positive.length > 0 || (helped.length > 0 && !helped.includes("little"))) ? `다만 ${s}` : s);
  });
  return parts.join(" ");
}
