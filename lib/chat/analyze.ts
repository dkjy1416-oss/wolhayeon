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

const SYSTEM = `당신은 '월하연'의 관계 분석가 '월화'입니다. 손님이 올린 카카오톡 대화 캡처를 직접 읽고, 두 사람의 대화 패턴을 분석해 한국어 결과문을 씁니다.

[원칙]
- 캡처에 실제로 보이는 대화만 근거로 씁니다. 보이지 않는 사실은 지어내지 않습니다. 근거가 약하면 "캡처만으로는 단정하기 어렵지만"처럼 표현합니다.
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
