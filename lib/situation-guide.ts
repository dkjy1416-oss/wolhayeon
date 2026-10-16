/**
 * 재회 상황별 대응 가이드 데이터베이스 (월하연 내부 작성 가이드) — 10/16 리디자인 3.3
 *
 * 출처: 월하연 개인화 책 PART 03 「연락할까, 기다릴까 — 10가지 상황」(lib/book/book-situations.ts, 내부 작성).
 *       실제 상담 사례나 다른 고객의 사연이 아니다. 고객 사연을 이 데이터에 넣지 않는다.
 * 사용: 신청서의 선택 항목(연락 상태·이별 주도·이별 후 경과)과 사연 속 단서로 해당 상황을 고르고,
 *       전체 결과 생성 프롬프트에 '참고 가이드'로 붙인다. 미리보기 화면에는 고른 상황의 이름만 보여 준다.
 * 한 사람을 하나의 유형에 고정하지 않는다 — 여러 축에서 최대 2개를 고르고, 사연의 사실이 항상 우선.
 */
import { BOOK_SITUATIONS_DATA, type BookSituation } from "@/lib/book/book-situations";

export interface GuideInput {
  contact_status?: string | null;
  breakup_initiator?: string | null;
  breakup_elapsed?: string | null;
  last_conversation?: string | null;
  relationship_type?: string | null;
  story?: string | null;
  last_conversation_memory?: string | null;
}

export interface GuidePick {
  n: number;
  title: string;
  /** 고객에게 보여 줄 쉬운 선택 이유 */
  reason: string;
}

const has = (text: string, words: string[]) => words.some((w) => text.includes(w));

/** 사연에 맞는 상황 가이드 최대 2개 (우선순위 순) */
export function pickSituationGuides(a: GuideInput): GuidePick[] {
  const text = `${a.story ?? ""} ${a.last_conversation_memory ?? ""}`;
  const out: Array<{ n: number; reason: string }> = [];
  const add = (n: number, reason: string) => {
    if (!out.some((x) => x.n === n)) out.push({ n, reason });
  };

  const cs = a.contact_status ?? "";
  if (cs === "blocked_by_partner" || cs === "both_blocked") add(7, "연락이 차단된 상태라고 답했어요");
  if (has(text, ["매달", "붙잡", "빌었", "애원"])) add(6, "사연에 붙잡았던 이야기가 있어요");
  if (has(text, ["싸웠", "싸움", "다퉜", "다툼", "말다툼", "언성"])) add(3, "사연에 마지막 다툼 이야기가 있어요");
  if (a.breakup_initiator === "me") add(4, "내가 먼저 이별을 말했다고 답했어요");
  if (a.breakup_initiator === "partner") add(5, "상대가 먼저 이별을 말했다고 답했어요");
  if (cs === "in_contact") add(8, "지금도 서로 연락하고 있다고 답했어요");
  if (cs === "occasional" || a.breakup_initiator === "faded") add(9, "관계가 애매하게 이어지고 있다고 답했어요");
  if (has(text, ["생일", "기념일", "크리스마스"])) add(10, "사연에 생일·기념일 이야기가 있어요");
  if (cs === "no_contact" && ["1_3m", "3_6m", "6m_1y", "over_1y"].includes(a.breakup_elapsed ?? ""))
    add(2, "연락 없이 시간이 꽤 지났다고 답했어요");
  if (out.length === 0) add(1, "연락하고 싶은 마음이 큰 시기라서요");

  return out.slice(0, 2).map(({ n, reason }) => {
    const g = BOOK_SITUATIONS_DATA.find((x) => x.n === n) as BookSituation;
    return { n, title: g.title, reason };
  });
}

/** 생성 프롬프트용 참고 블록 */
export function situationGuideSection(a: GuideInput): string {
  const picks = pickSituationGuides(a);
  const blocks = picks.map(({ n, reason }) => {
    const g = BOOK_SITUATIONS_DATA.find((x) => x.n === n) as BookSituation;
    const lines = [
      `■ 상황 ${g.n}. ${g.title} (선택 이유: ${reason})`,
      `- 핵심: ${g.lead}`,
      g.why ? `- 왜: ${g.why}` : "",
      g.wait ? `- 기다림의 기준: ${g.wait}` : "",
      g.good ? `- 괜찮은 문장 예: ${g.good}` : "",
      g.bad ? `- 피할 문장 예: ${g.bad.text} (${g.bad.why})` : "",
      g.dont.length ? `- 하지 말 것: ${g.dont.join(" / ")}` : "",
    ].filter(Boolean);
    return lines.join("\n");
  });
  return `[월하연 재회 상황별 대응 가이드 — 참고 자료]
아래는 월하연이 정리한 재회 상황별 대응 가이드 중 이 신청서와 맞는 항목입니다.
- 판단 기준과 기다림의 기준을 참고하되, 신청자의 사연에 있는 사실이 항상 우선합니다. 사연과 맞지 않는 부분은 쓰지 마세요.
- 문장을 그대로 옮기지 말고, 이 사람의 이름·사연·상황에 맞게 새로 쓰세요.
- 안전·차단 지시가 있으면 그 지시가 이 가이드보다 우선합니다.

${blocks.join("\n\n")}`;
}
