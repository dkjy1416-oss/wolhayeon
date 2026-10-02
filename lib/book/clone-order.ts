import "server-only";
/**
 * 이미 받은 사연(주문)으로 '책 주문'을 새로 만든다 — 사연을 다시 쓰지 않게.
 * 신청 내용 컬럼만 그대로 복사하고, 결제·상태·결과 컬럼은 DB 기본값을 쓴다.
 * 같은 이메일로 아직 결제하지 않은 책 주문이 있으면 새로 만들지 않고 그것을 다시 쓴다.
 * (ritual_orders 에는 submission_id 컬럼이 없으므로 이메일+상품+결제대기로 중복을 막는다)
 */
import { getSupabaseAdmin } from "@/lib/supabase/server";

/** 신청서에서 온 컬럼 (DB 실제 컬럼명) */
const APPLICATION_COLUMNS = [
  "applicant_name",
  "partner_name",
  "relationship_type",
  "relationship_type_other",
  "relationship_duration",
  "breakup_elapsed",
  "breakup_initiator",
  "last_conversation",
  "contact_status",
  "partner_new_relationship",
  "pain_points",
  "main_wish",
  "story",
  "last_conversation_memory",
  "wish_sentence",
  "desired_change",
  "current_emotion",
  "safety_concerns",
  "safety_concerns_other",
  "email",
  "consent_processing",
  "consent_no_guarantee",
  "consent_marketing",
  "applicant_gender",
  "applicant_birth_year",
  "life_stage",
  "partner_gender",
  "partner_birth_year",
  "preview_content",
] as const;

export type CloneResult =
  | { ok: true; orderNumber: string; created: boolean; paidAlready: false }
  | { ok: false; reason: "not_found" | "already_bought" | "insert_failed"; code?: string };

/**
 * @param sourceOrderId 사연이 담긴 원 주문 id
 * @param amount 책 주문 금액 (쿠폰가 등). null이면 정가는 결제 화면에서 정해진다.
 * @param blockIfPaidBook true면 같은 이메일로 이미 결제한 책 주문이 있을 때 만들지 않는다.
 */
export async function cloneOrderForBook(
  sourceOrderId: string,
  amount: number,
  blockIfPaidBook: boolean
): Promise<CloneResult> {
  const supabase = getSupabaseAdmin();
  const src = await supabase.from("ritual_orders").select("*").eq("id", sourceOrderId).maybeSingle();
  if (src.error || !src.data) return { ok: false, reason: "not_found" };
  const row = src.data as Record<string, unknown>;
  const email = typeof row.email === "string" ? row.email : "";

  /* 같은 이메일의 책 주문 확인 */
  const books = await supabase
    .from("ritual_orders")
    .select("order_number, payment_status, payment_amount, created_at")
    .eq("email", email)
    .eq("product", "book")
    .order("created_at", { ascending: false })
    .limit(10);
  const list = (books.data ?? []) as Array<{ order_number: string; payment_status: string; payment_amount: number }>;
  if (blockIfPaidBook && list.some((b) => b.payment_status === "paid")) {
    return { ok: false, reason: "already_bought" };
  }
  const pending = list.find((b) => b.payment_status === "pending");
  if (pending) {
    /* 쿠폰가가 걸린 주문을 정가로 되돌리지 않는다 (더 싼 쪽만 반영) */
    if (amount < pending.payment_amount) {
      await supabase
        .from("ritual_orders")
        .update({ payment_amount: amount })
        .eq("order_number", pending.order_number)
        .eq("payment_status", "pending");
    }
    return { ok: true, orderNumber: pending.order_number, created: false, paidAlready: false };
  }

  const payload: Record<string, unknown> = { product: "book", payment_amount: amount };
  for (const c of APPLICATION_COLUMNS) if (c in row) payload[c] = row[c];
  const ins = await supabase.from("ritual_orders").insert(payload).select("order_number").single();
  if (ins.error || !ins.data) {
    console.error(`[clone-order] insert_failed code=${ins.error?.code ?? "unknown"}`);
    return { ok: false, reason: "insert_failed", code: ins.error?.code };
  }
  return { ok: true, orderNumber: ins.data.order_number as string, created: true, paidAlready: false };
}
