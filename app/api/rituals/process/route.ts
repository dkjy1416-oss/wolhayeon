/**
 * POST /api/rituals/process — 결제 완료 주문 자동 처리 (고객 흐름)
 * body: { orderNumber, processToken }
 *
 * - orderNumber 형식 검증 → processToken HMAC/만료/주문 일치 검증
 *   → DB에서 paid 재확인 후에만 처리.
 * - 응답에는 상태와 resultPath(승인 완료 시)만 담고 개인정보·신청서
 *   원문·결과 내용은 포함하지 않음.
 * - resultPath는 서명 토큰을 통과한 요청에만 반환됨.
 */
import { NextResponse } from "next/server";
import { verifyProcessToken } from "@/lib/customer-process-auth";
import { processPaidOrder } from "@/lib/ritual-process";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const orderNumber = b.orderNumber;

  if (typeof orderNumber !== "string" || !ORDER_NUMBER_RE.test(orderNumber)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!verifyProcessToken(orderNumber, b.processToken)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await processPaidOrder(orderNumber);

  switch (result.status) {
    case "ready":
      return NextResponse.json({
        ok: true,
        status: "ready",
        resultPath: result.resultPath,
        delivery: result.delivery,
      });
    case "processing":
      return NextResponse.json({ ok: true, status: "processing" });
    case "not_paid":
      return NextResponse.json({ ok: false, status: "not_paid" }, { status: 409 });
    case "delayed":
      return NextResponse.json({ ok: false, status: "delayed" }, { status: 502 });
    default:
      return NextResponse.json({ ok: false, status: "server_error" }, { status: 500 });
  }
}
