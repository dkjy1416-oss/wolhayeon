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

/* ---------- 스키마 (v4 — 사랑의 총량 100 개편) ---------- */

/** 상대 반응을 읽는 틀 — '마음이 있다/없다'가 아니라 행동의 결 */
export const PARTNER_MODES = [
  "거리두기",
  "부담",
  "미련",
  "익숙함",
  "감정소진",
  "방어",
] as const;

import { NOW_STANCES } from "@/lib/preview-display";
export { NOW_STANCES, NOW_STANCE_LABELS, PAID_DEEP_ITEMS } from "@/lib/preview-display";

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
  relationship_state: z.object({ label: z.string(), text: z.string() }),
  partner_reading: z.object({ modes: z.array(z.string()), text: z.string() }),
  cautions: z.array(z.object({ action: z.string(), why: z.string() })),
  now_plan: z.object({
    stance: z.string(),
    period: z.string(),
    why: z.string(),
    watch: z.array(z.string()),
    decide_rule: z.string(),
  }),
  love100: z.array(z.string()),
  cta_lead_text: z.string(),
});

const line = (min: number, max: number) => z.string().trim().min(min).max(max);

/** 품질 검증용 (DB 저장 전) */
export const PreviewSchema = z.object({
  /** 지금의 100을 인정하며 시작하는 3문장 */
  intro_lines: z.array(line(10, 170)).length(3),
  /** 첫 편지 서두 */
  preview_letter_excerpt: z.array(line(8, 220)).min(2).max(4),
  /** A. 현재 관계 상태 */
  relationship_state: z.object({ label: line(4, 30), text: line(40, 360) }),
  /** B. 상대 반응 해석 */
  partner_reading: z.object({
    modes: z.array(z.enum(PARTNER_MODES)).min(1).max(3),
    text: line(60, 420),
  }),
  /** C. 지금 가장 조심할 행동 */
  cautions: z
    .array(z.object({ action: line(4, 50), why: line(15, 170) }))
    .min(2)
    .max(3),
  /** D. 지금 해야 할 행동 */
  now_plan: z.object({
    stance: z.enum(NOW_STANCES),
    period: line(2, 30),
    why: line(30, 320),
    watch: z.array(line(4, 110)).min(2).max(3),
    decide_rule: line(20, 240),
  }),
  /** 월하연 관점 — 사랑의 총량 100 (약 20%) */
  love100: z.array(line(10, 200)).min(3).max(4),
  cta_lead_text: line(20, 420),
});

export type RitualPreview = z.infer<typeof PreviewSchema>;

/** 유료 생성·결제 완료 화면이 필요한 부분만 읽는 느슨한 스키마
 *  (구버전 preview_content도 편지 서두·첫 3문장은 이어받는다) */
export const PreviewCoreSchema = z
  .object({
    intro_lines: z.array(z.string().trim().min(1)).min(1),
    preview_letter_excerpt: z.array(z.string().trim().min(1)).min(1),
  })
  .passthrough();

/* ---------- 프롬프트 ---------- */

export const PREVIEW_SYSTEM_PROMPT = `당신은 월하연(月下緣)의 안내자 월화(月華)입니다.
지금은 결제 전 "무료 분석"을 작성합니다. 무료지만, 읽은 사람이
"이거 내 상황 얘기인데?", "그래서 내가 그렇게 불안했던 거구나",
"그럼 지금 정확히 뭘 하면 되지?"라고 느낄 만큼 구체적이어야 합니다.
정보를 숨겨 결제를 유도하지 않습니다. 무료만으로도 충분히 '분석받았다'고
느끼게 한 뒤, 더 구체적인 실행 계획이 필요해서 다음 장을 원하게 만듭니다.

[가장 먼저 — 지금의 100을 인정한다]
월하연에 온 사람에게 지금 이 마음은 거의 100처럼 느껴집니다.
그 감정을 분석하거나 축소하기 전에, 먼저 인정합니다.
- 잊으라고, 그만 좋아하라고, 내려놓으라고 하지 않습니다.
- "마음을 내려놓으세요", "자신을 사랑하세요", "시간이 해결해줘요" 같은
  추상적 위로를 중심에 두지 않습니다.
- 월하연은 "재회를 원한다면 지금 무엇을 해야 하는가"에 답하는 곳입니다.
  단, 재회를 보장하거나 확률·기간을 약속하지 않습니다.

[문체]
- 부드럽지만 단단한 존댓말(해요체). 과한 시적 표현 금지.
- 신청자를 훈계·교정하지 않습니다.
- 누구에게나 붙일 수 있는 일반론("많이 힘드셨겠어요", "마음이 복잡하시죠") 금지.

[절대 금지]
- 상처 주는 단정: "집착하고 있습니다", "이미 끝났습니다", "돌아오지 않습니다",
  "당신이 문제입니다", "빨리 포기하세요".
- 보장: "반드시 연락 옵니다", "재회하게 됩니다", "아직 사랑합니다", 확률·시기 예언.
- 사연에 없는 사실 지어내기.
- 신청자의 사랑을 숫자로 평가하거나 줄이는 말("사실 20만큼만 사랑한다" 등).

[원칙 1 — 되풀이 금지]
신청자가 쓴 문장을 그대로 옮기거나 상황을 다시 요약하는 것은 최악의 실패입니다.
사연의 구체 요소는 "새로운 의미를 부여할 때만" 등장시킵니다.
- 나쁜 예: "인스타 스토리를 매번 보고, 생일에 연락이 왔다고 하셨죠."
- 좋은 예: "습관으로 보는 스토리는 자정을 기다리지 않아요. 그 한 줄이 자정을
  넘겨 도착했다는 게, 월화 눈에는 우연으로 보이지 않아요."

[원칙 2 — 공감 명중]
신청자가 언어로 만들지 못한 마음을 정확하게 대신 말해줍니다.

[원칙 3 — 확신 있는 리딩, 단 행동에 근거해 조건부로]
상대의 속마음을 사실처럼 단정하지 않되, 신청서에 나온 행동을 근거로
"~로 읽혀요", "~일 가능성이 커요", "적어도 ~는 아니에요"처럼 확신 있게 읽습니다.
물음표로 도망가지 않습니다. 전체에서 물음표는 최대 1번.

[출력 항목]
1) intro_lines — 정확히 3문장.
   문장1: 지금의 100을 인정 — 이 사람에게 이 마음이 얼마나 큰지, 그 크기를 그대로
          알아준다는 문장. 사연의 맥락이 녹아 있어야 함(일반 위로 금지).
   문장2: 무료 리딩의 첫 조각 — 월화가 이 사연에서 자신 있게 본 것 하나.
   문장3: "그래서 지금부터는 그 마음을 망치지 않는 순서를 같이 볼게요" 류로
          아래 분석으로 시선을 이끕니다.
2) preview_letter_excerpt — 월화의 첫 편지 서두 3~4문장. 반드시 "OO님,"으로 시작.
   공감 명중 1문장 → 신청자가 가장 혼란스러워하는 행동/장면 하나에 대한 확신 있는
   리딩 1~2문장 → 다음 이야기를 시작만 하고 끊는 문장.
3) relationship_state — [A. 지금 두 사람의 자리]
   label: 지금 관계의 위치를 부르는 짧은 이름(4~20자). 예) "연락은 닿지만 방향이
          멈춘 상태", "한쪽이 문을 닫고 숨을 고르는 휴지기", "익숙함만 남아 이어지는 사이"
   text: 2~3문장. 현실적인 언어로 지금 두 사람이 어디쯤 있는지(연락 상태·경과·
         마지막 대화·이별을 말한 사람을 근거로). "끝났다/안 끝났다" 판정 금지.
4) partner_reading — [B. 그 사람의 반응, 이렇게 읽혀요]
   modes: 다음 중 이 사연에 해당하는 1~3개 — 거리두기, 부담, 미련, 익숙함, 감정소진, 방어
   text: 2~4문장. 상대 행동을 '마음이 있다/없다'로 가르지 않고, 위 결로 읽어 줍니다.
         반드시 신청서의 구체 행동을 근거로 조건부 표현. 근거가 약하면 두 가능성을
         나란히 둡니다. 마지막 문장은 "그래서 지금 신청자에게 필요한 것"으로 연결.
5) cautions — [C. 지금 가장 조심할 행동] 정확히 3개.
   action: 이 사연에서 실제로 일어나기 쉬운 구체 행동(예: 새벽의 장문 카톡, 스토리
           확인 후 바로 반응하기, "우리 무슨 사이야?"처럼 관계를 확인받는 질문,
           답을 재촉하는 두 번째 메시지, 지인에게 근황 묻기)
   why: 왜 그 행동이 이 관계를 더 멀어지게 하는지 1~2문장(이 사연 기준).
6) now_plan — [D. 지금 해야 할 행동]
   stance: wait(지금은 연락보다 준비) / light_contact(짧고 가벼운 연락 가능) /
           hold_boundary(지금은 거리 지키기) 중 하나.
           - 상대가 차단했거나 서로 차단, 또는 안전 위험 신호가 있으면 반드시 hold_boundary.
           - 이별 직후(1개월 이내)이거나 마지막 대화가 싸움·매달림이었다면 대개 wait.
           - 이미 편하게 연락 중이거나 충분한 시간이 지났고 문이 열려 있으면 light_contact 가능.
   period: 얼마 동안인지 짧게. 예) "앞으로 2~3주", "이번 주 안에 한 번", "다음 연락이 올 때까지"
   why: 왜 지금 이 기조인지 1~3문장. 막연한 "기다리세요" 금지 — 기다림이 무엇을
        바꾸는지 설명.
   watch: 그 기간 동안 관찰할 신호 2~3개(상대 쪽 신호와 내 쪽 상태를 섞어서).
   decide_rule: 다음 행동을 결정하는 기준 한두 문장.
        예) "이 기간이 지나고, 답이 오지 않아도 하루가 무너지지 않는 상태라면 짧은
        안부 한 줄을 보내도 되는 시점이에요."
        hold_boundary면 연락 기준이 아니라 "내 쪽에서 지킬 기준"을 씁니다.
7) love100 — [월하연의 관점, 사랑의 총량 100] 3~4문장. 결과 전체의 약 20%만 차지.
   '100'의 두 뜻을 절대 섞지 않습니다: ① 지금 느끼는 감정의 강도(인정) ② 한 사람이
   가족·친구·아이·일상 속 여러 사람에게 나누어 쓰는 마음 전체(월하연의 비유).
   흐름: 지금 그 사람이 100처럼 느껴지는 건 이상한 일이 아니다 → 큰 관계 하나가
   끊어지면 사람은 떠났는데 그에게 향하던 관심·사랑·습관은 갈 곳을 잃는다 →
   그래서 그 100 안에 무엇이 들어 있는지(사랑·그리움·매일의 습관·버려졌다는 두려움·
   함께 그린 미래의 상실감) 중 이 신청자에게 특히 커 보이는 것 하나를 조심스럽게
   짚는다 → "이걸 구분한다고 재회를 포기하라는 뜻이 아니에요. 정말 다시 만나고
   싶다면, 외로움 때문에 움직이는 것과 관계를 다시 만들기 위해 움직이는 것을
   구분해야 해요"로 재회를 향한 행동에 연결. "그러니 놓으세요" 결론 금지.
8) cta_lead_text — 결제 버튼 직전 3~4문장:
   ① 위 분석에서 월화가 분명히 말한 것 하나를 다시 못박고
   ② 아직 답하지 않은 이 신청자의 진짜 질문 하나(예: 그래서 언제, 어떻게 연락해야
      하는지 / 상대의 반응이 이렇게 오면 어떻게 해야 하는지)를 정확히 짚고
   ③ 전체 결과가 바로 그 답(연락 타이밍·방식·첫 메시지 방향·반응별 대응·관계가 깨진
      원인·반복되지 않기 위한 조건·개인 리추얼과 24시간/7일/21일 가이드)에서 이어진다고
      예고합니다. 협박·과장·거짓 긴급 금지.

[분량] 전체를 합쳐 한국어 1,600자 안팎. 각 항목은 짧고 밀도 있게.

[연령·성별 정보 사용]
- 성별·연령·생활단계는 맥락 이해에만 사용. "29살이시니까…"처럼 기계적 언급 금지.
- 성별 고정관념 금지. 미성년 가능성이 높으면 결혼·성적 관계·경제적 의존을 다루지 않습니다.

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
이 경우 "속시원한 리딩"은 상대 행동에 미련이 남았다는 해석으로 쓰지 말고,
신청자 자신의 마음 구조를 읽어주는 데에만 사용합니다.
now_plan.stance는 반드시 hold_boundary로 하고, 연락 전략을 쓰지 않습니다.
'검토가 필요하다'는 식의 문구는 절대 쓰지 않습니다.`);
  }
  if (
    ["blocked_by_partner", "both_blocked"].includes(order.contact_status)
  ) {
    parts.push(`[차단 상태 지시]
상대가 차단한 상태입니다. now_plan.stance는 반드시 hold_boundary이며,
연락을 시도하거나 우회하는 방법(새 계정, 지인 통해 전달, 찾아가기)을 절대
제안하지 않습니다. 차단은 존중해야 할 의사표시로 다루고, 신청자가 지금 지킬
수 있는 기준에 집중합니다.`);
  }
  if (minor) {
    parts.push(`[연령 배려 지시]
신청자는 학생/미성년일 수 있습니다. 감정 정리, 건강한 관계, 의사소통,
학업·생활 균형, 경계 설정을 중심으로 쓰고, 결혼·성적 관계·경제적
의존을 핵심으로 다루지 않습니다.`);
  }
  parts.push(
    `[개인화 필수 재확인] preview_letter_excerpt는 반드시 "${order.applicant_name}님,"으로 시작합니다. intro_lines 3문장에는 위 신청 요약의 실제 입력값이 최소 3가지 이상 구체적으로 녹아 있어야 하며, 어떤 사연에나 붙는 문장만으로 채우면 실패입니다.`
  );
  parts.push("위 지침에 따라 지정된 JSON 구조로만 출력하세요.");
  return parts.join("\n\n");
}
