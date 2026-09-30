/**
 * 결제 전 무료 미리보기 생성 (서버 전용).
 *
 * v2: 실제 사연을 읽고 쓰는 AI 미리보기를 우선 시도하고,
 * 시간 초과/오류/스키마 불일치 시에는 기존 즉석 템플릿(buildInstantPreview)으로
 * 자동 대체한다. 무료 화면이 비는 일은 없다.
 * 전체 유료 결과 생성 구조는 변경하지 않는다.
 */
import "server-only";
import { resolveOrderPrice } from "@/lib/ritual-types";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  PreviewSchema,
  PreviewStructSchema,
  PREVIEW_SYSTEM_PROMPT,
  buildPreviewUserPrompt,
  previewBannedMatch,
  type RitualPreview,
} from "@/lib/ritual-preview-schema";
import type { RitualOrderRow } from "@/lib/supabase/types";
import {
  BREAKUP_ELAPSED_OPTIONS,
  LAST_CONVERSATION_OPTIONS,
  optionLabel,
} from "@/lib/ritual-types";
import { HIGH_RISK_SAFETY_VALUES } from "@/lib/wolhwa-prompt";

export type PreviewOutcome =
  | {
      status: "ready";
      preview: RitualPreview;
      applicantName: string;
      /** true = AI 개인화(또는 저장된 AI본), false = 즉석 템플릿 폴백 */
      generated: boolean;
      /** 이 주문의 결제 금액 (사과 쿠폰 적용 시 쿠폰가) */
      paymentAmount: number;
    }
  | { status: "not_found" }
  | { status: "server_error" };

function clip(value: string | null | undefined, max: number): string {
  const clean = (value ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function sentence(value: string, max = 155): string {
  return clip(value, max);
}

function emotionPhrase(value: string): string {
  const map: Record<string, string> = {
    still_love: "아직 마음이 많이 남아 있고",
    longing: "그리움이 크게 올라오고",
    regret: "후회가 오래 남아 있고",
    anger: "억울함과 화가 쉽게 가라앉지 않고",
    lonely_or_love: "그리움과 외로움이 섞여 헷갈리고",
    want_to_let_go: "붙잡고 싶은 마음과 놓고 싶은 마음이 함께 있고",
    confused: "내 마음조차 정리되지 않아 혼란스럽고",
  };
  return map[value] ?? "마음이 쉽게 정리되지 않고";
}

function painPhrase(values: string[]): string {
  const first = values[0];
  const map: Record<string, string> = {
    miss_them: "그 사람이 너무 보고 싶은 마음",
    waiting_contact: "연락을 기다리게 되는 시간",
    dont_understand_end: "왜 관계가 끝났는지 이해되지 않는 부분",
    no_apology: "제대로 풀리지 않은 사과와 서운함",
    regret_my_fault: "내가 더 잘했어야 했다는 후회",
    curious_feelings: "상대의 마음을 확인하고 싶은 마음",
    checking_sns: "자꾸 SNS나 온라인 상태를 확인하게 되는 마음",
    fear_new_person: "상대가 다른 사람을 만날까 하는 불안",
    cant_forget: "놓고 싶어도 잘 놓이지 않는 마음",
    want_restart: "다시 시작하고 싶은 마음",
    other: "말로 다 설명하기 어려운 답답함",
  };
  return map[first] ?? "끝나지 않은 마음";
}

function contactPhrase(value: string): string {
  const map: Record<string, string> = {
    in_contact: "지금도 서로 연락이 이어지고",
    occasional: "가끔씩만 연락이 이어지고",
    no_contact: "현재는 연락을 멈춘 상태이고",
    i_blocked: "지금은 내가 상대를 차단해 둔 상태이고",
    blocked_by_partner: "상대가 나를 차단한 상태이고",
    both_blocked: "서로 연락을 막아둔 상태이고",
    unknown: "현재 연락 상태가 분명하지 않고",
  };
  return map[value] ?? "현재 연락의 거리가 생겨 있고";
}

function wishQuestion(value: string): string {
  const map: Record<string, string> = {
    natural_contact: "지금 먼저 연락해도 되는지, 조금 더 기다리는 게 나은지",
    reunion: "다시 이어지기 전에 무엇이 먼저 달라져야 하는지",
    slow_recovery: "관계를 천천히 회복하려면 지금 어떤 속도가 필요한지",
    understand_my_heart: "이 마음이 사랑인지 미련인지, 무엇이 남아 있는지",
    let_go: "붙잡아야 할 마음인지 이제 정리해도 되는 마음인지",
    apology: "사과를 먼저 건네야 할지, 기다려야 할지",
    find_direction: "지금 움직일지 기다릴지, 무엇부터 정리해야 할지",
    not_sure: "지금 가장 먼저 확인해야 할 것이 무엇인지",
  };
  return map[value] ?? "지금 무엇부터 확인해야 하는지";
}

function breakupLead(order: RitualOrderRow): string {
  if (!order.breakup_elapsed) return "";
  const elapsed = optionLabel(BREAKUP_ELAPSED_OPTIONS, order.breakup_elapsed);
  return elapsed ? `헤어진 뒤 ${elapsed} 정도가 지난 지금, ` : "";
}

export function buildInstantPreview(order: RitualOrderRow): RitualPreview {
  const name = clip(order.applicant_name, 18) || "당신";
  const partner = clip(order.partner_name, 18) || "그 사람";
  const emotion = emotionPhrase(order.current_emotion);
  const pain = painPhrase(order.pain_points);
  const contact = contactPhrase(order.contact_status);
  const lastTalk =
    optionLabel(LAST_CONVERSATION_OPTIONS, order.last_conversation) || "최근";
  const wish = wishQuestion(order.main_wish);
  const breakup = breakupLead(order);

  const highRisk = order.safety_concerns.some((v) =>
    HIGH_RISK_SAFETY_VALUES.includes(v)
  );

  const memory = clip(order.last_conversation_memory, 40);

  const line1 = sentence(
    `${name}님, 지금 ${partner}님을 향한 이 마음이 얼마나 큰지부터 알아요. ${breakup}${emotion} ${pain}이 하루를 채우고 있을 거예요.`
  );

  const line2 = memory
    ? sentence(
        `${partner}님과 ${contact}, “${memory}”가 아직 마음에 남아 있다는 점을 함께 봐야 해요.`
      )
    : sentence(
        `${partner}님과 ${contact} 마지막 대화가 ${lastTalk}였다는 점을 보면, 지금은 연락의 타이밍보다 반복된 흐름을 먼저 보는 게 중요해 보여요.`
      );

  const line3 = highRisk
    ? sentence(
        `월화는 지금 재회 가능성보다 ${name}님이 안전한 거리와 경계를 지키면서 이 관계를 바라볼 수 있는지부터 먼저 보고 있어요.`
      )
    : sentence(
        `잊으라고 하지 않을게요. 대신 그 마음을 망치지 않는 순서를, ${wish}부터 같이 볼게요.`
      );

  const letter1 = sentence(
    `${name}님, 지금 ${partner}님을 떠올릴 때 가장 먼저 올라오는 건 ${pain}인 것 같아요.`,
    195
  );
  const letter2 = memory
    ? sentence(
        `특히 마지막 대화에서 마음에 남은 “${memory}” 때문에, 끝난 장면을 마음속에서 계속 다시 확인하고 있을 수 있어요.`,
        195
      )
    : sentence(
        `${contact} 마지막 대화가 ${lastTalk}였다는 점까지 놓고 보면, 지금은 답을 서두르기보다 두 사람 사이의 거리와 반복을 먼저 봐야 해요.`,
        195
      );
  const letter3 = highRisk
    ? sentence(
        `그래서 전체 결과에서는 상대의 반응보다 ${name}님의 안전과 경계를 먼저 지키는 방향에서 다음 선택을 이어서 볼게요.`,
        195
      )
    : sentence(
        `그래서 전체 결과에서는 ${wish}부터 ${name}님의 실제 상황에 맞춰 이어서 볼게요.`,
        195
      );

  /* ---------- A~D: 연락 상태·경과 기반 기본 분석 (AI 실패 시에만 노출) ---------- */
  const blockedByPartner = ["blocked_by_partner", "both_blocked"].includes(
    order.contact_status
  );
  const early = ["within_1w", "within_1m"].includes(order.breakup_elapsed ?? "");

  const STATE: Record<string, { label: string; text: string }> = {
    in_contact: {
      label: "연락은 닿지만 방향이 멈춘 상태",
      text: `${partner}님과 연락은 이어지고 있지만, 두 사람 모두 이 관계를 어디로 가져갈지는 말하지 않고 있어요. 대화가 끊기지 않는다는 건 문이 닫히지 않았다는 뜻이고, 동시에 지금의 편안함이 깨질까 봐 서로 조심하고 있다는 뜻이기도 해요.`,
    },
    occasional: {
      label: "가끔 닿지만 거리가 정해지지 않은 사이",
      text: `가끔 이어지는 연락은 완전히 끊어낼 마음도, 다시 가까워질 준비도 아직 정해지지 않았을 때 자주 나타나는 모습이에요. 지금은 한 번의 연락이 관계의 온도를 크게 바꿀 수 있는 민감한 구간이에요.`,
    },
    no_contact: {
      label: "연락이 멈춘 채 숨을 고르는 휴지기",
      text: `지금은 두 사람 사이의 연락이 멈춰 있어요. 이 시기는 끝이라기보다, 각자 이별을 소화하는 속도가 달라서 생기는 공백인 경우가 많아요. 이 공백을 어떻게 보내느냐가 다음 연락의 무게를 정해요.`,
    },
    i_blocked: {
      label: "내가 문을 닫아 둔 상태",
      text: `${name}님이 먼저 연락을 막아 둔 상태예요. 스스로를 지키기 위해 필요했던 선택이었을 수 있어요. 지금은 그 문을 언제, 왜 다시 열고 싶은지부터 분명히 하는 게 먼저예요.`,
    },
    blocked_by_partner: {
      label: "상대가 거리를 분명히 한 상태",
      text: `${partner}님이 연락을 막아 둔 상태예요. 지금 이 거리는 존중해야 할 의사표시예요. 그렇다고 ${name}님의 마음이 틀렸다는 뜻은 아니에요. 지금은 연락보다 ${name}님 쪽의 시간을 지키는 것이 가장 중요한 단계예요.`,
    },
    both_blocked: {
      label: "서로 문을 닫아 둔 상태",
      text: `두 사람 모두 연락을 막아 둔 상태예요. 감정이 크게 부딪힌 뒤 서로를 지키려고 거리를 만든 경우가 많아요. 지금은 이 거리를 억지로 좁히기보다, 각자 가라앉을 시간이 필요한 구간이에요.`,
    },
  };
  const state =
    STATE[order.contact_status] ?? {
      label: "연락의 거리가 아직 분명하지 않은 상태",
      text: `지금 두 사람 사이의 연락 상태가 분명하지 않아요. 이럴 때는 상대의 작은 반응 하나에 하루가 흔들리기 쉬워요. 먼저 지금의 거리를 있는 그대로 보는 것부터 시작해요.`,
    };

  const MODES: Record<string, RitualPreview["partner_reading"]["modes"]> = {
    in_contact: ["익숙함", "미련"],
    occasional: ["미련", "부담"],
    no_contact: ["거리두기", "부담"],
    i_blocked: ["거리두기"],
    blocked_by_partner: ["방어"],
    both_blocked: ["방어", "감정소진"],
  };
  const modes = MODES[order.contact_status] ?? ["거리두기"];
  const readingText = blockedByPartner
    ? `차단은 대개 "더 이상 흔들리고 싶지 않다"는 방어로 읽혀요. 마음이 전혀 없어서라기보다, 지금은 감정을 다룰 여력이 없다는 신호일 때가 많아요. 그래서 지금 ${name}님에게 필요한 건 그 벽을 넘는 방법이 아니라, 그 벽을 존중하면서 ${name}님의 하루를 지키는 방법이에요.`
    : `${partner}님의 지금 모습은 '마음이 있다, 없다'로 가르기보다 ${modes.join("·")}의 결로 읽는 편이 정확해요. 이런 결의 반응은 한쪽이 다가갈수록 더 조심스러워지기 쉬워요. 그래서 지금 ${name}님에게 필요한 건 상대의 마음을 확인하는 일이 아니라, 다음 연락이 부담이 아닌 반가움이 되게 만드는 순서예요.`;

  const cautionPool: RitualPreview["cautions"] = [
    {
      action: "새벽이나 술 마신 날 보내는 장문 카톡",
      why: "마음은 진심이어도, 감정이 가장 높을 때의 문장은 상대에게 '부담'으로 먼저 도착하기 쉬워요.",
    },
    {
      action: "스토리나 프로필을 보고 바로 반응하기",
      why: "작은 반응 하나에 의미를 붙여 움직이면, 관계의 속도를 상대가 아니라 내 불안이 정하게 돼요.",
    },
    {
      action: "“우리 무슨 사이야?”처럼 관계를 확인받는 질문",
      why: "답을 요구하는 질문은 상대를 방어하게 만들고, 겨우 이어진 대화를 닫게 만들기 쉬워요.",
    },
  ];
  if (order.pain_points.includes("waiting_contact")) {
    cautionPool[2] = {
      action: "답이 없을 때 이어서 보내는 두 번째 메시지",
      why: "재촉하는 연락은 기다림을 줄여주지 않고, 상대가 답할 여유만 줄여요.",
    };
  }

  const stance: RitualPreview["now_plan"]["stance"] =
    blockedByPartner || highRisk
      ? "hold_boundary"
      : order.contact_status === "in_contact" && !early
      ? "light_contact"
      : "wait";
  const period = stance === "light_contact" ? "이번 주 안에 한 번" : early ? "앞으로 2~3주" : "앞으로 1~2주";
  const nowPlan: RitualPreview["now_plan"] =
    stance === "hold_boundary"
      ? {
          stance,
          period: "지금부터",
          why: `지금은 거리를 좁히려 할수록 상대의 방어가 더 단단해지기 쉬운 시기예요. ${name}님이 할 수 있는 가장 좋은 일은 이 거리를 존중하면서 흔들리는 하루를 붙잡는 거예요.`,
          watch: [
            "상대의 SNS를 확인하는 횟수가 줄고 있는지",
            "연락하고 싶은 충동이 올 때 멈출 수 있는지",
          ],
          decide_rule: `상대가 스스로 거리를 풀고 먼저 연락해 오기 전까지는 ${name}님 쪽에서 문을 두드리지 않는 것, 그것이 지금 지킬 기준이에요.`,
        }
      : stance === "light_contact"
      ? {
          stance,
          period,
          why: `연락이 이어지고 있는 지금은 '더 많이'보다 '더 가볍게'가 중요해요. 대화의 양을 늘리기보다, ${partner}님이 편하게 답할 수 있는 한 줄을 고르는 게 관계를 앞으로 움직여요.`,
          watch: [
            `${partner}님이 먼저 대화를 여는 날이 있는지`,
            "대화가 끝날 때 내 마음이 불안한지, 편안한지",
          ],
          decide_rule: "상대가 먼저 말을 거는 흐름이 한두 번 이어진다면, 짧은 만남을 가볍게 제안해도 되는 시점이에요.",
        }
      : {
          stance,
          period,
          why: `지금 먼저 움직이면 ${partner}님은 반가움보다 부담을 먼저 느끼기 쉬워요. 이 기간은 멈춰 있는 시간이 아니라, 다음 연락이 가볍게 도착할 수 있도록 ${name}님의 마음을 먼저 단단하게 만드는 시간이에요.`,
          watch: [
            "상대 쪽에서 스토리 반응·안부 같은 작은 신호가 오는지",
            "답이 없어도 하루가 무너지지 않는지",
          ],
          decide_rule: "이 기간이 지나고, 답이 오지 않아도 괜찮다고 스스로 말할 수 있다면 짧은 안부 한 줄을 보내도 되는 시점이에요.",
        };

  const love100 = [
    `지금 ${partner}님이 ${name}님에게 100처럼 느껴지는 건 이상한 일이 아니에요.`,
    "월하연은 사람에게 누군가를 아끼고 사랑하는 마음의 총량이 있다고 봐요. 큰 관계 하나가 끊어지면, 사람은 떠났는데 그 사람에게 향하던 관심과 습관은 갈 곳을 잃어요.",
    `그래서 지금의 100 안에는 사랑과 함께, 매일의 습관이나 함께 그리던 미래를 잃은 마음도 섞여 있을 수 있어요.`,
    "이걸 나눠 본다고 재회를 포기하라는 뜻은 아니에요. 정말 다시 만나고 싶다면, 외로움 때문에 움직이는 것과 관계를 다시 만들기 위해 움직이는 것을 구분해야 해요.",
  ];

  const preview: RitualPreview = {
    intro_lines: [line1, line2, line3],
    preview_letter_excerpt: [letter1, letter2, letter3],
    relationship_state: state,
    partner_reading: { modes, text: sentence(readingText, 415) },
    cautions: cautionPool,
    now_plan: nowPlan,
    love100,
    cta_lead_text: sentence(
      highRisk || blockedByPartner
        ? `${name}님에게 지금 가장 필요한 건 상대의 반응을 재촉하는 일이 아니라, 거리를 존중하면서 흔들리는 하루를 지키는 일이에요. 전체 결과에서는 관계가 여기까지 온 원인, 지금 지켜야 할 기준, 개인 리추얼과 24시간·7일·21일 가이드가 이어집니다.`
        : `월화가 하나는 분명히 말씀드렸어요. 지금은 마음의 크기보다 움직이는 순서가 더 중요하다는 것. 남은 건 ${wish}예요. 전체 결과에서는 연락 타이밍과 방식, 첫 메시지 방향, 상대 반응별 대응, 관계가 깨진 원인과 반복되지 않기 위한 조건까지 이어집니다.`,
      415
    ),
  };

  return PreviewSchema.parse(preview);
}

/* ---------- AI 미리보기 (실패 시 null → 즉석 템플릿 폴백) ---------- */

/* 실측: 성공 시 보통 15~28초, 사연이 길면 25초를 넘기기도 한다 (9/26 실측
   1차 시도 25초 초과 → 템플릿 폴백 노출). 미리보기는 결제 직전 핵심 화면이라
   템플릿 노출을 최소화해야 하므로 여유를 크게 둔다 (route maxDuration 60초). */
const PREVIEW_AI_TIMEOUT_MS = 50_000;
const PREVIEW_AI_MAX_TOKENS = 2400;

function getPreviewModelId(): string {
  /* 무료 분석은 결제 전환의 핵심 — 문장 정확도를 위해 Sonnet 기본 (운영자 선택 9/30) */
  return process.env.PREVIEW_ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";
}

/* 두 부분을 병렬로 생성해 대기 시간을 절반으로 (Sonnet 단일 호출 실측 44~49초 → 한계 근접) */
const PART_A_KEYS = ["intro_lines", "preview_letter_excerpt", "love100", "cta_lead_text"] as const;
const PART_B_KEYS = ["relationship_state", "partner_reading", "cautions", "now_plan"] as const;
const PreviewStructA = PreviewStructSchema.pick({
  intro_lines: true,
  preview_letter_excerpt: true,
  love100: true,
  cta_lead_text: true,
});
const PreviewStructB = PreviewStructSchema.pick({
  relationship_state: true,
  partner_reading: true,
  cautions: true,
  now_plan: true,
});

async function callPart(
  client: Anthropic,
  order: RitualOrderRow,
  keys: readonly string[],
  schema: typeof PreviewStructA | typeof PreviewStructB,
  label: string
): Promise<Record<string, unknown> | null> {
  const t0 = Date.now();
  try {
    const message = await client.messages.create(
      {
        model: getPreviewModelId(),
        max_tokens: PREVIEW_AI_MAX_TOKENS,
        system: PREVIEW_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `${buildPreviewUserPrompt(order)}\n\n[이번 요청의 출력 범위]\n이번에는 다음 항목만 작성합니다: ${keys.join(", ")}. 나머지 항목은 다른 요청에서 작성되므로 쓰지 않습니다. 모든 규칙은 그대로 지킵니다.`,
          },
        ],
        output_config: { format: zodOutputFormat(schema) },
      },
      { timeout: PREVIEW_AI_TIMEOUT_MS }
    );
    if (message.stop_reason === "max_tokens" || message.stop_reason === "refusal") {
      console.error(`[preview] ai_${label}_stop=${message.stop_reason} ms=${Date.now() - t0}`);
      return null;
    }
    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    console.error(`[preview] ai_${label}_ms=${Date.now() - t0}`);
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    console.error(`[preview] ai_${label}_failed ms=${Date.now() - t0}`);
    return null;
  }
}

async function buildAiPreview(
  order: RitualOrderRow
): Promise<RitualPreview | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;

  const t0 = Date.now();
  const client = new Anthropic({ apiKey, maxRetries: 0 });
  const [partA, partB] = await Promise.all([
    callPart(client, order, PART_A_KEYS, PreviewStructA, "a"),
    callPart(client, order, PART_B_KEYS, PreviewStructB, "b"),
  ]);
  if (!partA || !partB) {
    console.error(`[preview] ai_failed ms=${Date.now() - t0}`);
    return null;
  }

  const parsed = PreviewSchema.safeParse({ ...partA, ...partB });
  if (!parsed.success) {
    const paths = parsed.error.issues
      .slice(0, 4)
      .map((i) => `${i.path.join(".")}:${i.code}`)
      .join(",");
    console.error(`[preview] ai_schema_invalid ms=${Date.now() - t0} ${paths}`);
    return null;
  }
  const banned = previewBannedMatch(parsed.data);
  if (banned) {
    console.error(`[preview] ai_banned_phrase ms=${Date.now() - t0} hit=${banned}`);
    return null;
  }
  console.error(`[preview] ai_ok ms=${Date.now() - t0}`);
  return parsed.data;
}

export async function getOrCreatePreview(
  orderNumber: string,
  submissionId: string | null,
  tokenAuthorized = false,
  continueAuthorized = false
): Promise<PreviewOutcome> {
  try {
    const supabase = getSupabaseAdmin();

    const res = await supabase
      .from("ritual_orders")
      .select("*")
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (res.error || !res.data) return { status: "not_found" };

    const order = res.data as RitualOrderRow & {
      id: string;
      submission_id: string | null;
    };

    if (
      !tokenAuthorized &&
      !continueAuthorized &&
      (!submissionId ||
        !order.submission_id ||
        order.submission_id !== submissionId)
    ) {
      return { status: "not_found" };
    }

    if (continueAuthorized && order.payment_status !== "pending") {
      return { status: "not_found" };
    }

    /* 이미 정상 preview가 있으면 즉시 재사용 */
    if (order.preview_content) {
      const cached = PreviewSchema.safeParse(order.preview_content);
      if (cached.success) {
        return {
          status: "ready",
          preview: cached.data,
          applicantName: order.applicant_name,
          paymentAmount: resolveOrderPrice(order.payment_amount),
          generated: true,
        };
      }
    }

    /* AI 미리보기 우선 — 실패/초과 시 즉석 템플릿으로 자동 대체.
       템플릿 폴백은 저장하지 않는다: 저장하면 그 주문은 영원히 템플릿에
       갇히므로, 폴백은 화면만 채우고 다음 방문에서 AI를 다시 시도한다. */
    const ai = await buildAiPreview(order);
    const preview = ai ?? buildInstantPreview(order);

    if (ai) {
      const save = await supabase
        .from("ritual_orders")
        .update({
          preview_content: preview,
          preview_generated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (save.error) {
        /* 저장 실패가 무료 화면을 막으면 안 된다. 현재 preview는 그대로 반환한다. */
        console.error(`[preview] ai_save_failed code=${save.error.code}`);
      }
    }

    return {
      status: "ready",
      preview,
      applicantName: order.applicant_name,
          paymentAmount: resolveOrderPrice(order.payment_amount),
      generated: ai !== null,
    };
  } catch (e) {
    console.error(
      `[preview] instant_server_error type=${
        e instanceof Error ? e.name : "unknown"
      }`
    );
    return { status: "server_error" };
  }
}
