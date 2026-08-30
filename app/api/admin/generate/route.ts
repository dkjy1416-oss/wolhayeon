/**
 * POST /api/admin/generate — 관리자 UI에서 AI 결과 생성
 *
 * 기존 /api/rituals/generate(x-admin-secret 수동 테스트용)와 달리
 * 관리자 세션 쿠키 인증을 사용합니다. RITUAL_ADMIN_SECRET을
 * 클라이언트에서 받거나 노출하지 않습니다.
 * 생성 로직은 lib/ritual-generate.ts의 기존 함수를 그대로 재사용하며
 * (복제 없음), 응답에는 개인정보·생성 결과 원문을 포함하지 않습니다.
 */
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { generateRitualForOrder } from "@/lib/ritual-generate";

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

  const result = await generateRitualForOrder(orderNumber);

  switch (result.status) {
    case "success":
      return NextResponse.json({
        ok: true,
        result_version: result.resultVersion,
      });
    case "not_found":
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    case "not_paid":
      return NextResponse.json({ ok: false, error: "not_paid" }, { status: 409 });
    case "already_generated":
      return NextResponse.json(
        { ok: false, error: "already_generated" },
        { status: 409 }
      );
    case "already_generating":
      return NextResponse.json(
        { ok: false, error: "already_generating" },
        { status: 409 }
      );
    case "not_reviewable":
      return NextResponse.json(
        { ok: false, error: "not_reviewable" },
        { status: 409 }
      );
    case "generation_failed":
      return NextResponse.json(
        { ok: false, error: "generation_failed", code: result.code },
        { status: 502 }
      );
    default:
      return NextResponse.json(
        { ok: false, error: "server_error" },
        { status: 500 }
      );
  }
}
