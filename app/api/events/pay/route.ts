/**
 * POST /api/events/pay — 브라우저 결제 퍼널 이벤트 수집
 * body: { orderNumber, event, code? }
 * 화이트리스트 이벤트만 받고, 개인정보는 받지 않는다.
 */
import { NextResponse } from "next/server";
import {
  CLIENT_PAY_EVENTS,
  ORDER_NUMBER_RE,
  logPayEventServer,
} from "@/lib/pay-events-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const orderNumber = body.orderNumber;
  const event = body.event;
  if (
    typeof orderNumber !== "string" ||
    !ORDER_NUMBER_RE.test(orderNumber) ||
    typeof event !== "string" ||
    !(CLIENT_PAY_EVENTS as readonly string[]).includes(event)
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await logPayEventServer(
    orderNumber,
    event as (typeof CLIENT_PAY_EVENTS)[number],
    typeof body.code === "string" ? body.code : null
  );
  return NextResponse.json({ ok: true });
}
