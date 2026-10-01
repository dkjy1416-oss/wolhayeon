/** POST /api/admin/reviews — 후기 공개 승인 / 숨김 (관리자 전용) */
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let b: { id?: unknown; action?: unknown };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const id = Number(b.id);
  const action = b.action;
  if (!Number.isInteger(id) || (action !== "approve" && action !== "hide" && action !== "pending")) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const patch =
    action === "approve"
      ? { status: "approved", approved_at: now, updated_at: now }
      : { status: action === "hide" ? "hidden" : "pending", approved_at: null, updated_at: now };
  const r = await getSupabaseAdmin().from("reviews").update(patch).eq("id", id);
  if (r.error) return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
