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
  /** Q1-b. 신청자 성별 */
  applicant_gender: string;
  /** Q1-b. 신청자 출생연도 (4자리) */
  applicant_birth_year: number | null;
  /** Q1-b. 현재 생활단계 */
  life_stage: string;
  /** Q2-b. 상대방 성별 (선택 — 미입력 시 null) */
  partner_gender: string | null;
  /** Q2-b. 상대방 출생연도 (선택/모름 — 미입력 시 null) */
  partner_birth_year: number | null;
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
  /** Q16-기타 선택 시 추가 입력 (최대 300자) */
  safety_concerns_other: string;
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
  applicant_gender: "",
  applicant_birth_year: null,
  life_stage: "",
  partner_gender: null,
  partner_birth_year: null,
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
  safety_concerns_other: "",
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
  { value: "obsession_control", label: "지나친 집착이나 통제" },
  { value: "monitoring", label: "휴대폰·SNS·연락 상대를 확인하거나 통제함" },
  { value: "jealousy_conflict", label: "심한 질투나 의심으로 자주 갈등함" },
  { value: "on_off_cycle", label: "헤어짐과 재회를 반복함" },
  { value: "ghosting_cycle", label: "연락 두절이나 잠수를 반복함" },
  { value: "infidelity", label: "외도 또는 다른 이성과 관련된 문제" },
  { value: "broken_trust", label: "거짓말이나 신뢰가 깨진 일이 있었음" },
  { value: "financial_conflict", label: "금전적인 요구나 경제적 갈등" },
  { value: "emotional_pressure", label: "감정적으로 압박하거나 죄책감을 느끼게 함" },
  { value: "boundary_disrespect", label: "상대방이 나의 거절이나 경계를 존중하지 않음" },
  { value: "my_repeated_contact", label: "내가 상대방에게 집착하거나 반복적으로 연락한 적이 있음" },
  { value: "other", label: "기타" },
  { value: "prefer_not_to_say", label: "답하고 싶지 않음" },
];

/** 단독 선택 항목: 다른 항목과 동시 선택 불가, 서로도 동시 선택 불가 */
export const SAFETY_EXCLUSIVE_VALUES = ["none", "prefer_not_to_say"];
/** '기타' 선택 시 추가 입력 */
export const SAFETY_OTHER_VALUE = "other";
export const SAFETY_OTHER_MAX = 300;

/* ---------- 글자 수 제한 ---------- */

export const STORY_MAX = 2000;
export const STORY_RECOMMENDED_MIN = 100;
export const LAST_MEMORY_MAX = 700;
export const WISH_SENTENCE_MAX = 300;
export const DESIRED_CHANGE_MAX = 500;

/* ---------- 신청자/상대 추가 정보 ---------- */

export const APPLICANT_GENDER_OPTIONS: Option[] = [
  { value: "female", label: "여성" },
  { value: "male", label: "남성" },
  { value: "other", label: "직접 입력/기타" },
  { value: "prefer_not_to_say", label: "답하지 않음" },
];

export const PARTNER_GENDER_OPTIONS: Option[] = [
  { value: "female", label: "여성" },
  { value: "male", label: "남성" },
  { value: "other", label: "기타" },
  { value: "unknown", label: "말하고 싶지 않음/모름" },
];

export const LIFE_STAGE_OPTIONS: Option[] = [
  { value: "middle_high_school", label: "중·고등학생" },
  { value: "university", label: "대학생·대학원생" },
  { value: "job_seeking", label: "취업준비 중" },
  { value: "employee", label: "직장인" },
  { value: "self_employed", label: "자영업·프리랜서" },
  { value: "homemaker", label: "가사·육아 중심" },
  { value: "other", label: "기타" },
];

/** 출생연도 허용 범위: 만 10세 ~ 100세 (서버·클라이언트 공통 기준) */
export function isRealisticBirthYear(
  year: number,
  nowYear: number = new Date().getFullYear()
): boolean {
  return (
    Number.isInteger(year) && year >= nowYear - 100 && year <= nowYear - 10
  );
}

/** 출생연도 → 내부 컨텍스트용 대략 연령 표기 (정확한 만 나이로 단정하지 않음)
 *  예: "1997년생 — 현재 약 28~29세" */
export function approxAgeLabel(
  birthYear: number | null,
  nowYear: number = new Date().getFullYear()
): string {
  if (birthYear === null || !Number.isInteger(birthYear)) return "미입력";
  const hi = nowYear - birthYear;
  const lo = Math.max(0, hi - 1);
  return `${birthYear}년생 — 현재 약 ${lo}~${hi}세`;
}

/** 미성년/학생 여부 (AI 분기용) */
export function isLikelyMinor(
  birthYear: number | null,
  lifeStage: string,
  nowYear: number = new Date().getFullYear()
): boolean {
  if (lifeStage === "middle_high_school") return true;
  if (birthYear !== null && nowYear - birthYear < 19) return true;
  return false;
}

/** 상품 가격(원) — 서버 검증 기준값. 클라이언트 값은 절대 신뢰하지 않음.
 *  ⚠ 이 값을 바꿀 때는 Supabase도 함께 변경해야 결제 검증이 통과합니다:
 *    alter table ritual_orders alter column payment_amount set default <새 가격>;
 *    update ritual_orders set payment_amount = <새 가격> where payment_status = 'pending'; */
export const RITUAL_PRICE_KRW = 12900;

/** 정가(원) — 런칭 특가 기간 동안 취소선으로 표시하는 원래 가격 */
export const RITUAL_REGULAR_PRICE_KRW = 16900;

/** 결제 오류 사과 쿠폰가(원) — 9/24~9/28 결제 실패 고객 주문에만 DB에서 적용 */
export const APOLOGY_PRICE_KRW = 9900;

/** 서버가 승인할 수 있는 주문 금액 (DB payment_amount가 이 중 하나여야 함) */
/** 재오픈 기념 특가(12,900원)·사과 쿠폰(9,900원) 마감: 2026-10-04(일) 23:59:59 KST */
export const PROMO_END_MS = Date.parse("2026-10-04T23:59:59+09:00");
export const PROMO_DEADLINE_TEXT = "10월 4일(일)까지";
/** 마감 직후 결제창에 머물던 사람을 위한 승인 유예 (30분) */
export const PROMO_GRACE_MS = 30 * 60 * 1000;

export function isPromoActive(now: number = Date.now()): boolean {
  return now <= PROMO_END_MS;
}

/** 지금 새로 신청하는 사람의 가격 */
export function listPriceKRW(now: number = Date.now()): number {
  return isPromoActive(now) ? RITUAL_PRICE_KRW : RITUAL_REGULAR_PRICE_KRW;
}

/** 첫 구매가 — 신청(=무료 미리보기)한 뒤 24시간 동안만 메시지 12,900원, 이후 정가 (운영자 결정 10/7) */
export const FIRST_OFFER_PRICE_KRW = RITUAL_PRICE_KRW;
export const FIRST_OFFER_WINDOW_MS = 24 * 60 * 60 * 1000;

/** 이 주문의 첫 구매가 마감 시각(ms). 신청 시각을 알 수 없으면 null */
export function firstOfferEndsAt(createdAt: unknown): number | null {
  const t = typeof createdAt === "string" ? Date.parse(createdAt) : NaN;
  return Number.isFinite(t) ? t + FIRST_OFFER_WINDOW_MS : null;
}

/** 첫 구매가 기준 시각: 신청 시각과 리마인드 메일 발송 시각 중 늦은 쪽
 *  (리마인드 메일을 받은 때부터 다시 24시간 — 메일에 그렇게 안내함) */
export function offerAnchor(row: { created_at?: string | null; remind_sent_at?: string | null }): string | undefined {
  const c = Date.parse(row.created_at ?? "");
  const r = Date.parse(row.remind_sent_at ?? "");
  if (Number.isFinite(r) && (!Number.isFinite(c) || r > c)) return row.remind_sent_at as string;
  return Number.isFinite(c) ? (row.created_at as string) : undefined;
}

export function isFirstOfferActive(createdAt: unknown, now: number = Date.now()): boolean {
  const end = firstOfferEndsAt(createdAt);
  return end !== null && now <= end;
}

/** 주문에 저장된 금액 → 지금 결제할 금액
 *  (특가·쿠폰 기한 안이면 그 금액, 아니면 신청 후 24시간 첫 구매가, 그 뒤엔 정가) */
export function resolveOrderPrice(
  stored: unknown,
  now: number = Date.now(),
  createdAt?: unknown
): number {
  if (
    isPromoActive(now) &&
    (stored === RITUAL_PRICE_KRW || stored === APOLOGY_PRICE_KRW)
  ) {
    return stored as number;
  }
  if (createdAt !== undefined && isFirstOfferActive(createdAt, now)) return FIRST_OFFER_PRICE_KRW;
  return listPriceKRW(now);
}

/** 가격 옆 표시 (취소선 가격 + 라벨) */
export function priceBadge(amount: number): { strike: number | null; label: string } {
  if (amount === APOLOGY_PRICE_KRW)
    return { strike: RITUAL_REGULAR_PRICE_KRW, label: `결제 오류 사과 쿠폰가 · ${PROMO_DEADLINE_TEXT}` };
  if (amount === RITUAL_PRICE_KRW)
    return isPromoActive()
      ? { strike: RITUAL_REGULAR_PRICE_KRW, label: `재오픈 기념 특가 · ${PROMO_DEADLINE_TEXT}` }
      : { strike: RITUAL_REGULAR_PRICE_KRW, label: "첫 구매가" };
  return { strike: null, label: "" };
}

/** 챗봇 안내용 가격 문장 */
export function priceSentence(now: number = Date.now()): string {
  return isPromoActive(now)
    ? `${RITUAL_PRICE_KRW.toLocaleString()}원(재오픈 기념 특가, ${PROMO_DEADLINE_TEXT} · 정가 ${RITUAL_REGULAR_PRICE_KRW.toLocaleString()}원)`
    : `${RITUAL_REGULAR_PRICE_KRW.toLocaleString()}원(무료 미리보기 후 24시간 안에 결제하면 첫 구매가 ${RITUAL_PRICE_KRW.toLocaleString()}원, 메시지+책 패키지도 ${BUNDLE_PRICE_KRW.toLocaleString()}원)`;
}

/* ---------- 상품 (메시지 / 개인화 책 / 패키지) ---------- */
export type Product = "message" | "book" | "bundle";
export const BOOK_PRICE_KRW = 29000;
/** 패키지 특가 — 메시지 특가와 같은 날(PROMO_END_MS) 마감 */
export const BUNDLE_PRICE_KRW = 39900;
/** 패키지 정가 — 특가 마감 후 (따로 사면 45,900원보다 3,000원 저렴) */
export const BUNDLE_REGULAR_PRICE_KRW = 42900;

/** 책 출간 기념 쿠폰가 — 사과 쿠폰 고객에게 메일로 만든 책 주문에만 DB에서 적용 */
export const BOOK_COUPON_PRICE_KRW = 26000;
export const BOOK_COUPON_END_MS = Date.parse("2026-10-11T23:59:59+09:00");
export const BOOK_COUPON_DEADLINE_TEXT = "10월 11일(일)까지";

/** 지금 패키지 가격 (특가 기간이면 39,900원, 이후 42,900원) */
export function bundlePrice(now: number = Date.now()): number {
  return isPromoActive(now) ? BUNDLE_PRICE_KRW : BUNDLE_REGULAR_PRICE_KRW;
}

/** 첫 구매 24시간 동안 패키지도 함께 할인 (메시지 12,900원 + 책 29,000원 = 41,900원보다 싸게) — 운영자 결정 10/7 */
export const FIRST_OFFER_BUNDLE_PRICE_KRW = BUNDLE_PRICE_KRW;

/** 이 주문 기준 지금 패키지 가격 (anchor = offerAnchor(주문)) */
export function bundlePriceFor(now: number = Date.now(), anchor?: unknown): number {
  if (isPromoActive(now)) return BUNDLE_PRICE_KRW;
  if (anchor !== undefined && isFirstOfferActive(anchor, now)) return FIRST_OFFER_BUNDLE_PRICE_KRW;
  return BUNDLE_REGULAR_PRICE_KRW;
}

export const PRODUCTS: Record<
  Product,
  { name: string; orderName: string; tagline: string; includes: string[] }
> = {
  message: {
    name: "월하연 메시지",
    orderName: "월하연 메시지 (개인화 결과)",
    tagline: "내 사연으로 쓴 전체 결과",
    includes: [
      "월화의 편지 · 관계가 깨진 원인 · 상대 반응 해석",
      "연락 타이밍과 첫 메시지 방향 · 반응별 대응",
      "개인 리추얼 · 24시간/7일/21일 가이드",
    ],
  },
  book: {
    name: "개인화 PDF 책",
    orderName: "월하연 개인화 책 《헤어진 뒤, 연락하지 말아야 할 때》",
    tagline: "《헤어진 뒤, 연락하지 말아야 할 때》 내 이름 판본",
    includes: [
      "왜 지금 연락하면 안 되는지 · 상대 행동 읽는 법",
      "연락이 왔을 때 대처법 · 재회를 말할 때의 문장",
      "다시 만나기 전 체크리스트 · 재회 후 꼭 나눌 질문",
      "약 120쪽 · 표지에 내 이름, 판정과 날짜, 7일/21일 기록장",
    ],
  },
  bundle: {
    name: "메시지 + 책 패키지",
    orderName: "월하연 메시지 + 개인화 책 패키지",
    tagline: "지금의 답과 오래 펼쳐 볼 한 권을 함께",
    includes: [
      "메시지 — 재회 전, 지금 무엇을 할지",
      "책 — 연락이 왔을 때 대처법부터 다시 만나기 시작할 때까지 (약 120쪽)",
    ],
  },
};

export function isProduct(v: unknown): v is Product {
  return v === "message" || v === "book" || v === "bundle";
}

/** 상품별 지금 결제할 금액 (메시지는 특가·사과 쿠폰 규칙 그대로) */
export function productPrice(
  product: unknown,
  storedAmount: unknown,
  now: number = Date.now(),
  createdAt?: unknown
): number {
  if (product === "book") {
    /* 책 쿠폰 주문은 마감(10/11) 전까지 쿠폰가 유지 */
    return storedAmount === BOOK_COUPON_PRICE_KRW && now <= BOOK_COUPON_END_MS
      ? BOOK_COUPON_PRICE_KRW
      : BOOK_PRICE_KRW;
  }
  if (product === "bundle") return bundlePriceFor(now, createdAt);
  return resolveOrderPrice(storedAmount, now, createdAt);
}

export function isAllowedPrice(amount: unknown): amount is number {
  return (
    amount === RITUAL_PRICE_KRW ||
    amount === APOLOGY_PRICE_KRW ||
    amount === RITUAL_REGULAR_PRICE_KRW ||
    amount === BOOK_PRICE_KRW ||
    amount === BOOK_COUPON_PRICE_KRW ||
    amount === BUNDLE_PRICE_KRW ||
    amount === BUNDLE_REGULAR_PRICE_KRW
  );
}

/* ---------- 유틸 ---------- */

export function optionLabel(options: Option[], value: string | null): string {
  if (!value) return "";
  return options.find((o) => o.value === value)?.label ?? value;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}
