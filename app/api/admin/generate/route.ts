/**
 * POST /api/admin/generate — 관리자 UI에서 AI 결과 생성
 *
 * 기존 /api/rituals/generate(x-admin-secret 수동 테스트용)와 달리
 * 관리자 세션 쿠키 인증을 사용합니다. RITUAL_ADMIN_SECRET을
 * 클라이언트에서 받거나 노출하지 않습니다.
 * 고객 흐름과 같은 processPaidOrder(생성 → 자동 승인 → 결과 메일)를 그대로 사용하며,
 * 응답에는 개인정보·생성 결과 원문을 포함하지 않습니다.
 */
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { processPaidOrder } from "@/lib/ritual-process";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

  /* 생성 → 자동 승인 → 고객 메일까지 한 번에 (관리자가 승인을 따로 누를 필요 없음) */
  const result = await processPaidOrder(orderNumber);

  switch (result.status) {
    case "ready":
      return NextResponse.json({ ok: true, delivery: result.delivery });
    case "processing":
      return NextResponse.json({ ok: false, error: "already_generating" }, { status: 409 });
    case "not_paid":
      return NextResponse.json({ ok: false, error: "not_paid" }, { status: 409 });
    case "delayed":
      return NextResponse.json({ ok: false, error: "generation_failed" }, { status: 502 });
    default:
      return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
