/**
 * 서버 재검증 + 화이트리스트 정제.
 *
 * - 브라우저가 보낸 body를 절대 그대로 DB에 넣지 않습니다.
 *   알려진 신청폼 필드만 하나씩 골라 담고(화이트리스트),
 *   예상하지 못한 필드(payment_amount, payment_status,
 *   order_number, 상태값 등 포함)는 전부 무시합니다.
 * - 선택형 값은 실제 선택지 목록(영문 value)에 있는 값만 허용합니다.
 * - 자유서술은 서버에서도 길이를 다시 제한합니다.
 * - 저장은 문자열 그대로 하며 HTML/script를 실행하지 않습니다.
 *   (표시 단계에서는 React의 기본 escape를 사용해 XSS를 방지)
 */
import {
  type RitualApplication,
  type Option,
  RELATIONSHIP_TYPE_OPTIONS,
  RELATIONSHIP_DURATION_OPTIONS,
  BREAKUP_ELAPSED_OPTIONS,
  BREAKUP_INITIATOR_OPTIONS,
  LAST_CONVERSATION_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  PARTNER_NEW_RELATIONSHIP_OPTIONS,
  PAIN_POINT_OPTIONS,
  PAIN_POINTS_MAX,
  MAIN_WISH_OPTIONS,
  CURRENT_EMOTION_OPTIONS,
  SAFETY_CONCERN_OPTIONS,
  SAFETY_EXCLUSIVE_VALUES,
  SAFETY_OTHER_VALUE,
  SAFETY_OTHER_MAX,
  STORY_MAX,
  LAST_MEMORY_MAX,
  WISH_SENTENCE_MAX,
  DESIRED_CHANGE_MAX,
  isBreakupRelated,
  isValidEmail,
} from "@/lib/ritual-types";

const NAME_MAX = 100;
const OTHER_MAX = 200;
const EMAIL_MAX = 254;

function values(options: Option[]): Set<string> {
  return new Set(options.map((o) => o.value));
}

const V = {
  relationship_type: values(RELATIONSHIP_TYPE_OPTIONS),
  relationship_duration: values(RELATIONSHIP_DURATION_OPTIONS),
  breakup_elapsed: values(BREAKUP_ELAPSED_OPTIONS),
  breakup_initiator: values(BREAKUP_INITIATOR_OPTIONS),
  last_conversation: values(LAST_CONVERSATION_OPTIONS),
  contact_status: values(CONTACT_STATUS_OPTIONS),
  partner_new_relationship: values(PARTNER_NEW_RELATIONSHIP_OPTIONS),
  pain_points: values(PAIN_POINT_OPTIONS),
  main_wish: values(MAIN_WISH_OPTIONS),
  current_emotion: values(CURRENT_EMOTION_OPTIONS),
  safety_concerns: values(SAFETY_CONCERN_OPTIONS),
};

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item === "string" && !out.includes(item)) out.push(item);
  }
  return out;
}

export interface ValidationResult {
  /** 통과 시 정제된 신청 데이터 (이 객체만 DB에 저장) */
  data: RitualApplication | null;
  /** 실패한 필드 key 목록 (값은 포함하지 않음 — 로그/응답 안전) */
  invalidFields: string[];
}

export function sanitizeAndValidateApplication(
  input: unknown
): ValidationResult {
  const invalid: string[] = [];
  const src = (
    input && typeof input === "object" ? input : {}
  ) as Record<string, unknown>;

  /* ---------- 화이트리스트 정제 ---------- */
  const relationship_type = str(src.relationship_type, 50);
  const breakupRelated = isBreakupRelated(relationship_type);
  const safety_concerns = strArr(src.safety_concerns).filter((v) =>
    V.safety_concerns.has(v)
  );

  const data: RitualApplication = {
    applicant_name: str(src.applicant_name, NAME_MAX),
    partner_name: str(src.partner_name, NAME_MAX),
    relationship_type,
    relationship_type_other:
      relationship_type === "other" ? str(src.relationship_type_other, OTHER_MAX) : "",
    relationship_duration: str(src.relationship_duration, 50),
    // 조건부: 이별 관련 관계가 아니면 서버가 강제로 null
    breakup_elapsed: breakupRelated ? str(src.breakup_elapsed, 50) || null : null,
    breakup_initiator: breakupRelated
      ? str(src.breakup_initiator, 50) || null
      : null,
    last_conversation: str(src.last_conversation, 50),
    contact_status: str(src.contact_status, 50),
    partner_new_relationship: str(src.partner_new_relationship, 50),
    pain_points: strArr(src.pain_points)
      .filter((v) => V.pain_points.has(v))
      .slice(0, PAIN_POINTS_MAX),
    main_wish: str(src.main_wish, 50),
    story: str(src.story, STORY_MAX),
    last_conversation_memory: str(src.last_conversation_memory, LAST_MEMORY_MAX),
    wish_sentence: str(src.wish_sentence, WISH_SENTENCE_MAX),
    desired_change: str(src.desired_change, DESIRED_CHANGE_MAX),
    current_emotion: str(src.current_emotion, 50),
    safety_concerns,
    safety_concerns_other: safety_concerns.includes(SAFETY_OTHER_VALUE)
      ? str(src.safety_concerns_other, SAFETY_OTHER_MAX)
      : "",
    email: str(src.email, EMAIL_MAX).toLowerCase(),
    consent_processing: src.consent_processing === true,
    consent_no_guarantee: src.consent_no_guarantee === true,
    consent_marketing: src.consent_marketing === true,
  };

  /* ---------- 필수/형식 검증 ---------- */
  if (!data.applicant_name) invalid.push("applicant_name");
  if (!data.partner_name) invalid.push("partner_name");
  if (!V.relationship_type.has(data.relationship_type))
    invalid.push("relationship_type");
  if (data.relationship_type === "other" && !data.relationship_type_other)
    invalid.push("relationship_type_other");
  if (!V.relationship_duration.has(data.relationship_duration))
    invalid.push("relationship_duration");

  // 조건부: 이별 관련이면 두 필드 모두 필수 + 허용값 검사
  if (breakupRelated) {
    if (!data.breakup_elapsed || !V.breakup_elapsed.has(data.breakup_elapsed))
      invalid.push("breakup_elapsed");
    if (
      !data.breakup_initiator ||
      !V.breakup_initiator.has(data.breakup_initiator)
    )
      invalid.push("breakup_initiator");
  }

  if (!V.last_conversation.has(data.last_conversation))
    invalid.push("last_conversation");
  if (!V.contact_status.has(data.contact_status)) invalid.push("contact_status");
  if (!V.partner_new_relationship.has(data.partner_new_relationship))
    invalid.push("partner_new_relationship");
  if (data.pain_points.length < 1) invalid.push("pain_points");
  if (!V.main_wish.has(data.main_wish)) invalid.push("main_wish");
  if (!data.story) invalid.push("story");
  if (!V.current_emotion.has(data.current_emotion))
    invalid.push("current_emotion");

  // 안전 질문: 최소 1개 + 단독 선택 항목은 반드시 단독
  if (data.safety_concerns.length < 1) invalid.push("safety_concerns");
  else {
    const hasExclusive = data.safety_concerns.some((v) =>
      SAFETY_EXCLUSIVE_VALUES.includes(v)
    );
    if (hasExclusive && data.safety_concerns.length > 1)
      invalid.push("safety_concerns");
  }

  if (!isValidEmail(data.email)) invalid.push("email");
  if (!data.consent_processing) invalid.push("consent_processing");
  if (!data.consent_no_guarantee) invalid.push("consent_no_guarantee");

  return { data: invalid.length === 0 ? data : null, invalidFields: invalid };
}
