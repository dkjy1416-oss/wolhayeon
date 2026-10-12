import "server-only";
/**
 * 분석 구매자의 책 추가 구매 (27,000원) — 서버 전용.
 *
 * 쿠폰 = 추가 구매 전용 '책 주문'(product=book, payment_amount=27,000) 1건.
 *  - 발급: 결제 완료된 12,900원 분석 주문의 사연을 그대로 복사해 책 주문을 만든다 (사연 다시 안 씀).
 *  - 같은 이메일에 유효한 추가 구매 주문이 있으면 새로 만들지 않고 그대로 쓴다 (중복 발급 없음).
 *  - 결제 화면·결제 승인 때마다 주문 DB로 자격을 다시 확인한다
 *    (기한 14일 · 분석 결제 유지(환불 아님) · 책/패키지 미구매). URL 금액·고객 정보는 믿지 않는다.
 *  - 결제를 취소·실패해도 주문은 결제 대기로 남아 쿠폰이 소진되지 않는다. 결제가 승인된 순간 '사용 완료'.
 *  - 결제 후에는 책만 만든다 (product=book → 분석 생성 경로를 타지 않음, lib/ritual-process.ts).
 */
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { APPLICATION_COLUMNS } from "@/lib/book/clone-order";
import { BOOK_UPGRADE_PRICE_KRW, BOOK_UPGRADE_VALID_MS } from "@/lib/ritual-types";
import {
  judgeUpgradeOrder,
  judgeUpgradeSource,
  type OrderLite,
  type SourceCheck,
  type UpgradeReason,
  type UpgradeStatus,
} from "@/lib/book/upgrade-rules";

const LITE = "order_number, product, payment_status, payment_amount, created_at";

async function ordersByEmail(email: string): Promise<OrderLite[] | null> {
  const r = await getSupabaseAdmin()
    .from("ritual_orders")
    .select(LITE)
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(50);
  if (r.error || !r.data) return null;
  return r.data as OrderLite[];
}

/** 이 주문(분석 결제 주문)의 고객이 지금 추가 구매 혜택 대상인가 */
export async function checkUpgradeForOrder(orderNumber: string): Promise<SourceCheck & { email?: string }> {
  try {
    const r = await getSupabaseAdmin()
      .from("ritual_orders")
      .select("email")
      .eq("order_number", orderNumber)
      .maybeSingle();
    const email = r.data?.email as string | undefined;
    if (r.error || !email) return { ok: false, reason: "error" };
    const list = await ordersByEmail(email);
    if (!list) return { ok: false, reason: "error" };
    const res = judgeUpgradeSource(list);
    /* 후기를 쓴 바로 그 주문이 12,900원 결제 주문이어야 한다 */
    if (res.ok && res.source.order_number !== orderNumber) {
      const self = list.find((o) => o.order_number === orderNumber);
      if (!self || self.payment_status !== "paid" || self.payment_amount !== res.source.payment_amount) {
        return { ok: false, reason: "not_covered" };
      }
    }
    return { ...res, email };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** 추가 구매 주문(책·27,000원)의 지금 상태 — 결제 화면·결제 승인에서 사용 */
export async function upgradeOrderStatus(orderNumber: string): Promise<UpgradeStatus> {
  try {
    const r = await getSupabaseAdmin()
      .from("ritual_orders")
      .select(`${LITE}, email`)
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (r.error || !r.data) return { ok: false, reason: "error" };
    const row = r.data as OrderLite & { email: string | null };
    if (!row.email) return { ok: false, reason: "error" };
    const list = await ordersByEmail(row.email);
    if (!list) return { ok: false, reason: "error" };
    return judgeUpgradeOrder(row, list);
  } catch {
    return { ok: false, reason: "error" };
  }
}

export type IssueResult =
  | { ok: true; orderNumber: string; endsAt: number; created: boolean }
  | { ok: false; reason: UpgradeReason };

/** 분석 결제 주문 → 추가 구매 주문 발급 (이미 유효한 게 있으면 그것을 돌려줌) */
export async function issueUpgradeOrder(sourceOrderNumber: string): Promise<IssueResult> {
  const chk = await checkUpgradeForOrder(sourceOrderNumber);
  if (!chk.ok || !chk.email) return { ok: false, reason: chk.ok ? "error" : chk.reason };
  const supabase = getSupabaseAdmin();
  const now = Date.now();

  /* 1) 이미 발급된 유효 주문 재사용 */
  const existing = await supabase
    .from("ritual_orders")
    .select(LITE)
    .eq("email", chk.email)
    .eq("product", "book")
    .eq("payment_status", "pending")
    .eq("payment_amount", BOOK_UPGRADE_PRICE_KRW)
    .order("created_at", { ascending: false })
    .limit(1);
  const ex = (existing.data ?? [])[0] as OrderLite | undefined;
  if (ex) {
    const end = Date.parse(ex.created_at) + BOOK_UPGRADE_VALID_MS;
    if (now <= end) return { ok: true, orderNumber: ex.order_number, endsAt: end, created: false };
  }

  /* 2) 새로 발급 — 사연 컬럼만 복사, 결제·결과 컬럼은 기본값 */
  const src = await supabase.from("ritual_orders").select("*").eq("order_number", sourceOrderNumber).maybeSingle();
  if (src.error || !src.data) return { ok: false, reason: "error" };
  const row = src.data as Record<string, unknown>;
  const payload: Record<string, unknown> = { product: "book", payment_amount: BOOK_UPGRADE_PRICE_KRW };
  for (const c of APPLICATION_COLUMNS) if (c in row) payload[c] = row[c];
  const ins = await supabase.from("ritual_orders").insert(payload).select("order_number, created_at").single();
  if (ins.error || !ins.data) {
    console.error(`[book-upgrade] insert_failed code=${ins.error?.code ?? "unknown"}`);
    return { ok: false, reason: "error" };
  }
  const end = Date.parse(ins.data.created_at as string) + BOOK_UPGRADE_VALID_MS;
  return { ok: true, orderNumber: ins.data.order_number as string, endsAt: end, created: true };
}
