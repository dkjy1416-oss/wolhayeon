/**
 * 카톡 캡처 AI 분석 (서버 전용) — 결제 완료 주문에만 실행.
 * 캡처는 분석 직후 삭제하고, 결과에는 상대 실명을 쓰지 않는다(호칭만).
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CHAT_QUESTIONS, ALL_CHAT_QUESTIONS } from "@/lib/chat/questions";
import type { ChatOrder, ChatResult } from "@/lib/chat/types";

/* 11/23: 길이·개수 제한은 모델 안내(describe)로만 — 조금 넘었다고 결과 전체를 버리지 않게 */
const s = (max: number) => z.string().min(1).describe(`${max}자 이내`);
export const ChatResultSchema = z.object({
  summary: s(200),
  type_label: s(30),
  /* 11/23 결과 보강: 월화의 총평 */
  overview: s(800),
  temperature: z.object({ me: z.number().int().describe("0~100"), partner: z.number().int().describe("0~100"), note: s(260) }),
  balance: z.object({ first_contact: s(220), length: s(220), reply_speed: s(220) }),
  turning_points: z.array(z.object({ when: s(60), what: s(360) })).min(1).describe("2~5개"),
  /* 그 사람은 지금 나를 어떻게 생각할까 — 단정이 아니라 대화에서 보이는 가능성 */
  partner_mind: z.object({
    reading: s(600),
    clues: z.array(z.object({ quote: s(40), meaning: s(220) })).min(1).describe("2~4개"),
  }),
  /* 말과 행동의 온도차 */
  say_vs_do: z.array(z.object({ says: s(120), does: s(180), gap: s(240) })).min(1).describe("2~3개"),
  /* 우리 관계는 어디로 흘러갈까 */
  future_flow: z.object({
    now_stage: s(260),
    paths: z.array(z.object({ condition: s(140), outcome: s(260) })).min(1).describe("3개"),
  }),
  partner_signals: z.object({ positive: z.array(s(200)).min(1).describe("2~5개"), caution: z.array(s(200)).min(1).describe("2~5개") }),
  my_strengths: z.array(s(200)).min(1).describe("1~3개"),
  my_patterns: z.array(z.object({ pattern: s(120), why_it_hurts: s(300), instead: s(200) })).min(1).describe("2~3개"),
  avoid_messages: z.array(z.object({ text: s(80), why: s(240) })).min(1).describe("3~5개"),
  next_messages: z.array(z.object({ text: s(120), when: s(100), intent: s(160), likely_response: s(220) })).min(1).describe("3개"),
  reply_guide: z.object({ warm: s(260), short: s(260), none: s(260) }),
  plan: z.array(z.object({ period: s(30), actions: z.array(s(160)).min(1).describe("2~5개") })).min(1).describe("3개"),
  closing: s(600),
});

/** 온도는 0~100으로, 다음 메시지는 3개까지 */
function tidy(r: z.infer<typeof ChatResultSchema>): ChatResult {
  const c = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  return {
    ...r,
    temperature: { ...r.temperature, me: c(r.temperature.me), partner: c(r.temperature.partner) },
    next_messages: r.next_messages.slice(0, 3),
  };
}

const SYSTEM = `당신은 '월하연'의 관계 분석가 '월화'입니다. 손님이 올린 카카오톡 대화(캡처 또는 내보내기 파일)를 직접 읽고, 두 사람의 대화 패턴을 분석해 한국어 결과문을 씁니다.

[원칙]
- 실제로 주어진 대화만 근거로 씁니다. 보이지 않는 사실은 지어내지 않습니다. 근거가 약하면 "이 대화만으로는 단정하기 어렵지만"처럼 표현합니다.
- 상대 실명·전화번호·아이디 등 개인 식별 정보는 결과에 절대 쓰지 않고, 주어진 호칭만 씁니다. 캡처 속 제3자 정보도 쓰지 않습니다.
- "상대가 100% 돌아온다", "확률 ○○%" 같은 단정·보장 표현은 쓰지 않습니다. 대화에서 보이는 '패턴'과 '가능성' 수준으로 씁니다.
- 스토킹, 차단 우회, 원치 않는 연락 강요, 위협으로 읽힐 수 있는 행동은 권하지 않습니다. 상대가 거절·차단 의사를 분명히 했다면 거리를 존중하는 방향을 제시합니다.
- 다정하지만 분명하게, 손님이 바로 쓸 수 있게 씁니다. 존댓말(~해요)로 씁니다.
- temperature는 대화 속 표현·길이·속도로 본 '대화 온도' 0~100 입니다(점수가 아니라 상대적 표현임을 note에 짧게 밝힘).
- turning_points·partner_signals·my_patterns에는 판단 근거가 된 캡처 속 짧은 문구(20자 이내)를 “ ” 안에 함께 적어, 손님이 '어느 대화 때문에 이렇게 봤는지' 알 수 있게 합니다. 이름·연락처는 문구에서 빼고 씁니다.
- next_messages는 그대로 보내도 자연스러운 카톡 문장 3개 (부담 낮은 순서), 각각 보낼 타이밍(when)·의도·예상 반응을 씁니다.

[분량과 깊이 — 결제한 손님이 "내 대화를 정말 읽었구나"라고 느끼게]
- 모든 항목은 일반론이 아니라 이 대화에서만 나올 수 있는 내용으로 씁니다. 실제 오간 말(짧게 인용)·날짜·횟수를 최대한 붙입니다.
- overview: 월화의 총평 4~6문장. 지금 관계의 상태, 왜 이렇게 됐는지, 지금 가장 중요한 한 가지를 순서대로.
- partner_mind.reading: "그 사람은 지금 나를 어떻게 생각할까"에 대한 해석 4~5문장. 속마음을 단정하지 말고 "대화에서 보이는 가능성"으로, 가능성이 둘 이상이면 함께 씁니다. clues는 그렇게 본 근거 문구(인용)와 그 의미.
- say_vs_do: 말로 한 것과 실제 행동(답장 길이·속도·약속 실행·먼저 연락)이 어긋나는 지점. 어긋남이 적으면 '일치하는 점'을 씁니다.
- future_flow: 지금 단계와, 손님이 어떻게 하느냐에 따라 갈릴 수 있는 흐름 3가지(조건 → 예상되는 흐름). 확률·보장 표현 금지.
- turning_points: 대화가 달라진 지점 2~5개. 그날 실제로 오간 말을 짧게 인용하고, 그 전후 숫자 변화를 씁니다.
- my_strengths: 손님이 이 대화에서 잘하고 있는 점(근거 포함). my_patterns.instead: 대신 이렇게 해 보기.
- reply_guide: 다음 메시지를 보낸 뒤 따뜻한 답 / 단답 / 무응답일 때 각각 다음 행동을 구체적으로(언제, 무엇을, 무엇은 하지 않기).
- plan: 3단계(예: 오늘~3일, 4~14일, 3~4주) 각 2~5개 행동.
- closing: 월화가 손님에게 건네는 편지 같은 마무리 3~5문장.`;

/** 11/28 두 갈래: 헤어진 사이 / 아직 이어지는 사이 — 리포트 관점 안내 */
function trackNote(o: ChatOrder): string {
  const rel = o.answers?.rel;
  if (rel === "ex")
    return "\n- 관점: 이미 헤어진 사이. 재회 가능성을 단정하지 말고, 왜 멀어졌는지 대화 근거, 지금 연락해도 되는 기준, 다시 연락한다면 보낼 문장과 보내지 말아야 할 문장, 내 마음 정리를 중심으로 쓰세요.";
  if (rel)
    return "\n- 관점: 아직 이어지는 사이(썸·연애·짝사랑 등). 관계를 이어 가는 데 도움이 되는 대화 습관, 지금 단계에서 부담 낮은 다음 걸음 중심으로 쓰세요.";
  return "";
}

function answerText(o: ChatOrder): string {
  /* 캡처(질문 전부 답함)는 기존처럼 전부, 파일 분석은 11/28 상황 질문 중 답한 것만 */
  const qs = ALL_CHAT_QUESTIONS.filter((q) => (o.source !== "file" && CHAT_QUESTIONS.includes(q)) || o.answers[q.id]);
  return qs
    .map((q) => {
      const v = o.answers[q.id];
      const label = q.options.find((x) => x.v === v)?.label ?? "응답 없음";
      return `- ${q.q} → ${label}`;
    })
    .join("\n");
}

export async function analyzeChat(
  o: ChatOrder,
  images: { data: string; type: string }[]
): Promise<ChatResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey || images.length === 0) return null;
  const client = new Anthropic({ apiKey, maxRetries: 0 }) /* 11/27: 재시도는 아래 반복문과 process.ts 가 이미 함 — SDK 숨은 재시도까지 겹치면 같은 대화 전체를 한 번 더 보냄 */;
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
          max_tokens: 16000,
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
      if (parsed.success) return tidy(parsed.data);
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
  const client = new Anthropic({ apiKey, maxRetries: 0 }) /* 11/27: 재시도는 아래 반복문과 process.ts 가 이미 함 — SDK 숨은 재시도까지 겹치면 같은 대화 전체를 한 번 더 보냄 */;
  const model = process.env.CHAT_ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";
  const partner = o.partner_label || "그 사람";
  const prompt = `[손님 정보]
- 결과에서 부를 손님 이름: ${o.name || "손님"} (대화에서는 "나")
- 상대 호칭: ${partner} (대화에서도 이 호칭으로 바꿔 두었음, 결과에도 이 호칭만 사용)
${o.answers && Object.keys(o.answers).length ? `- 무료 질문 답변:\n${answerText(o)}${trackNote(o)}\n` : ""}
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
          max_tokens: 16000,
          system: SYSTEM,
          messages: [{ role: "user", content: prompt }],
          output_config: { format: zodOutputFormat(ChatResultSchema) },
        },
        { timeout: 170_000 }
      );
      if (msg.stop_reason === "max_tokens" || msg.stop_reason === "refusal") {
        console.error(`[chat] text_stop ${msg.stop_reason}`);
        continue;
      }
      const out = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      const parsed = ChatResultSchema.safeParse(JSON.parse(out));
      if (parsed.success) return tidy(parsed.data);
      console.error(`[chat] text_schema_invalid ${parsed.error.issues.slice(0, 3).map((i) => i.path.join(".")).join(",")}`);
    } catch (e) {
      console.error(`[chat] analyze_text_failed ${e instanceof Error ? e.name : "unknown"}`);
    }
  }
  return null;
}
