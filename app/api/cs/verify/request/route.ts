import { NextResponse } from "next/server";
import { loadCsOrderLite, requestOtpForOrder } from "@/lib/cs-actions";
import { safeRoute } from "@/lib/route-safe";
import { allowRequest, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** 민감 액션용 OTP 발송 — 라이트 세션 필요, 등록된 이메일로만 발송 */
async function handlePOST(req: Request) {
  if (!allowRequest(`otp:${clientIp(req)}`, 6, 10 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, status: "rate_limited", code: "rate_limited", message: "인증번호 요청이 너무 많아요. 10분 뒤 다시 시도해 주세요." },
      { status: 429 }
    );
  }
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

export const POST = safeRoute("cs_verify_req", handlePOST);
