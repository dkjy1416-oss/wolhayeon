/**
 * POST /api/admin/review — 검수 저장 / 수정 필요 / 최종 승인
 *
 * 보안 원칙
 *  - 관리자 세션 쿠키가 없으면 전부 401.
 *  - orderNumber만 받아 서버가 DB에서 실제 주문과 "최신" result row를
 *    다시 조회합니다. 클라이언트의 result_id/order_id/상태값은 무시.
 *  - resultVersion은 낙관적 확인용으로만 사용: 편집 중이던 버전이
 *    최신이 아니면 409(stale)로 거부.
 *  - 저장/승인 전 서버에서 RitualResultSchema로 전체 재검증.
 *  - generated_content(AI 원본)는 어떤 경우에도 수정하지 않음.
 *  - 로그에는 코드만 남김 (사연·콘텐츠 원문 출력 금지).
 */
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { RitualResultSchema } from "@/lib/ritual-result-schema";
import { approveGuard, editGuard } from "@/lib/admin-review-rules";
import { sendApprovedResultEmail } from "@/lib/result-email";

export const dynamic = "force-dynamic";
/** 승인 후 Resend 발송 호출까지 여유 실행 시간 확보 */
export const maxDuration = 60;

const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

function bad(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return bad(401, "unauthorized");

  const requestId = randomUUID().slice(0, 8);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return bad(400, "invalid_json");
  }

  const action = body.action;
  const orderNumber = body.orderNumber;
  const clientVersion =
    typeof body.resultVersion === "number" && Number.isInteger(body.resultVersion)
      ? body.resultVersion
      : null;
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 5000) : "";

  if (typeof orderNumber !== "string" || !ORDER_NUMBER_RE.test(orderNumber)) {
    return bad(400, "invalid_order_number");
  }
  if (action !== "save" && action !== "revision" && action !== "approve") {
    return bad(400, "invalid_action");
  }

  /* 저장 콘텐츠는 DB 접근 전에 먼저 스키마 검증 (실패 시 즉시 400) */
  let saveContent: import("@/lib/ritual-result-schema").RitualResult | null =
    null;
  if (action === "save") {
    const check = RitualResultSchema.safeParse(body.content);
    if (!check.success) {
      const paths = check.error.issues
        .slice(0, 5)
        .map((i) => i.path.join("."))
        .join(",");
      return bad(400, "validation_failed", { invalid_paths: paths });
    }
    saveContent = check.data;
  }

  try {
    const supabase = getSupabaseAdmin();

    /* 서버가 DB에서 주문·최신 결과를 직접 조회 (클라이언트 값 불신) */
    const orderRes = await supabase
      .from("ritual_orders")
      .select("id, payment_status, generation_status, review_status")
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (orderRes.error || !orderRes.data) return bad(404, "order_not_found");
    const order = orderRes.data;

    const resultRes = await supabase
      .from("ritual_results")
      .select("id, result_version, generated_content, reviewed_content")
      .eq("order_id", order.id)
      .order("result_version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (resultRes.error || !resultRes.data) return bad(404, "result_not_found");
    const latest = resultRes.data;

    /* ---------- 검수 내용 저장 ---------- */
    if (action === "save") {
      const guard = editGuard(order, latest.result_version, clientVersion);
      if (guard !== "ok") return bad(409, guard);

      /* reviewed_content만 갱신 — generated_content는 건드리지 않음 */
      const upd = await supabase
        .from("ritual_results")
        .update({
          reviewed_content: saveContent,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
        })
        .eq("id", latest.id);
      if (upd.error) {
        console.error(`[admin:${requestId}] save_failed code=${upd.error.code}`);
        return bad(500, "save_failed");
      }
      const statusUpd = await supabase
        .from("ritual_orders")
        .update({ review_status: "reviewing" })
        .eq("id", order.id);
      if (statusUpd.error) {
        console.error(
          `[admin:${requestId}] save_status_failed code=${statusUpd.error.code}`
        );
        return bad(500, "save_status_failed");
      }
      return NextResponse.json({ ok: true, action: "save" });
    }

    /* ---------- 수정 필요 처리 ---------- */
    if (action === "revision") {
      const guard = editGuard(order, latest.result_version, clientVersion);
      if (guard !== "ok") return bad(409, guard);
      if (notes.trim().length === 0) return bad(400, "notes_required");

      const upd = await supabase
        .from("ritual_results")
        .update({
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
        })
        .eq("id", latest.id);
      if (upd.error) {
        console.error(
          `[admin:${requestId}] revision_failed code=${upd.error.code}`
        );
        return bad(500, "revision_failed");
      }
      const statusUpd = await supabase
        .from("ritual_orders")
        .update({ review_status: "revision_required" })
        .eq("id", order.id);
      if (statusUpd.error) {
        console.error(
          `[admin:${requestId}] revision_status_failed code=${statusUpd.error.code}`
        );
        return bad(500, "revision_status_failed");
      }
      return NextResponse.json({ ok: true, action: "revision" });
    }

    /* ---------- 최종 승인 ---------- */
    const guard = approveGuard(order, latest.result_version, clientVersion);
    if (guard !== "ok") return bad(409, guard);

    /* 승인 대상 콘텐츠는 DB 값으로만 결정 (클라이언트 content 무시) */
    const finalContent = latest.reviewed_content ?? latest.generated_content;
    const finalCheck = RitualResultSchema.safeParse(finalContent);
    if (!finalCheck.success) {
      return bad(409, "final_content_invalid");
    }

    const now = new Date().toISOString();
    const upd = await supabase
      .from("ritual_results")
      .update({
        /* reviewed_content가 없던 경우 승인 시점의 고객 제공본을 고정 */
        reviewed_content: finalCheck.data,
        reviewed_at: now,
        approved_at: now,
      })
      .eq("id", latest.id);
    if (upd.error) {
      console.error(`[admin:${requestId}] approve_failed code=${upd.error.code}`);
      return bad(500, "approve_failed");
    }
    const ordUpd = await supabase
      .from("ritual_orders")
      .update({ review_status: "approved" })
      .eq("id", order.id)
      .neq("review_status", "approved");
    if (ordUpd.error) {
      console.error(
        `[admin:${requestId}] approve_status_failed code=${ordUpd.error.code}`
      );
      return bad(500, "approve_failed");
    }

    /* 승인이 완전히 끝난 뒤에만 자동 발송.
       발송 실패는 승인을 취소/롤백하지 않으며 결과만 구분해 반환 */
    let delivery = "failed";
    try {
      const sendRes = await sendApprovedResultEmail(orderNumber);
      delivery = sendRes.status;
    } catch {
      console.error(`[admin:${requestId}] approve_delivery_error`);
      delivery = "failed";
    }
    return NextResponse.json({ ok: true, action: "approve", delivery });
  } catch {
    console.error(`[admin:${requestId}] server_error`);
    return bad(500, "server_error");
  }
}
