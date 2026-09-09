/**
 * POST /api/rituals/generate — 리추얼 생성 (수동 테스트용, 서버 전용)
 *
 * 보안
 *  - RITUAL_ADMIN_SECRET 환경변수와 일치하는 x-admin-secret 헤더가
 *    있어야만 실행됩니다. (타이밍 공격 방지 비교)
 *  - 환경변수가 설정되지 않았으면 어떤 요청도 실행하지 않습니다(fail-closed).
 *    → 주문번호만 아는 외부인이 Anthropic 비용을 발생시킬 수 없음.
 *  - 응답에는 상태 코드만 담고, 생성된 결과 내용이나 개인정보는
 *    포함하지 않습니다. (결과는 Supabase Table Editor에서 확인)
 */
import { NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";
import { generateRitualForOrder } from "@/lib/ritual-generate";

export const dynamic = "force-dynamic";
/** AI 생성은 1~2분 걸릴 수 있으므로 함수 실행 시간 상한을 늘림 */
export const maxDuration = 300;

const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

function secretMatches(provided: string | null): boolean {
  const expected = process.env.RITUAL_ADMIN_SECRET?.trim();
  if (!expected || expected.length < 16) return false; // fail-closed
  if (!provided) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  /* 인증 — 실패 사유를 구분해 주지 않음 */
  if (!secretMatches(request.headers.get("x-admin-secret"))) {
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
        order_number: result.orderNumber,
        result_version: result.resultVersion,
        message:
          "생성 완료. Supabase의 ritual_results에서 내용을 확인하세요. (검수 대기 상태)",
      });
    case "not_found":
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    case "not_paid":
      return NextResponse.json(
        { ok: false, error: "not_paid", message: "결제 완료(paid) 주문만 생성할 수 있습니다." },
        { status: 409 }
      );
    case "already_generated":
      return NextResponse.json(
        { ok: false, error: "already_generated", message: "이미 생성된 주문입니다. (1주문 1회)" },
        { status: 409 }
      );
    case "already_generating":
      return NextResponse.json(
        { ok: false, error: "already_generating", message: "다른 생성 요청이 진행 중입니다." },
        { status: 409 }
      );
    case "not_reviewable":
      return NextResponse.json(
        { ok: false, error: "not_reviewable" },
        { status: 409 }
      );
    case "generation_failed":
      return NextResponse.json(
        {
          ok: false,
          error: "generation_failed",
          code: result.code,
          message:
            "생성에 실패했습니다. (generation_status=failed — 같은 요청으로 재시도 가능)",
        },
        { status: 502 }
      );
    default:
      return NextResponse.json(
        { ok: false, error: "server_error" },
        { status: 500 }
      );
  }
}
