/**
 * 무료 미리보기 화면용 고정 문구 (클라이언트·서버 공용).
 */

/** 지금의 행동 기조 */
export const NOW_STANCES = ["wait", "light_contact", "hold_boundary"] as const;
export const NOW_STANCE_LABELS: Record<(typeof NOW_STANCES)[number], string> = {
  wait: "지금은 연락보다 준비",
  light_contact: "짧고 가벼운 연락 가능",
  hold_boundary: "지금은 거리 지키기",
};

/** 유료 결과에서 더 깊게 보는 것 — UI 고정 (AI가 약속을 늘리지 못하게) */
export const PAID_DEEP_ITEMS = [
  "상대의 현재 감정 구조",
  "관계가 깨진 핵심 원인",
  "연락 타이밍 — 언제, 어떤 조건에서",
  "연락 방식과 첫 메시지 방향",
  "상대 반응별 대응 (반가운 답 · 단답 · 무응답)",
  "재회 가능성을 떨어뜨리는 행동",
  "내가 놓치고 있는 감정",
  "다시 만난다면, 같은 문제가 반복되지 않기 위한 조건",
  "개인 리추얼 · 24시간 / 7일 / 21일 행동 가이드",
];

