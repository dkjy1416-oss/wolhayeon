/**
 * 분석 구매자의 책 추가 구매 — 자격 판정 규칙 (DB 없이 계산만, 테스트 가능).
 * 서버에서 주문 DB를 읽어 이 함수에 넘긴다. URL의 금액·고객 정보는 쓰지 않는다.
 */
import {
  BOOK_UPGRADE_PRICE_KRW,
  BOOK_UPGRADE_SOURCE_KRW,
  bookUpgradeEndsAt,
} from "@/lib/ritual-types";

export type UpgradeReason =
  | "expired"
  | "used"
  | "refunded"
  | "not_buyer"
  | "has_book"
  | "not_covered"
  | "error";

export const UPGRADE_REASON_TEXT: Record<UpgradeReason, string> = {
  expired: "추가 구매 혜택 기간(발급 후 14일)이 지났어요.",
  used: "이 추가 구매 혜택은 이미 사용했어요.",
  refunded: "기존 분석 결제가 환불되어 추가 구매 혜택 대상이 아니에요.",
  not_buyer: "결제 완료된 분석 주문을 찾을 수 없어 추가 구매 혜택을 적용할 수 없어요.",
  has_book: "이미 책(또는 패키지)을 구매하셔서 추가 구매 혜택 대상이 아니에요.",
  not_covered: "추가 구매 혜택은 12,900원에 분석을 결제한 분께 드리는 혜택이에요.",
  error: "혜택 정보를 확인하지 못했어요. 잠시 후 다시 열어 주세요.",
};

export interface OrderLite {
  order_number: string;
  product: string | null;
  payment_status: string;
  payment_amount: number;
  created_at: string;
}

export type SourceCheck =
  | { ok: true; source: OrderLite }
  | { ok: false; reason: UpgradeReason };

/** 같은 이메일의 주문 목록으로 '추가 구매 자격'을 판정 */
export function judgeUpgradeSource(orders: OrderLite[]): SourceCheck {
  const hasBook = orders.some(
    (o) => (o.product === "book" || o.product === "bundle") && o.payment_status === "paid"
  );
  if (hasBook) return { ok: false, reason: "has_book" };
  const messages = orders.filter((o) => (o.product ?? "message") === "message");
  const eligible = messages
    .filter((o) => o.payment_status === "paid" && o.payment_amount === BOOK_UPGRADE_SOURCE_KRW)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  if (eligible.length > 0) return { ok: true, source: eligible[0] };
  if (messages.some((o) => o.payment_status === "refunded")) return { ok: false, reason: "refunded" };
  if (messages.some((o) => o.payment_status === "paid")) return { ok: false, reason: "not_covered" };
  return { ok: false, reason: "not_buyer" };
}

export type UpgradeStatus =
  | { ok: true; endsAt: number }
  | { ok: false; reason: UpgradeReason };

/** 추가 구매 주문(책·27,000원) 한 건의 지금 상태 */
export function judgeUpgradeOrder(
  order: OrderLite,
  sameEmailOrders: OrderLite[],
  now: number = Date.now()
): UpgradeStatus {
  if (order.product !== "book" || order.payment_amount !== BOOK_UPGRADE_PRICE_KRW) {
    return { ok: false, reason: "not_covered" };
  }
  if (order.payment_status === "paid") return { ok: false, reason: "used" };
  if (order.payment_status !== "pending") return { ok: false, reason: "error" };
  const end = bookUpgradeEndsAt(order.created_at);
  if (end === null || now > end) return { ok: false, reason: "expired" };
  const src = judgeUpgradeSource(sameEmailOrders.filter((o) => o.order_number !== order.order_number));
  if (!src.ok) return src;
  return { ok: true, endsAt: end };
}

/** 쿠폰 마감 표시 — 10월 26일(월) 밤 11:59 형식 대신 정확한 시각 */
export function upgradeDeadlineLabel(endsAt: number): string {
  const d = new Date(endsAt + 9 * 3600 * 1000);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const hh = d.getUTCHours();
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ampm = hh < 12 ? "오전" : "오후";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일(${days[d.getUTCDay()]}) ${ampm} ${h12}:${mm}`;
}
