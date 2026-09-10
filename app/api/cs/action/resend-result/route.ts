import { NextResponse } from "next/server";
import { loadCsOrderLite, actionResendResultEmail } from "@/lib/cs-actions";

export const runtime = "nodejs";

/** 등록된 이메일로만 재발송 → 라이트 세션 허용 (수신자 변경 불가) */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    orderNumber?: string;
    token?: string;
    csToken?: string;
  } | null;
  const ctx = await loadCsOrderLite(
    body?.orderNumber ?? "",
    body?.token ?? body?.csToken
  );
  if (!ctx)
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  const r = await actionResendResultEmail(ctx.order);
  return NextResponse.json(r);
}
