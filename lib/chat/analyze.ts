/**
 * 카톡 캡처 AI 분석 (서버 전용) — 결제 완료 주문에만 실행.
 * 캡처는 분석 직후 삭제하고, 결과에는 상대 실명을 쓰지 않는다(호칭만).
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CHAT_QUESTIONS } from "@/lib/chat/questions";
import type { ChatOrder, ChatResult } from "@/lib/chat/types";

const s = (max: number) => z.string().min(1).max(max);
export const ChatResultSchema = z.object({
  summary: s(120),
  type_label: s(30),
  temperature: z.object({ me: z.number().int().min(0).max(100), partner: z.number().int().min(0).max(100), note: s(200) }),
  balance: z.object({ first_contact: s(120), length: s(120), reply_speed: s(160) }),
  turning_points: z.array(z.object({ when: s(60), what: s(200) })).min(1).max(4),
  partner_signals: z.object({ positive: z.array(s(140)).min(1).max(4), caution: z.array(s(140)).min(1).max(4) }),
  my_patterns: z.array(z.object({ pattern: s(100), why_it_hurts: s(200) })).min(1).max(3),
  avoid_messages: z.array(z.object({ text: s(80), why: s(160) })).min(2).max(4),
  next_messages: z.array(z.object({ text: s(120), intent: s(120), likely_response: s(160) })).length(3),
  plan: z.array(z.object({ period: s(30), actions: z.array(s(120)).min(1).max(4) })).min(2).max(3),
  closing: s(300),
});

const SYSTEM = `당신은 '월하연'의 관계 분석가 '월화'입니다. 손님이 올린 카카오톡 대화(캡처 또는 내보내기 파일)를 직접 읽고, 두 사람의 대화 패턴을 분석해 한국어 결과문을 씁니다.

[원칙]
- 실제로 주어진 대화만 근거로 씁니다. 보이지 않는 사실은 지어내지 않습니다. 근거가 약하면 "캡처만으로는 단정하기 어렵지만"처럼 표현합니다.
- 상대 실명·전화번호·아이디 등 개인 식별 정보는 결과에 절대 쓰지 않고, 주어진 호칭만 씁니다. 캡처 속 제3자 정보도 쓰지 않습니다.
- "상대가 100% 돌아온다", "확률 ○○%" 같은 단정·보장 표현은 쓰지 않습니다. 대화에서 보이는 '패턴'과 '가능성' 수준으로 씁니다.
- 스토킹, 차단 우회, 원치 않는 연락 강요, 위협으로 읽힐 수 있는 행동은 권하지 않습니다. 상대가 거절·차단 의사를 분명히 했다면 거리를 존중하는 방향을 제시합니다.
- 다정하지만 분명하게, 손님이 바로 쓸 수 있게 씁니다. 존댓말(~해요)로 씁니다.
- temperature는 대화 속 표현·길이·속도로 본 '대화 온도' 0~100 입니다(점수가 아니라 상대적 표현임을 note에 짧게 밝힘).
- turning_points·partner_signals·my_patterns에는 판단 근거가 된 캡처 속 짧은 문구(20자 이내)를 “ ” 안에 함께 적어, 손님이 '어느 대화 때문에 이렇게 봤는지' 알 수 있게 합니다. 이름·연락처는 문구에서 빼고 씁니다.
- next_messages는 그대로 보내도 자연스러운 카톡 문장 3개 (부담 낮은 순서), 각각 의도와 예상 반응을 씁니다.`;

function answerText(o: ChatOrder): string {
  return CHAT_QUESTIONS.map((q) => {
    const v = o.answers[q.id];
    const label = q.options.find((x) => x.v === v)?.label ?? "응답 없음";
    return `- ${q.q} → ${label}`;
  }).join("\n");
}

export async function analyzeChat(
  o: ChatOrder,
  images: { data: string; type: string }[]
): Promise<ChatResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey || images.length === 0) return null;
  const client = new Anthropic({ apiKey, maxRetries: 1 });
  const model = process.env.CHAT_ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";
  const partner = o.partner_label || "그 사람";
  const intro = `[손님 정보]
- 결과에서 부를 손님 이름: ${o.name || "손님"}
- 상대 호칭(결과에 이 호칭만 사용): ${partner}
- 캡처에서 손님 말풍선 위치: ${o.my_side === "left" ? "왼쪽" : "오른쪽(카톡 기본: 노란 말풍선)"}
- 무료 질문 답변:
${answerText(o)}

아래 캡처 ${images.length}장은 시간 순서입니다(앞이 과거). 대화를 읽고 결과를 작성하세요.`;
  const content: Anthropic.ContentBlockParam[] = [{ type: "text", text: intro }];
  images.forEach((im, i) => {
    content.push({ type: "text", text: `캡처 ${i + 1}` });
    content.push({
      type: "image",
      source: { type: "base64", media_type: im.type as "image/jpeg" | "image/png" | "image/webp", data: im.data },
    });
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const msg = await client.messages.create(
        {
          model,
          max_tokens: 6000,
          system: SYSTEM,
          messages: [{ role: "user", content }],
          output_config: { format: zodOutputFormat(ChatResultSchema) },
        },
        { timeout: 170_000 }
      );
      if (msg.stop_reason === "max_tokens" || msg.stop_reason === "refusal") continue;
      const text = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      const parsed = ChatResultSchema.safeParse(JSON.parse(text));
      if (parsed.success) return parsed.data;
      console.error(`[chat] schema_invalid ${parsed.error.issues.slice(0, 3).map((i) => i.path.join(".")).join(",")}`);
    } catch (e) {
      console.error(`[chat] analyze_failed ${e instanceof Error ? e.name : "unknown"}`);
    }
  }
  return null;
}

/** 대화 내보내기 파일(텍스트) 분석 — 캡처보다 싸고, 시간 정보가 있어 숫자 근거를 쓸 수 있다 */
export async function analyzeChatText(o: ChatOrder, text: string): Promise<ChatResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey || !text.trim()) return null;
  const client = new Anthropic({ apiKey, maxRetries: 1 });
  const model = process.env.CHAT_ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";
  const partner = o.partner_label || "그 사람";
  const prompt = `[손님 정보]
- 결과에서 부를 손님 이름: ${o.name || "손님"} (대화에서는 "나")
- 상대 호칭: ${partner} (대화에서도 이 호칭으로 바꿔 두었음, 결과에도 이 호칭만 사용)
${o.answers && Object.keys(o.answers).length ? `- 무료 질문 답변:\n${answerText(o)}\n` : ""}
[이 대화에서 계산한 숫자 — 근거로 인용할 것]
${JSON.stringify(o.stats ?? {}, null, 0)}
(starts=6시간 넘게 쉬었다 먼저 말 건 횟수, ends=대화를 마지막으로 남긴 쪽, replyMin=답장 시간 중앙값(분), partnerReplyEarly/Late=앞·뒤 절반 기간 상대 답장 중앙값, meetAsk=만나자는 말, vague='다음에·언젠가', feelingWords=감정 단어, nightStarts=밤 11시~새벽 3시 먼저 연락, weeks=주별 대화 온도(상대 지표), turnWeek=상대 온도가 가장 크게 떨어진 주)

[대화 원문 — "월/일 시:분 말한사람: 내용", 최근 위주]
${text}

위 대화 전체와 숫자를 근거로 결과를 작성하세요. turning_points·partner_signals에는 날짜와 숫자를 함께 쓰세요(예: "9/18 이후 먼저 연락 4회 → 1회").`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const msg = await client.messages.create(
        {
          model,
          max_tokens: 6000,
          system: SYSTEM,
          messages: [{ role: "user", content: prompt }],
          output_config: { format: zodOutputFormat(ChatResultSchema) },
        },
        { timeout: 170_000 }
      );
      if (msg.stop_reason === "max_tokens" || msg.stop_reason === "refusal") continue;
      const out = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      const parsed = ChatResultSchema.safeParse(JSON.parse(out));
      if (parsed.success) return parsed.data;
    } catch (e) {
      console.error(`[chat] analyze_text_failed ${e instanceof Error ? e.name : "unknown"}`);
    }
  }
  return null;
}
