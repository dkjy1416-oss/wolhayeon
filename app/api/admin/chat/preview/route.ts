/** POST /api/admin/chat/preview — 관리자: 결제 없이 AI 결과 미리 만들기 (API 비용 발생) */
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { previewChatOrder } from "@/lib/chat/process";
import { CHAT_ORDER_RE } from "@/lib/chat/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await request.json().catch(() => null)) as { orderNumber?: string } | null;
  const on = b?.orderNumber ?? "";
  if (!CHAT_ORDER_RE.test(on)) return NextResponse.json({ ok: false }, { status: 400 });
  const r = await previewChatOrder(on);
  return NextResponse.json({ ok: r === "ok", status: r });
}
