/**
 * 결제 전 무료 미리보기 생성 (서버 전용).
 *
 * 무료 단계는 결제 전 전환 UX이므로 외부 생성 API 응답을 기다리지 않는다.
 * ritual_orders에 이미 저장된 실제 신청값을 조합해 즉시 개인화 preview를 만든다.
 * 전체 유료 결과 생성 구조는 변경하지 않는다.
 */
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  PreviewSchema,
  type RitualPreview,
} from "@/lib/ritual-preview-schema";
import type { RitualOrderRow } from "@/lib/supabase/types";
import {
  RELATIONSHIP_TYPE_OPTIONS,
  RELATIONSHIP_DURATION_OPTIONS,
  BREAKUP_ELAPSED_OPTIONS,
  LAST_CONVERSATION_OPTIONS,
  MAIN_WISH_OPTIONS,
  optionLabel,
} from "@/lib/ritual-types";
import { HIGH_RISK_SAFETY_VALUES } from "@/lib/wolhwa-prompt";

export type PreviewOutcome =
  | { status: "ready"; preview: RitualPreview; applicantName: string }
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
  const relationship =
    optionLabel(RELATIONSHIP_TYPE_OPTIONS, order.relationship_type) || "두 사람의 관계";
  const duration =
    optionLabel(RELATIONSHIP_DURATION_OPTIONS, order.relationship_duration) || "";
  const breakup = breakupLead(order);
  const wishLabel =
    optionLabel(MAIN_WISH_OPTIONS, order.main_wish) || "앞으로의 방향을 알고 싶다";

  const highRisk = order.safety_concerns.some((v) =>
    HIGH_RISK_SAFETY_VALUES.includes(v)
  );

  const memory = clip(order.last_conversation_memory, 28);
  const desired = clip(order.desired_change, 30);

  const line1 = sentence(
    `${name}님은 ${breakup}${emotion}, 특히 ${pain}이 가장 크게 남아 있어 보여요.`
  );

  const line2 = memory
    ? sentence(
        `${partner}님과 ${contact} 마지막 대화에서 “${memory}”가 마음에 남아 있다는 점을 함께 봐야 해요.`
      )
    : sentence(
        `${partner}님과 ${contact} 마지막 대화가 ${lastTalk}였다는 점을 보면, 지금은 연락의 타이밍보다 반복된 흐름을 먼저 보는 게 중요해 보여요.`
      );

  const line3 = highRisk
    ? sentence(
        `월화는 지금 재회 가능성보다 ${name}님이 안전한 거리와 경계를 지키면서 이 관계를 바라볼 수 있는지부터 먼저 보고 있어요.`
      )
    : sentence(
        `월화는 지금 ${wish}를 다음 이야기에서 가장 먼저 이어서 짚어보려 해요.`
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

  const relationshipSummary = sentence(
    duration
      ? `${duration} 동안 이어진 ${relationship}에서 가까워지고 멀어지는 흐름이 어디서 반복됐는지 정리합니다.`
      : `${relationship} 안에서 가까워지고 멀어지는 흐름이 어디서 반복됐는지 정리합니다.`,
    150
  );

  const repeatedSummary = sentence(
    desired
      ? `${name}님이 “${desired}”라고 바란 부분이 실제로 달라지려면 무엇부터 바뀌어야 하는지 짚습니다.`
      : `${contact} 상태와 마지막 대화를 함께 놓고, 지금 반복되고 있는 접근과 거리두기 흐름을 짚습니다.`,
    150
  );

  const trueWishSummary = sentence(
    `“${wishLabel}”라는 바람 뒤에 ${name}님이 실제로 원하는 관계의 모습을 더 깊게 확인합니다.`,
    150
  );

  const preview: RitualPreview = {
    intro_lines: [line1, line2, line3],
    preview_letter_excerpt: [letter1, letter2, letter3],
    preview_cards: [
      {
        key: "relationship_story",
        title: "두 사람의 관계에서 반복된 흐름",
        summary: relationshipSummary,
      },
      {
        key: "current_emotion",
        title: "왜 아직 이 사람이 마음에 남아 있는지",
        summary: sentence(
          `${emotion} ${pain}이 커지는 이유를 지금 관계의 맥락 안에서 봅니다.`,
          150
        ),
      },
      {
        key: "repeated_pattern",
        title: "다시 만난다면 달라져야 할 부분",
        summary: repeatedSummary,
      },
      {
        key: "true_wish",
        title: "내가 정말 원하는 것은 무엇인지",
        summary: trueWishSummary,
      },
      {
        key: "guides",
        title: "지금 연락할지, 기다릴지",
        summary: sentence(
          `${wish}에 맞춰 24시간·7일·21일 행동 가이드가 이어집니다.`,
          150
        ),
      },
    ],
    cta_lead_text: sentence(
      highRisk
        ? `${name}님이 들려준 이야기에서 가장 먼저 필요한 건 상대의 반응을 재촉하는 일이 아니라, 안전한 거리와 내 마음의 기준을 다시 세우는 일이에요. 전체 결과에서는 관계의 흐름과 경계, 지금 할 수 있는 행동, 개인 리추얼과 24시간·7일·21일 가이드가 이어집니다.`
        : `${name}님이 들려준 이야기에서 가장 궁금한 부분은 아직 남아 있어요. 전체 결과에서는 ${wish}를 중심으로 두 사람의 관계 흐름, 지금 할 수 있는 행동, 개인 리추얼과 24시간·7일·21일 가이드가 이어집니다.`,
      380
    ),
  };

  return PreviewSchema.parse(preview);
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
        };
      }
    }

    /* 외부 생성 API 호출 없이 실제 신청값으로 즉시 개인화 */
    const preview = buildInstantPreview(order);

    const save = await supabase
      .from("ritual_orders")
      .update({
        preview_content: preview,
        preview_generated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (save.error) {
      /* 저장 실패가 무료 화면을 막으면 안 된다. 현재 preview는 그대로 반환한다. */
      console.error(`[preview] instant_save_failed code=${save.error.code}`);
    }

    return {
      status: "ready",
      preview,
      applicantName: order.applicant_name,
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
