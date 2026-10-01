/** POST /api/admin/promo — 홍보 제안 새로 만들기 (관리자 전용) */
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { generatePromoReport } from "@/lib/promo-report";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const r = await generatePromoReport(14);
  if ("error" in r) return NextResponse.json({ ok: false, error: r.error }, { status: 502 });
  return NextResponse.json({ ok: true, promo: r });
}
