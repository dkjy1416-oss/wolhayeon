/**
 * 카톡 대화 분석 상품 (10/31 신설)
 *
 * - 주문번호: WC-YYYYMMDD-XXXXX (재회 분석 WH- 주문과 완전히 분리)
 * - 저장소: Supabase Storage 비공개 버킷 chat-private (DB 마이그레이션 없이 동작)
 *     orders/{주문번호}.json   주문·결제·결과
 *     uploads/{주문번호}/{n}.jpg  캡처 원본 — 분석 직후 삭제, 미결제는 48시간 뒤 삭제
 * - 가격: 카톡 분석 24,900원 / 재회 분석 패키지 34,900원 (운영자 결정 10/31)
 */
export const CHAT_PRICE_KRW = 24900;
/** 11/23 대표 결정: 재회 분석 + 카톡 분석 묶음 29,900원 (카톡 화면·재회 결제 시트 모두 같은 가격) */
export const CHAT_BUNDLE_PRICE_KRW = 29900;
export type ChatProduct = "chat" | "chat_bundle";
export const CHAT_PRODUCTS: Record<ChatProduct, { name: string; orderName: string; price: number }> = {
  chat: { name: "카톡 대화 분석", orderName: "월하연 카톡 대화 분석", price: CHAT_PRICE_KRW },
  chat_bundle: {
    name: "카톡 대화 분석 + 재회 분석 패키지",
    orderName: "월하연 카톡 분석 + 재회 분석 패키지",
    price: CHAT_BUNDLE_PRICE_KRW,
  },
};

export const CHAT_ORDER_RE = /^WC-\d{8}-[A-Z0-9]{5}$/;

/** 11/28 대표 결정: 리포트 뒤 '월화에게 묻기' — 무료 1번, 추가 3번 4,900원 */
export const ASK_FREE = 1;
export const ASK_PACK_COUNT = 3;
export const ASK_PACK_PRICE_KRW = 4900;
/** 추가 질문 결제 주문번호: WC-YYYYMMDD-XXXXX-Q1 */
export const ASK_PAY_RE = /^(WC-\d{8}-[A-Z0-9]{5})-Q(\d{1,2})$/;
export interface ChatAsk {
  q: string;
  a: string;
  at: string;
}
export const CHAT_MAX_IMAGES = 10;
export const CHAT_MIN_IMAGES = 1;

export type ChatPayStatus = "pending" | "paid" | "refunded";
export type ChatGenStatus = "waiting" | "generating" | "done" | "failed";

export interface ChatAnswers {
  [questionId: string]: string | string[];
}

export interface ChatResult {
  summary: string; // 한 줄 요약
  type_label: string; // 대화 유형 이름
  temperature: { me: number; partner: number; note: string }; // 0~100 대화 온도
  balance: { first_contact: string; length: string; reply_speed: string };
  turning_points: { when: string; what: string }[]; // 식은 지점·바뀐 지점
  partner_signals: { positive: string[]; caution: string[] };
  my_patterns: { pattern: string; why_it_hurts: string; instead?: string }[];
  avoid_messages: { text: string; why: string }[];
  next_messages: { text: string; intent: string; likely_response: string; when?: string }[];
  plan: { period: string; actions: string[] }[];
  closing: string;
  /* 11/23 결과 보강 — 이전 결과에는 없을 수 있음 */
  overview?: string;
  partner_mind?: { reading: string; clues: { quote: string; meaning: string }[] };
  say_vs_do?: { says: string; does: string; gap: string }[];
  future_flow?: { now_stage: string; paths: { condition: string; outcome: string }[] };
  my_strengths?: string[];
  reply_guide?: { warm: string; short: string; none: string };
}

export interface ChatOrder {
  order_number: string;
  created_at: string;
  product: ChatProduct;
  amount: number;
  name: string;
  email: string;
  birth_year: number | null;
  guardian_ok: boolean;
  marketing_ok: boolean;
  my_side: "right" | "left"; // 내 말풍선 위치 (카톡 기본: 내가 오른쪽)
  partner_label: string; // 결과에 쓸 호칭 (실명 대신)
  answers: ChatAnswers;
  free_type: string;
  image_count: number;
  pay_status: ChatPayStatus;
  payment_key: string | null;
  payment_method: string | null;
  paid_at: string | null;
  gen_status: ChatGenStatus;
  gen_started_at: string | null;
  result: ChatResult | null;
  result_token: string | null;
  images_deleted_at: string | null;
  email_sent_at: string | null;
  bundle_redeemed_order: string | null; // 패키지: 재회 분석에 쓴 WH 주문번호
  /** 11/23: 재회 분석 결제 시트에서 고른 묶음 — 결제되면 이 WH 주문을 함께 결제 완료로, 카톡 대화는 결제 뒤에 올림 */
  combo_ritual_order?: string | null;
  utm: Record<string, string> | null;
  /** 10/31: file = 대화 내보내기 파일(숫자 분석 포함), images = 캡처 */
  source?: "file" | "images";
  /** 파일 분석 숫자 (이름 제외) */
  stats?: Record<string, unknown> | null;
  /** 관리자 미리보기용 AI 결과 (결제 전, 손님에게 안 보임) */
  preview_result?: ChatResult | null;
  preview_at?: string | null;
  /** 11/28: 리포트 뒤 월화에게 묻기 */
  asks?: ChatAsk[];
  ask_credits?: number; // 결제로 늘어난 질문 수
  ask_payments?: { order_id: string; payment_key: string; amount: number; at: string }[];
}
