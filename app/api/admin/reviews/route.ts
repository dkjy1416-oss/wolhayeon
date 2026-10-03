/**
 * POST /api/admin/reviews — 후기 관리 (관리자 전용)
 *  - approve / hide / pending : 공개 상태 변경
 *  - update  : 별점·내용·표시 이름·공개 동의 수정 (오타·개인정보 가리기 등)
 *  - create  : 다른 경로(카톡·메일 등)로 받은 실제 손님 후기 등록 — 결제 완료 주문번호 필수, 주문당 1개
 *  - delete  : 후기 삭제
 * 실제 결제 주문과 연결된 후기만 다룬다 (지어낸 후기 등록 방지).
 */
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ORDER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;
const PRODUCTS = new Set(["message", "book", "bundle"]);

function clean(b: Record<string, unknown>) {
  const rating = Number(b.rating);
  const body = typeof b.body === "string" ? b.body.trim().replace(/[ \t]+\n/g, "\n") : "";
  const name = typeof b.display_name === "string" ? b.display_name.trim().replace(/[<>]/g, "").slice(0, 12) : "";
  const consent = b.consent_public === true;
  const product = typeof b.product === "string" && PRODUCTS.has(b.product) ? b.product : null;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "별점은 1~5 사이로 골라 주세요." };
  if (body.length < 10 || body.length > 600) return { error: "후기 내용은 10자 이상 600자 이하로 적어 주세요." };
  return { rating, body, display_name: name || null, consent_public: consent, product };
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const action = b.action;
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  if (action === "create") {
    const order = typeof b.order_number === "string" ? b.order_number.trim().toUpperCase() : "";
    if (!ORDER_RE.test(order)) {
      return NextResponse.json({ ok: false, error: "주문번호 형식이 맞지 않아요 (예: WH-20261002-ABCDE)." }, { status: 400 });
    }
    const c = clean(b);
    if ("error" in c) return NextResponse.json({ ok: false, error: c.error }, { status: 400 });
    const o = await supabase.from("ritual_orders").select("payment_status, product").eq("order_number", order).maybeSingle();
    if (!o.data) return NextResponse.json({ ok: false, error: "그 주문번호를 찾을 수 없어요." }, { status: 404 });
    if (o.data.payment_status !== "paid") {
      return NextResponse.json({ ok: false, error: "결제 완료된 주문에만 후기를 등록할 수 있어요." }, { status: 400 });
    }
    const exists = await supabase.from("reviews").select("id").eq("order_number", order).maybeSingle();
    if (exists.data) {
      return NextResponse.json({ ok: false, error: "이 주문에는 이미 후기가 있어요. 목록에서 수정해 주세요." }, { status: 409 });
    }
    const status = b.status === "approved" && c.consent_public ? "approved" : "pending";
    const ins = await supabase
      .from("reviews")
      .insert({
        order_number: order,
        product: c.product ?? (o.data.product as string | null) ?? "message",
        rating: c.rating,
        body: c.body,
        display_name: c.display_name,
        consent_public: c.consent_public,
        status,
        approved_at: status === "approved" ? now : null,
        updated_at: now,
      })
      .select("id, order_number, product, rating, body, display_name, consent_public, status, created_at")
      .single();
    if (ins.error) return NextResponse.json({ ok: false, error: "저장하지 못했어요." }, { status: 500 });
    return NextResponse.json({ ok: true, review: ins.data });
  }

  const id = Number(b.id);
  if (!Number.isInteger(id)) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  if (action === "update") {
    const c = clean(b);
    if ("error" in c) return NextResponse.json({ ok: false, error: c.error }, { status: 400 });
    const patch: Record<string, unknown> = {
      rating: c.rating,
      body: c.body,
      display_name: c.display_name,
      consent_public: c.consent_public,
      updated_at: now,
    };
    if (c.product) patch.product = c.product;
    /* 공개 동의를 끈 후기는 공개 상태로 둘 수 없음 */
    if (!c.consent_public) {
      patch.status = "pending";
      patch.approved_at = null;
    }
    const r = await supabase.from("reviews").update(patch).eq("id", id);
    if (r.error) return NextResponse.json({ ok: false, error: "저장하지 못했어요." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    const r = await supabase.from("reviews").delete().eq("id", id);
    if (r.error) return NextResponse.json({ ok: false, error: "삭제하지 못했어요." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action !== "approve" && action !== "hide" && action !== "pending") {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  /* 공개 동의가 없는 후기는 공개할 수 없음 (손님 동의 없이 게시 방지) */
  if (action === "approve") {
    const cur = await supabase.from("reviews").select("consent_public").eq("id", id).maybeSingle();
    if (!cur.data?.consent_public) {
      return NextResponse.json(
        { ok: false, error: "공개 동의가 없는 후기라 공개할 수 없어요. (수정에서 손님이 동의한 경우에만 켜 주세요)" },
        { status: 400 }
      );
    }
  }
  const patch =
    action === "approve"
      ? { status: "approved", approved_at: now, updated_at: now }
      : { status: action === "hide" ? "hidden" : "pending", approved_at: null, updated_at: now };
  const r = await supabase.from("reviews").update(patch).eq("id", id);
  if (r.error) return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
