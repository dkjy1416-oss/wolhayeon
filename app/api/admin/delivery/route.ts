/**
 * POST /api/admin/delivery — 승인된 결과 이메일 수동 발송/재시도
 * 관리자 인증 필수. body는 orderNumber만 받고 나머지는 전부
 * 서버가 DB에서 재확인 (공용 sendApprovedResultEmail 사용).
 */
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { sendApprovedResultEmail } from "@/lib/result-email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const orderNumber = (body as Record<string, unknown>)?.orderNumber;
  if (typeof orderNumber !== "string" || !ORDER_NUMBER_RE.test(orderNumber)) {
    return NextResponse.json(
      { ok: false, error: "invalid_order_number" },
      { status: 400 }
    );
  }

  const result = await sendApprovedResultEmail(orderNumber);

  const httpStatus =
    result.status === "sent" || result.status === "already_sent"
      ? 200
      : result.status === "sending_in_progress" || result.status === "not_eligible"
        ? 409
        : result.status === "invalid_recipient" || result.status === "failed"
          ? 502
          : 500;

  return NextResponse.json(
    {
      ok: result.status === "sent" || result.status === "already_sent",
      delivery: result.status,
      error_code: result.errorCode ?? null,
    },
    { status: httpStatus }
  );
}
