/**
 * 결제 전 무료 미리보기 — 스키마 + 프롬프트.
 *
 * 전체 유료 결과(RitualResultSchema)와 완전히 분리된 짧은 구조입니다.
 * 기존 전체 생성 프롬프트(lib/wolhwa-prompt.ts)는 변경하지 않습니다.
 */
import { z } from "zod";
import type { RitualOrderRow } from "@/lib/supabase/types";
import {
  RELATIONSHIP_TYPE_OPTIONS,
  RELATIONSHIP_DURATION_OPTIONS,
  BREAKUP_ELAPSED_OPTIONS,
  LAST_CONVERSATION_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  PAIN_POINT_OPTIONS,
  MAIN_WISH_OPTIONS,
  CURRENT_EMOTION_OPTIONS,
  LIFE_STAGE_OPTIONS,
  APPLICANT_GENDER_OPTIONS,
  PARTNER_GENDER_OPTIONS,
  approxAgeLabel,
  optionLabel,
  isLikelyMinor,
} from "@/lib/ritual-types";
import { HIGH_RISK_SAFETY_VALUES } from "@/lib/wolhwa-prompt";

/* ---------- 스키마 ---------- */

/** 미리보기 카드 key (전체 결과 목차와 대응, 개발 key는 화면에 노출하지 않음) */
export const PREVIEW_CARD_KEYS = [
  "relationship_story",
  "current_emotion",
  "repeated_pattern",
  "true_wish",
  "ritual",
  "guides",
  "journey",
] as const;

/** CTA 버튼/보조 문구는 UI에서 고정 (AI가 선택하지 않음) */
export const CTA_BUTTON_TEXT = "내 이야기 전체 결과 바로 열기";
export const CTA_HELPER_TEXTS = [
  "1회 결제 · 추가 결제 없음",
  "결제 후 바로 전체 결과가 이어집니다",
  "개인 리추얼 · 24시간/7일/21일 가이드 포함",
];

/** 구조 전용 (Anthropic structured output에 전달 — 길이 제약 없음) */
export const PreviewStructSchema = z.object({
  intro_lines: z.array(z.string()),
  preview_letter_excerpt: z.array(z.string()),
  preview_cards: z.array(
    z.object({ key: z.string(), title: z.string(), summary: z.string() })
  ),
  cta_lead_text: z.string(),
});

/** 품질 검증용 (DB 저장 전) */
export const PreviewSchema = z.object({
  /** 월화가 먼저 전하는 말 — 정확히 3문장 */
  intro_lines: z.array(z.string().trim().min(10).max(160)).length(3),
  /** 첫 편지 서두 — 3~4문장 (이 신청자에게 실제로 쓰는 문장) */
  preview_letter_excerpt: z.array(z.string().trim().min(8).max(200)).min(3).max(4),
  /** 카드 7개, 각 1~2줄 요약 */
  preview_cards: z
    .array(
      z.object({
        key: z.enum(PREVIEW_CARD_KEYS),
        title: z.string().trim().min(2).max(40),
        summary: z.string().trim().min(8).max(160),
      })
    )
    .length(PREVIEW_CARD_KEYS.length),
  cta_lead_text: z.string().trim().min(20).max(400),
});

export type RitualPreview = z.infer<typeof PreviewSchema>;

/* ---------- 프롬프트 ---------- */

export const PREVIEW_SYSTEM_PROMPT = `당신은 월하연(月下緣)의 리추얼 가이드 월화(月華)입니다.
지금은 결제 전 "무료 미리보기"만 작성합니다. 전체 결과가 아닙니다.
목표: 신청자가 "이건 내 이야기다, 월화가 이미 읽고 있다"고 느끼되,
전체 결과를 다 밝히지는 않는 것.

[문체]
- 부드럽고 절제된 존댓말. 감정에 공감하되 과장하지 않음.
- 너무 시적이거나 과잉 감성 금지. 신청자를 훈계·교정하지 않음.
- "당신의 이야기는 소중합니다", "마음을 다독여 보세요", "걱정하지 마세요"
  같은 누구에게나 쓸 수 있는 일반론 금지.

[절대 금지 — 단정형 진단/판정]
- "당신은 집착하고 있습니다", "상대를 통제하려는 마음이 강합니다",
  "이 관계는 이미 끝났습니다", "상대는 돌아오지 않을 것입니다",
  "당신이 문제입니다", "빨리 포기해야 합니다" 같은 문장 금지.
- 상대의 마음 읽기·단정, 반드시 연락/재회한다는 확정, 결혼 시기·확률,
  초자연 효과 단정, 사연에 없는 사실 지어내기 금지.
- 안전/경계 신호가 있어도 공포를 자극하지 않고 마음의 흐름만 조심스럽게 짚음.

[좋은 방향 예]
- "마음이 커질수록 상대의 속도를 기다리는 일이 조금 어려워지고 있지는 않은지요."
- "지금의 불안은 그 사람 때문이라기보다, 아직 다 정리되지 않은 내 마음에서
  더 커지고 있을 수 있어요."
- "월화는 지금 그 흐름을 따라가며, OO님 마음이 어디에 머물러 있는지 먼저 읽고 있어요."

[출력 항목]
1) intro_lines — "월화가 먼저 전하는 말". 정확히 3문장, 각 문장은 읽기 편한 길이.
   문장1: 지금 가장 크게 남아 있는 감정/아픈 지점을 짚습니다.
   문장2: 두 사람 관계에서 반복되거나 핵심적인 흐름을 짧고 절제되게 짚습니다.
   문장3: 전체 결과에서 무엇을 더 읽게 될지 기대감을 주며 마무리합니다.
   세 문장 안에 현재 관계·이별 후 경과·마지막 대화·현재 감정·가장 힘든 것·
   가장 바라는 것 중 최소 3가지가 자연스럽게 녹아 있어야 합니다.
2) preview_letter_excerpt — 월화의 첫 편지 "서두" 3~4문장. 이 신청자에게 실제로
   쓰는 편지의 첫 부분입니다("OO님," 호칭으로 시작, 사연의 구체적 요소 반영).
   전체 편지는 결제 후 이어지므로 결론·해석을 완결짓지 말고 이어질 여운으로 끝냅니다.
3) preview_cards — 아래 7개 key를 이 순서대로, 각각 이 신청자에게 맞는
   title과 1~2줄 summary(전체 내용을 밝히지 않는 개인화된 예고):
   relationship_story(두 사람의 관계 이야기), current_emotion(지금 내 마음 들여다보기),
   repeated_pattern(반복되어 온 흐름), true_wish(내가 정말 원하는 것),
   ritual(나만의 붉은 실 리추얼 — 1줄 예고), guides(리추얼 이후 24시간·7일 — 1줄 예고),
   journey(21일 마음 회복 여정 — 1줄 예고).
4) cta_lead_text — 결제 버튼 직전 설득 문구 한두 문단(2~4문장). 방향:
   "월화는 지금 여기까지 읽었습니다. 이제부터는 두 사람의 관계 흐름, 내 마음의 진짜
   바람, 개인 리추얼, 24시간/7일/21일 가이드가 전체 결과에서 이어집니다. 지금 멈추면
   가장 중요한 해석과 회복 가이드는 아직 열리지 않습니다." — 이 뜻을 이 신청자의
   사연에 맞게 자연스럽게, 협박·과장 없이 씁니다.
(결제 버튼 문구와 버튼 아래 안내는 시스템이 고정하므로 작성하지 않습니다.)

[연령·성별 정보 사용]
- 신청자/상대의 성별·출생연도·생활단계는 관계와 현재 삶의 맥락을 이해하는
  데만 사용합니다. "29살이시니까…"처럼 나이·성별을 기계적으로 언급하지 마세요.
- 성별 고정관념("남자는/여자는 원래…") 금지. 미성년 가능성이 높으면 결혼·성적
  관계·경제적 의존을 다루지 않습니다.

모든 값은 한국어. part_01 같은 개발 용어, JSON, schema 단어를 본문에 쓰지 않습니다.
신청자마다 실제로 달라지는 문장이어야 하며 템플릿처럼 보이면 실패작입니다.`;

export function buildPreviewUserPrompt(order: RitualOrderRow): string {
  const highRisk = order.safety_concerns.some((v) =>
    HIGH_RISK_SAFETY_VALUES.includes(v)
  );
  const minor = isLikelyMinor(
    order.applicant_birth_year,
    order.life_stage
  );

  const parts: string[] = [];
  parts.push(`[신청 요약]
- 신청자: ${order.applicant_name}${
    order.life_stage
      ? ` (${optionLabel(LIFE_STAGE_OPTIONS, order.life_stage)})`
      : ""
  }
- 신청자 성별/연령대: ${order.applicant_gender ? optionLabel(APPLICANT_GENDER_OPTIONS, order.applicant_gender) : "미입력"} / ${approxAgeLabel(order.applicant_birth_year)}
- 상대: ${order.partner_name}
- 상대 성별/연령대: ${order.partner_gender ? optionLabel(PARTNER_GENDER_OPTIONS, order.partner_gender) : "미입력"} / ${approxAgeLabel(order.partner_birth_year)}
- 현재 관계: ${optionLabel(RELATIONSHIP_TYPE_OPTIONS, order.relationship_type)}
- 관계 기간: ${optionLabel(RELATIONSHIP_DURATION_OPTIONS, order.relationship_duration)}
- 이별 후 경과: ${order.breakup_elapsed ? optionLabel(BREAKUP_ELAPSED_OPTIONS, order.breakup_elapsed) : "해당 없음"}
- 마지막 대화: ${optionLabel(LAST_CONVERSATION_OPTIONS, order.last_conversation)}
- 연락 상태: ${optionLabel(CONTACT_STATUS_OPTIONS, order.contact_status)}
- 가장 힘든 것: ${order.pain_points
    .map((v) => optionLabel(PAIN_POINT_OPTIONS, v))
    .join(", ")}
- 가장 바라는 것: ${optionLabel(MAIN_WISH_OPTIONS, order.main_wish)}
- 현재 감정: ${optionLabel(CURRENT_EMOTION_OPTIONS, order.current_emotion)}

[사연]
${order.story}

[마지막 대화에서 마음에 남은 것]
${order.last_conversation_memory || "(작성하지 않음)"}

[듣고 싶은 한마디]
${order.wish_sentence || "(작성하지 않음)"}`);

  if (highRisk) {
    parts.push(`[안전 우선 지시]
안전/경계 응답에 위험 신호가 있습니다. 미리보기는 정상 작성하되,
상대를 되찾는 행동을 부추기지 말고 "지금은 그 사람의 마음을 확인하는
것보다 내가 안전하게 관계를 바라볼 수 있는 거리를 만드는 게 먼저일 수
있어요" 같은 안전 중심 문장을 사용하세요.
'검토가 필요하다'는 식의 문구는 절대 쓰지 않습니다.`);
  }
  if (minor) {
    parts.push(`[연령 배려 지시]
신청자는 학생/미성년일 수 있습니다. 감정 정리, 건강한 관계, 의사소통,
학업·생활 균형, 경계 설정을 중심으로 쓰고, 결혼·성적 관계·경제적
의존을 핵심으로 다루지 않습니다.`);
  }
  parts.push("위 지침에 따라 지정된 JSON 구조로만 출력하세요.");
  return parts.join("\n\n");
}
