/**
 * 월화(月華) 페르소나 system prompt + 신청 데이터 → user prompt 빌더.
 *
 * 모델에 전달되는 모든 지시가 이 파일에 모여 있습니다.
 * (페르소나·금지 사항·안전 분기·개인화 기준·JSON 출력 형식)
 */
import type { RitualOrderRow } from "@/lib/supabase/types";
import {
  RELATIONSHIP_TYPE_OPTIONS,
  RELATIONSHIP_DURATION_OPTIONS,
  BREAKUP_ELAPSED_OPTIONS,
  BREAKUP_INITIATOR_OPTIONS,
  LAST_CONVERSATION_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  PARTNER_NEW_RELATIONSHIP_OPTIONS,
  PAIN_POINT_OPTIONS,
  MAIN_WISH_OPTIONS,
  CURRENT_EMOTION_OPTIONS,
  SAFETY_CONCERN_OPTIONS,
  optionLabel,
} from "@/lib/ritual-types";

/** 안전 분기 대상: 이 값이 하나라도 있으면 재회 방향 중단 → 안전 중심 구성 */
export const HIGH_RISK_SAFETY_VALUES = [
  "physical_violence",
  "threats",
  "unwanted_contact",
  "obsession_control",
  "monitoring",
  "boundary_disrespect",
];

/** 연락이 차단된 상태: 접촉 시도를 권하지 않도록 지시 */
const BLOCKED_CONTACT_VALUES = ["i_blocked", "blocked_by_partner", "both_blocked"];

/** main_wish → 리추얼 방향 */
const RITUAL_DIRECTION: Record<string, string> = {
  reunion: "붙잡지 않고 바라보기",
  natural_contact: "기다림과 충동 구분하기",
  slow_recovery: "감정과 대화 준비하기",
  understand_my_heart: "기대와 현실 구분하기",
  let_go: "놓아주는 연습",
  apology: "감정과 대화 준비하기",
  find_direction: "기다림과 충동 구분하기",
  not_sure: "기대와 현실 구분하기",
};

export const WOLHWA_SYSTEM_PROMPT = `당신은 월하연(月下緣)의 리추얼 가이드 월화(月華)입니다.

[월화의 철학]
- 인연을 억지로 묶지 않습니다.
- 상대의 마음을 대신 말하지 않습니다.
- 남아 있는 내 마음을 외면하지 않습니다.
- 다시 이어진다면 두 사람 모두의 선택이어야 합니다.

[문체]
- 신비롭고 차분하며 절제된 존댓말.
- 감성적인 문장만 길게 늘어놓지 말고, 신청자의 실제 사연에 근거한
  관계 흐름 정리와 구체적인 행동 가이드를 충분히 담습니다.
- 신청자를 절대 비난하지 않습니다.

[절대 금지 — 다음 표현이나 의미를 어떤 형태로도 생성하지 않습니다]
- 상대방이 아직 사랑한다고 단정
- 상대방의 마음을 읽었다고 주장
- 며칠 안에 연락이 온다는 예측, 재회 날짜 예측, 재회 확률 제시
- 반드시 재회한다는 보장
- 리추얼이 상대를 움직이거나 조종한다는 표현
- 상대가 신청자에게 집착하게 된다는 표현
- 초자연적 효과를 사실처럼 단정
- 상대의 거절이나 침묵을 무시하도록 권유
- 차단을 우회하는 방법, 지인·SNS 등을 통한 우회 연락 권유
리추얼은 상대가 아니라 신청자 자신의 마음을 위한 상징적 시간임을 일관되게 유지합니다.

[사실 준수]
- 신청서에 없는 사실(구체적 사건, 대화, 상대의 생각)을 만들어내지 않습니다.
- 상대의 감정은 항상 "알 수 없다"는 전제 위에서 다룹니다.

[개인화 기준]
- 신청자의 구체적 사연을 결과 전체에서 최소 3곳 이상 자연스럽게 반영합니다.
  특히: 관계 기간, 마지막 대화, 가장 힘든 점, 듣고 싶은 한마디,
  다시 이어진다면 달라졌으면 하는 점.
- 이름만 바꾸면 누구에게나 보낼 수 있는 일반론은 실패작입니다.
- 같은 사실을 반복해 분량만 늘리지 않습니다.

[리추얼 구성]
- 준비물은 붉은 실, 종이, 펜, 물처럼 쉽게 구할 수 있는 것만 사용합니다.
  고가의 물건이나 추가 상품 구매를 절대 유도하지 않습니다.
- 리추얼은 약 5분, 조용한 시간에 혼자 진행하는 상징적 의식입니다.

[출력 형식]
- 오직 하나의 JSON 객체만 출력합니다. JSON 앞뒤에 인사말, 설명,
  마크다운 코드펜스를 붙이지 않습니다.
- 모든 값은 한국어로 작성합니다.`;

function label(options: Parameters<typeof optionLabel>[0], v: string | null) {
  return v ? optionLabel(options, v) : "해당 없음";
}

export function buildUserPrompt(order: RitualOrderRow): string {
  const highRisk = order.safety_concerns.some((v) =>
    HIGH_RISK_SAFETY_VALUES.includes(v)
  );
  const blocked = BLOCKED_CONTACT_VALUES.includes(order.contact_status);
  const direction = RITUAL_DIRECTION[order.main_wish] ?? "기대와 현실 구분하기";

  const safetyLabels =
    order.safety_concerns.length > 0
      ? order.safety_concerns
          .map((v) => optionLabel(SAFETY_CONCERN_OPTIONS, v))
          .join(", ")
      : "없음";

  const painLabels = order.pain_points
    .map((v) => optionLabel(PAIN_POINT_OPTIONS, v))
    .join(", ");

  const sections: string[] = [];

  sections.push(`[신청서 내용]
- 신청자 이름: ${order.applicant_name}
- 상대 이름: ${order.partner_name}
- 현재 관계: ${label(RELATIONSHIP_TYPE_OPTIONS, order.relationship_type)}${
    order.relationship_type === "other" && order.relationship_type_other
      ? ` (${order.relationship_type_other})`
      : ""
  }
- 관계 기간: ${label(RELATIONSHIP_DURATION_OPTIONS, order.relationship_duration)}
- 이별 후 경과: ${label(BREAKUP_ELAPSED_OPTIONS, order.breakup_elapsed)}
- 이별을 먼저 말한 사람: ${label(BREAKUP_INITIATOR_OPTIONS, order.breakup_initiator)}
- 마지막으로 제대로 대화한 시점: ${label(LAST_CONVERSATION_OPTIONS, order.last_conversation)}
- 연락 상태: ${label(CONTACT_STATUS_OPTIONS, order.contact_status)}
- 상대의 새로운 연인: ${label(PARTNER_NEW_RELATIONSHIP_OPTIONS, order.partner_new_relationship)}
- 가장 힘든 것: ${painLabels}
- 가장 바라는 것: ${label(MAIN_WISH_OPTIONS, order.main_wish)}
- 현재 감정: ${label(CURRENT_EMOTION_OPTIONS, order.current_emotion)}
- 안전/경계 관련 응답: ${safetyLabels}${
    order.safety_concerns_other ? ` / 직접 작성: ${order.safety_concerns_other}` : ""
  }

[신청자가 직접 들려준 이야기]
${order.story}

[마지막 대화에서 마음에 남은 것]
${order.last_conversation_memory || "(작성하지 않음)"}

[그 사람에게 듣고 싶은 한마디]
${order.wish_sentence || "(작성하지 않음)"}

[다시 이어진다면 달라졌으면 하는 점]
${order.desired_change || "(작성하지 않음)"}`);

  if (highRisk) {
    sections.push(`[안전 분기 — 최우선 지시]
안전/경계 응답에 위험 신호가 포함되어 있습니다.
일반적인 재회·연결 방향의 리추얼을 중단하고, 결과 전체를
거리 확보, 자신의 안전, 상대방의 경계 존중, 충동적 접촉 중단을
중심으로 구성하세요. 재회를 목표로 제시하지 마세요.
신청자를 비난하지 말고, 안전이 마음 정리의 첫걸음임을 부드럽게 전하세요.
part_07~part_13의 리추얼과 가이드도 모두 이 방향으로 작성합니다.`);
  } else {
    sections.push(`[리추얼 방향]
이번 리추얼의 중심 방향: "${direction}"
part_07의 title과 meaning, part_09의 단계, part_10의 문장이
이 방향과 신청자의 사연을 함께 담아야 합니다.`);
  }

  if (blocked) {
    sections.push(`[연락 차단 상태 지시]
현재 연락이 차단된 상태입니다. 연락을 시도하라는 제안, 차단 해제를
기대하게 하는 표현, 우회 접촉 아이디어를 절대 포함하지 마세요.
가이드는 신청자 자신의 하루와 마음을 돌보는 행동으로만 구성합니다.`);
  }

  sections.push(`[출력할 JSON 구조 — key 이름과 구조를 정확히 지키세요]
{
  "part_01_letter": { "title": "", "content": "" },
  "part_02_relationship_story": { "title": "", "content": "" },
  "part_03_current_emotion": { "title": "", "content": "" },
  "part_04_repeated_pattern": { "title": "", "content": "" },
  "part_05_true_wish": { "title": "", "content": "" },
  "part_06_controllable_now": { "title": "", "content": "" },
  "part_07_ritual": { "title": "", "meaning": "" },
  "part_08_preparation": { "items": ["문자열"] },
  "part_09_ritual_steps": { "steps": ["문자열"] },
  "part_10_personal_words": { "lines": ["문자열"] },
  "part_11_24h_guide": { "items": ["문자열"] },
  "part_12_7day_guide": { "items": ["문자열"] },
  "part_13_21day_plan": { "days_1_7": ["문자열"], "days_8_14": ["문자열"], "days_15_21": ["문자열"] },
  "part_14_final_letter": { "title": "", "content": "" },
  "bonus_journal_questions": ["문자열"]
}

각 파트 안내:
- part_01: ${order.applicant_name}님께 보내는 월화의 첫 편지 (사연을 읽었음이 느껴지게)
- part_02: 두 사람의 관계 흐름 정리 (신청 내용에 근거, 단정 없이)
- part_03: 지금 마음 들여다보기
- part_04: 관계에서 반복된 흐름 (판단이 아닌 관찰)
- part_05: ${order.applicant_name}님이 정말 원하는 것
- part_06: 지금 스스로 할 수 있는 것
- part_07: 리추얼의 이름과 의미
- part_08: 준비물 (붉은 실, 종이, 펜, 물 중심)
- part_09: 약 5분의 리추얼 진행 순서 (4~7단계)
- part_10: 리추얼 중 소리 내어 읽을 개인 문장 3~6줄 (사연 반영)
- part_11: 리추얼 이후 24시간 가이드
- part_12: 7일 행동 가이드
- part_13: 21일 마음 회복 플랜 (1~7일 / 8~14일 / 15~21일)
- part_14: 마무리 편지
- bonus: ${order.applicant_name}님만을 위한 마음 기록 질문 3~7개

JSON만 출력하세요.`);

  return sections.join("\n\n");
}
