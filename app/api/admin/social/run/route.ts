/** POST 예약 시각이 지난 게시물 지금 진행 — 관리자 전용 */
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { runDue } from "@/lib/social/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await runDue()) });
}
