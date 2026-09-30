/**
 * 개인화 책 — 사연을 읽고 "개인화 부분"만 AI가 작성 (서버 전용).
 *
 * 책 본문(약 110쪽)은 검수된 공통 원고(book-template.ts)를 그대로 쓰고,
 * 여기서는 판정·기간·내 상황 표시·메시지 초안·편지 등 사연에 맞춰야 하는 부분만 만든다.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { RitualOrderRow } from "@/lib/supabase/types";
import {
  buildContextSections,
  HIGH_RISK_SAFETY_VALUES,
} from "@/lib/wolhwa-prompt";

/** PART 03 장 번호 (book-template p2 의 "N. 제목" 과 일치) */
export const BOOK_SITUATIONS: Record<number, string> = {
  1: "지금 연락하면 안 되는 상태",
  2: "먼저 연락해도 되는 상태",
  3: "마지막 연락이 싸움이었을 때",
  4: "내가 헤어지자고 했을 때",
  5: "상대가 헤어지자고 했을 때",
  6: "매달린 뒤 연락이 끊겼을 때",
  7: "차단된 상태일 때",
  8: "친구처럼 연락하고 있을 때",
  9: "애매하게 관계가 이어지는 경우",
  10: "생일·기념일에 연락해도 되는지",
};

const BLOCKED = ["blocked_by_partner", "both_blocked"];

const Struct = z.object({
  summary: z.string(),
  verdict: z.string(),
  wait_days: z.number(),
  why_verdict: z.string(),
  situation_keys: z.array(z.number()),
  situation_note: z.string(),
  read_first: z.array(z.object({ where: z.string(), title: z.string(), why: z.string() })),
  cautions: z.array(z.string()),
  messages: z.array(z.object({ when: z.string(), text: z.string(), cap: z.string() })),
  opening_letter: z.array(z.string()),
  closing_letter: z.array(z.string()),
});

const t = (min: number, max: number) => z.string().trim().min(min).max(max);

export const BookPersonalSchema = z.object({
  summary: t(40, 360),
  verdict: z.enum(["no", "wait", "ok"]),
  wait_days: z.number().int().min(0).max(90),
  why_verdict: t(40, 420),
  situation_keys: z.array(z.number().int().min(1).max(10)).min(1).max(2),
  situation_note: t(40, 360),
  read_first: z
    .array(z.object({ where: t(4, 20), title: t(2, 40), why: t(10, 120) }))
    .length(3),
  cautions: z.array(t(6, 80)).min(2).max(4),
  messages: z
    .array(z.object({ when: t(4, 60), text: t(4, 120), cap: t(10, 160) }))
    .max(3),
  opening_letter: z.array(t(10, 260)).min(2).max(4),
  closing_letter: z.array(t(10, 320)).min(2).max(3),
});
export type BookPersonal = z.infer<typeof BookPersonalSchema>;

const SYSTEM = `당신은 월하연(月下緣)의 안내자 월화(月華)입니다.
고객이 구매한 PDF 책 《헤어진 뒤, 연락하지 말아야 할 때》의 "개인화 부분"만 씁니다.
책 본문은 이미 완성되어 있고, 당신이 쓰는 문장은 표지 다음 편지, "OO님의 지금" 쪽,
PART 03의 해당 장 표시, PART 05 앞의 메시지 초안, 마지막 편지에 들어갑니다.

[태도]
- 먼저 지금의 마음(100처럼 느껴지는 크기)을 인정합니다. 잊으라거나 놓으라고 하지 않습니다.
- 월하연은 재회를 원하는 사람이 "지금 무엇을 해야 하는지"를 돕습니다. 단, 재회를 보장하거나
  확률·시기를 약속하지 않습니다.
- 상대의 속마음을 사실처럼 단정하지 않습니다(좋은 쪽도 나쁜 쪽도). 신청서의 행동을 근거로
  "~로 읽히기 쉬워요", "~일 가능성이 커요"처럼 조건부로만 읽습니다.
- 신청자가 "~것 같다"고 쓴 것은 추정으로 남깁니다. 사연에 없는 사실을 지어내지 않습니다.
- 사연 문장을 그대로 옮기거나 요약하지 않고, 새로운 의미를 줄 때만 사용합니다.
- 해요체. 호칭은 "OO님". 거친 단어(파괴, 곪다, 구차, 매달림) 금지.

[항목]
- summary: "월화가 읽은 OO님의 상황" 2~3문장. 사실 나열이 아니라 지금의 위치를 해석.
- verdict: no(지금 연락 X) / wait(조금 더 기다리기) / ok(짧게 연락 가능).
  상대가 차단했거나 안전 위험이 있으면 반드시 no.
- wait_days: 판정 기간(일). wait면 보통 14~35, ok면 0~7, no면 차단·안전 문제일 때 0(기한 없음)
  또는 상황상 필요한 일수.
- why_verdict: 왜 이 판정인지 2~3문장. 기다림이 무엇을 바꾸는지, 무엇을 관찰할지 포함.
- situation_keys: 책 PART 03의 10가지 상황 중 이 사람에게 가장 해당하는 1~2개 번호.
  1 지금 연락하면 안 되는 상태 / 2 먼저 연락해도 되는 상태 / 3 마지막 연락이 싸움이었을 때 /
  4 내가 헤어지자고 했을 때 / 5 상대가 헤어지자고 했을 때 / 6 매달린 뒤 연락이 끊겼을 때 /
  7 차단된 상태일 때 / 8 친구처럼 연락하고 있을 때 / 9 애매하게 관계가 이어지는 경우 /
  10 생일·기념일에 연락해도 되는지
- situation_note: 그 장 첫머리에 붙는 "OO님의 상황이에요" 설명 2~3문장.
- read_first: 가장 먼저 읽을 세 장. where는 "PART 01"~"PART 10" 또는 "PART 03 · 5" 형식.
  (PART 01 헤어진 직후 / 02 상대 마음을 추측하게 되는 이유 / 03 연락할까, 기다릴까 /
  04 연락 전 체크 / 05 연락 메시지 실전편 / 06 관계를 보는 법 / 07 24시간 가이드 /
  08 7일 가이드 / 09 21일 관계 리셋 플랜 / 10 붉은 인연의 실 리추얼)
- cautions: 판정 기간까지 꼭 피할 행동 3개(이 사연에서 실제로 하기 쉬운 것).
- messages: 기다림이 끝난 뒤 보낼 수 있는 메시지 초안 3개. when은 "기다림이 끝난 뒤, OO한 날"처럼
  조건으로(날짜 숫자 쓰지 않기). text는 실제 카톡처럼 짧게(두세 줄 이내, 답을 요구하지 않는 문장).
  cap은 왜 이 문장인지 한 줄. 차단 상태나 안전 위험이면 빈 배열 [].
- opening_letter: 책 첫 편지 2~3문단. "OO님," 으로 시작. 마음의 크기를 인정하고, 이 책을 어떻게
  읽으면 되는지(다음 장에 지금의 판정과 먼저 읽을 장이 있다) 안내.
- closing_letter: 마지막 편지 앞 2문단. 판정 기간이 끝나는 날 무엇을 다시 펼칠지 안내하고,
  재회를 향한 다음 행동으로 마무리. "그러니 놓으세요" 결론 금지(정리를 원하는 사연 제외).

모든 값은 한국어. JSON 구조만 출력합니다.`;

export async function generateBookPersonal(
  order: RitualOrderRow
): Promise<BookPersonal | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  const highRisk = order.safety_concerns.some((v) => HIGH_RISK_SAFETY_VALUES.includes(v));
  const blocked = BLOCKED.includes(order.contact_status);
  const ctx = buildContextSections(order)[0];
  const extra: string[] = [];
  if (blocked)
    extra.push(
      "[차단 상태] 상대가 차단한 상태입니다. verdict는 no, situation_keys에 7 포함, messages는 []. 우회 연락(새 계정·지인·찾아가기)을 절대 제안하지 않습니다."
    );
  if (highRisk)
    extra.push(
      "[안전 우선] 안전/경계 위험 신호가 있습니다. verdict는 no, messages는 []. 재회 전략 대신 안전한 거리와 자기 보호를 중심으로 씁니다."
    );

  const client = new Anthropic({ apiKey, maxRetries: 1 });
  const t0 = Date.now();
  try {
    const msg = await client.messages.create(
      {
        model: process.env.BOOK_ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6",
        max_tokens: 4000,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `${ctx}\n\n${extra.join("\n\n")}\n\n신청자 이름: ${order.applicant_name} / 상대 이름: ${order.partner_name}\n위 사연으로 개인화 부분을 작성하세요.`,
          },
        ],
        output_config: { format: zodOutputFormat(Struct) },
      },
      { timeout: 150_000 }
    );
    if (msg.stop_reason === "max_tokens" || msg.stop_reason === "refusal") {
      console.error(`[book] ai_stop=${msg.stop_reason} ms=${Date.now() - t0}`);
      return null;
    }
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const parsed = BookPersonalSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      console.error(
        `[book] ai_schema_invalid ms=${Date.now() - t0} ${parsed.error.issues
          .slice(0, 4)
          .map((i) => i.path.join("."))
          .join(",")}`
      );
      return null;
    }
    const data = parsed.data;
    if (blocked || highRisk) {
      data.verdict = "no";
      data.messages = [];
    }
    console.error(`[book] ai_ok ms=${Date.now() - t0}`);
    return data;
  } catch (e) {
    console.error(`[book] ai_failed ms=${Date.now() - t0} ${e instanceof Error ? e.name : ""}`);
    return null;
  }
}
