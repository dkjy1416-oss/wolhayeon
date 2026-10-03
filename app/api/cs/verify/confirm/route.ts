import { NextResponse } from "next/server";
import { loadCsOrderLite, confirmOtpForOrder } from "@/lib/cs-actions";
import { safeRoute } from "@/lib/route-safe";

export const runtime = "nodejs";

/** OTP 확인 → full(실행 권한) 토큰 발급 — 라이트 세션 위에서만 */
async function handlePOST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    orderNumber?: string;
    token?: string;
    otp?: string;
  } | null;
  if (!/^\d{6}$/.test(body?.otp ?? "")) {
    return NextResponse.json({ status: "invalid" });
  }
  const ctx = await loadCsOrderLite(body?.orderNumber ?? "", body?.token);
  if (!ctx)
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  try {
    const r = await confirmOtpForOrder(ctx.order, body!.otp!);
    return NextResponse.json(r);
  } catch {
    return NextResponse.json({ status: "invalid" });
  }
}

export const POST = safeRoute("cs_verify_confirm", handlePOST);
