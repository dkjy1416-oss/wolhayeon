/**
 * 월하연 리추얼 신청 데이터 구조.
 *
 * 모든 key는 snake_case로, 향후 Supabase 테이블 `ritual_applications`의
 * column 이름과 1:1로 매핑됩니다. (예: applicant_name → applicant_name 컬럼)
 * 선택형 값은 한국어 라벨이 아닌 영문 value로 저장해 DB/AI 처리에 안전합니다.
 */

export interface RitualApplication {
  /** Q1. 신청자 이름/닉네임 */
  applicant_name: string;
  /** Q2. 상대방 이름/닉네임 */
  partner_name: string;
  /** Q3. 현재 관계 */
  relationship_type: string;
  /** Q3-기타 선택 시 추가 입력 */
  relationship_type_other: string;
  /** Q4. 관계 기간 */
  relationship_duration: string;
  /** Q5-a. 이별 후 경과 (관계 종료 상황에만, 아니면 null) */
  breakup_elapsed: string | null;
  /** Q5-b. 이별을 먼저 말한 사람 (관계 종료 상황에만, 아니면 null) */
  breakup_initiator: string | null;
  /** Q6. 마지막 대화 시점 */
  last_conversation: string;
  /** Q7. 연락 가능 상태 — AI가 경계 침범을 권하지 않도록 쓰는 핵심 데이터 */
  contact_status: string;
  /** Q8. 상대의 새로운 연인 여부 */
  partner_new_relationship: string;
  /** Q9. 가장 힘든 것 (최대 3개) */
  pain_points: string[];
  /** Q10. 가장 바라는 것 — AI 개인화 핵심 변수 */
  main_wish: string;
  /** Q11. 상세 사연 (최대 2,000자) */
  story: string;
  /** Q12. 마지막 대화에서 마음에 남은 것 (선택, 최대 700자) */
  last_conversation_memory: string;
  /** Q13. 듣고 싶은 한마디 (선택, 최대 300자) */
  wish_sentence: string;
  /** Q14. 다시 이어진다면 달라졌으면 하는 점 (선택, 최대 500자) */
  desired_change: string;
  /** Q15. 현재 감정 */
  current_emotion: string;
  /** Q16. 안전/경계 확인 (내부 정보 — 확인 페이지에 표시하지 않음) */
  safety_concerns: string[];
  /** Q17. 결과 수신 이메일 */
  email: string;
  /** 동의 1. 정보 처리 동의 (필수) */
  consent_processing: boolean;
  /** 동의 2. 결과 비보장 확인 (필수) */
  consent_no_guarantee: boolean;
  /** 동의 3. 마케팅 수신 (선택, 기본 false) */
  consent_marketing: boolean;
}

export const EMPTY_APPLICATION: RitualApplication = {
  applicant_name: "",
  partner_name: "",
  relationship_type: "",
  relationship_type_other: "",
  relationship_duration: "",
  breakup_elapsed: null,
  breakup_initiator: null,
  last_conversation: "",
  contact_status: "",
  partner_new_relationship: "",
  pain_points: [],
  main_wish: "",
  story: "",
  last_conversation_memory: "",
  wish_sentence: "",
  desired_change: "",
  current_emotion: "",
  safety_concerns: [],
  email: "",
  consent_processing: false,
  consent_no_guarantee: false,
  consent_marketing: false,
};

export interface Option {
  value: string;
  label: string;
}

/* ---------- 선택지 정의 ---------- */

export const RELATIONSHIP_TYPE_OPTIONS: Option[] = [
  { value: "ex_lover", label: "헤어진 연인" },
  { value: "current_lover", label: "현재 연인" },
  { value: "getting_to_know", label: "썸 / 알아가는 사이" },
  { value: "one_sided", label: "짝사랑" },
  { value: "lost_contact", label: "연락이 끊긴 관계" },
  { value: "ambiguous", label: "애매한 관계" },
  { value: "other", label: "기타" },
];

/** Q5 조건부 질문을 보여줄 '관계 종료 관련' 유형 */
export const BREAKUP_RELATED_TYPES = ["ex_lover", "lost_contact"];

export function isBreakupRelated(relationshipType: string): boolean {
  return BREAKUP_RELATED_TYPES.includes(relationshipType);
}

export const RELATIONSHIP_DURATION_OPTIONS: Option[] = [
  { value: "under_1m", label: "1개월 미만" },
  { value: "1_3m", label: "1~3개월" },
  { value: "3_6m", label: "3~6개월" },
  { value: "6m_1y", label: "6개월~1년" },
  { value: "1_3y", label: "1~3년" },
  { value: "over_3y", label: "3년 이상" },
  { value: "never_official", label: "정식으로 만난 적은 없음" },
];

export const BREAKUP_ELAPSED_OPTIONS: Option[] = [
  { value: "within_1w", label: "1주 이내" },
  { value: "within_1m", label: "1개월 이내" },
  { value: "1_3m", label: "1~3개월" },
  { value: "3_6m", label: "3~6개월" },
  { value: "6m_1y", label: "6개월~1년" },
  { value: "over_1y", label: "1년 이상" },
];

export const BREAKUP_INITIATOR_OPTIONS: Option[] = [
  { value: "me", label: "내가 먼저" },
  { value: "partner", label: "상대방이 먼저" },
  { value: "mutual", label: "서로 이야기해서" },
  { value: "faded", label: "명확한 이별 없이 멀어짐" },
];

export const LAST_CONVERSATION_OPTIONS: Option[] = [
  { value: "today_yesterday", label: "오늘 또는 어제" },
  { value: "within_1w", label: "1주 이내" },
  { value: "within_1m", label: "1개월 이내" },
  { value: "1_3m", label: "1~3개월" },
  { value: "3_6m", label: "3~6개월" },
  { value: "over_6m", label: "6개월 이상" },
  { value: "never_personal", label: "아직 개인적인 대화를 나눈 적 없음" },
];

export const CONTACT_STATUS_OPTIONS: Option[] = [
  { value: "in_contact", label: "서로 연락하고 있음" },
  { value: "occasional", label: "가끔 연락함" },
  { value: "no_contact", label: "연락하지 않고 있음" },
  { value: "i_blocked", label: "내가 상대방을 차단함" },
  { value: "blocked_by_partner", label: "상대방이 나를 차단함" },
  { value: "both_blocked", label: "서로 차단함" },
  { value: "unknown", label: "잘 모르겠음" },
];

export const PARTNER_NEW_RELATIONSHIP_OPTIONS: Option[] = [
  { value: "none_known", label: "없는 것으로 알고 있음" },
  { value: "has_partner", label: "있는 것으로 알고 있음" },
  { value: "unknown", label: "잘 모르겠음" },
  { value: "prefer_not_to_say", label: "답하고 싶지 않음" },
];

export const PAIN_POINT_OPTIONS: Option[] = [
  { value: "miss_them", label: "그 사람이 너무 보고 싶어요" },
  { value: "waiting_contact", label: "연락을 기다리게 돼요" },
  { value: "dont_understand_end", label: "왜 관계가 끝났는지 이해되지 않아요" },
  { value: "no_apology", label: "제대로 사과받지 못한 것 같아요" },
  { value: "regret_my_fault", label: "제가 잘못한 것 같아 후회돼요" },
  { value: "curious_feelings", label: "상대방의 마음이 궁금해요" },
  { value: "checking_sns", label: "SNS나 온라인 상태를 계속 확인하게 돼요" },
  { value: "fear_new_person", label: "다른 사람을 만날까 봐 불안해요" },
  { value: "cant_forget", label: "잊고 싶은데 잘되지 않아요" },
  { value: "want_restart", label: "다시 시작하고 싶어요" },
  { value: "other", label: "기타" },
];

export const PAIN_POINTS_MAX = 3;

export const MAIN_WISH_OPTIONS: Option[] = [
  { value: "natural_contact", label: "다시 자연스럽게 연락하고 싶어요" },
  { value: "reunion", label: "재회하고 싶어요" },
  { value: "slow_recovery", label: "관계를 천천히 회복하고 싶어요" },
  { value: "understand_my_heart", label: "상대방에 대한 제 마음을 이해하고 싶어요" },
  { value: "let_go", label: "미련을 정리하고 싶어요" },
  { value: "apology", label: "사과하거나 사과받고 싶어요" },
  { value: "find_direction", label: "앞으로 어떻게 해야 할지 정리하고 싶어요" },
  { value: "not_sure", label: "잘 모르겠어요" },
];

export const CURRENT_EMOTION_OPTIONS: Option[] = [
  { value: "still_love", label: "아직 많이 사랑해요" },
  { value: "longing", label: "그리움이 더 큰 것 같아요" },
  { value: "regret", label: "후회가 많이 남아 있어요" },
  { value: "anger", label: "억울하거나 화가 나요" },
  { value: "lonely_or_love", label: "외로운 건지 사랑인지 잘 모르겠어요" },
  { value: "want_to_let_go", label: "이제는 놓고 싶은 마음도 있어요" },
  { value: "confused", label: "제 마음을 저도 잘 모르겠어요" },
];

export const SAFETY_CONCERN_OPTIONS: Option[] = [
  { value: "none", label: "없음" },
  { value: "verbal_abuse", label: "반복적인 심한 욕설이나 모욕" },
  { value: "threats", label: "위협 또는 협박" },
  { value: "physical_violence", label: "신체적 폭력" },
  { value: "unwanted_contact", label: "원하지 않는 지속적인 연락이나 찾아옴" },
  { value: "financial_control", label: "금전적인 통제 또는 요구" },
  { value: "other", label: "기타" },
];

/** '없음'은 다른 항목과 동시 선택 불가 */
export const SAFETY_NONE_VALUE = "none";

/* ---------- 글자 수 제한 ---------- */

export const STORY_MAX = 2000;
export const STORY_RECOMMENDED_MIN = 100;
export const LAST_MEMORY_MAX = 700;
export const WISH_SENTENCE_MAX = 300;
export const DESIRED_CHANGE_MAX = 500;

/* ---------- 유틸 ---------- */

export function optionLabel(options: Option[], value: string | null): string {
  if (!value) return "";
  return options.find((o) => o.value === value)?.label ?? value;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}
