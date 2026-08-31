/**
 * 자동 승인 (서버 전용) — 관리자 승인 버튼 없이 approved 처리.
 * 판정은 lib/auto-approve-rules.ts(순수 함수)에 위임하고,
 * 여기서는 DB 재조회와 idempotent 갱신만 수행합니다.
 */
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { decideAutoApprove } from "@/lib/auto-approve-rules";

export type AutoApproveOutcome =
  | { status: "approved"; token: string }
  | { status: "already_approved"; token: string }
  | { status: "not_ready"; reason: string }
  | { status: "needs_admin" }
  | { status: "server_error" };

export async function autoApproveResult(
  orderNumber: string
): Promise<AutoApproveOutcome> {
  try {
    const supabase = getSupabaseAdmin();

    const o = await supabase
      .from("ritual_orders")
      .select("id, payment_status, generation_status, review_status")
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (o.error || !o.data) return { status: "not_ready", reason: "not_found" };
    const order = o.data;

    const r = await supabase
      .from("ritual_results")
      .select(
        "id, result_version, generated_content, reviewed_content, approved_at, result_token"
      )
      .eq("order_id", order.id)
      .order("result_version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const latest = r.error ? null : r.data;

    const decision = decideAutoApprove(order, latest);

    switch (decision.kind) {
      case "already_approved":
        return { status: "already_approved", token: decision.token };
      case "needs_admin":
        return { status: "needs_admin" };
      case "approve":
        break;
      default:
        return { status: "not_ready", reason: decision.kind };
    }
    if (!latest) return { status: "not_ready", reason: "no_result" };

    const now = new Date().toISOString();

    /* 결과 행: approved_at이 비어 있을 때만 1회 기록 (동시 요청 idempotent).
       generated_content는 갱신 대상에 포함하지 않음 — 원본 보존 */
    const upd = await supabase
      .from("ritual_results")
      .update({
        reviewed_content: decision.finalContent,
        reviewed_at: now,
        approved_at: now,
      })
      .eq("id", latest.id)
      .is("approved_at", null)
      .select("id")
      .maybeSingle();
    if (upd.error) {
      console.error(`[auto-approve] result_update_failed code=${upd.error.code}`);
      return { status: "server_error" };
    }
    /* 0행이면 다른 요청이 방금 승인함 → 그대로 승인 상태로 취급 */

    const ordUpd = await supabase
      .from("ritual_orders")
      .update({ review_status: "approved" })
      .eq("id", order.id)
      .neq("review_status", "approved");
    if (ordUpd.error) {
      console.error(`[auto-approve] order_update_failed code=${ordUpd.error.code}`);
      return { status: "server_error" };
    }

    return upd.data
      ? { status: "approved", token: decision.token }
      : { status: "already_approved", token: decision.token };
  } catch {
    console.error("[auto-approve] server_error");
    return { status: "server_error" };
  }
}
