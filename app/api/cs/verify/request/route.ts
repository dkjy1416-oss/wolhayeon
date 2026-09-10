import { NextResponse } from "next/server";
import { loadCsOrderLite, requestOtpForOrder } from "@/lib/cs-actions";

export const runtime = "nodejs";

/** 민감 액션용 OTP 발송 — 라이트 세션 필요, 등록된 이메일로만 발송 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    orderNumber?: string;
    token?: string;
  } | null;
  const ctx = await loadCsOrderLite(body?.orderNumber ?? "", body?.token);
  if (!ctx)
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  try {
    const r = await requestOtpForOrder(ctx.order);
    return NextResponse.json(r);
  } catch {
    return NextResponse.json({ status: "failed" });
  }
}
