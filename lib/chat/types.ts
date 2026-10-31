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
export const CHAT_BUNDLE_PRICE_KRW = 34900;
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
  my_patterns: { pattern: string; why_it_hurts: string }[];
  avoid_messages: { text: string; why: string }[];
  next_messages: { text: string; intent: string; likely_response: string }[];
  plan: { period: string; actions: string[] }[];
  closing: string;
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
  utm: Record<string, string> | null;
  /** 10/31: file = 대화 내보내기 파일(숫자 분석 포함), images = 캡처 */
  source?: "file" | "images";
  /** 파일 분석 숫자 (이름 제외) */
  stats?: Record<string, unknown> | null;
}
