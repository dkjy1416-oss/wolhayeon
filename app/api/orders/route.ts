/**
 * POST /api/orders — 주문 생성 (서버 전용)
 *
 * 보안 원칙
 *  - service_role key는 이 서버 코드에서만 사용 (RLS 우회).
 *  - 브라우저 body는 화이트리스트 정제 + 재검증 후에만 저장.
 *  - order_number / payment_amount(16,900) / 4가지 상태값은
 *    클라이언트 값을 절대 받지 않고 DB 기본값이 결정.
 *  - 개인정보(이름·이메일·사연 등)는 어떤 로그에도 남기지 않음.
 *    로그는 requestId + 오류 code만.
 *
 * 중복 방지 (idempotency)
 *  - 클라이언트가 신청 세션마다 1회 생성한 submission_id(UUID)를
 *    함께 보냄. DB unique 제약으로 같은 세션의 두 번째 insert는
 *    실패하며, 그 경우 기존 주문의 주문번호를 그대로 반환.
 */
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sanitizeAndValidateApplication } from "@/lib/ritual-validation";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FRIENDLY_ERROR =
  "신청을 저장하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";

export async function POST(request: Request) {
  const requestId = randomUUID().slice(0, 8);

  /* 1) body 파싱 */
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json", message: FRIENDLY_ERROR },
      { status: 400 }
    );
  }
  const b = (body ?? {}) as Record<string, unknown>;

  /* 2) submission_id (선택적, UUID 형식일 때만 사용 — 개인정보 아님) */
  const submissionId =
    typeof b.submission_id === "string" && UUID_RE.test(b.submission_id)
      ? b.submission_id.toLowerCase()
      : null;

  /* 3) 화이트리스트 정제 + 서버 재검증 */
  const { data, invalidFields } = sanitizeAndValidateApplication(b.application);
  if (!data) {
    // 필드 '이름'만 반환 (값은 절대 포함하지 않음)
    return NextResponse.json(
      {
        ok: false,
        error: "validation_failed",
        invalid_fields: invalidFields,
        message:
          "입력 내용에 확인이 필요한 항목이 있습니다. 신청서를 다시 확인해주세요.",
      },
      { status: 400 }
    );
  }

  /* 4) DB insert — 정제된 신청 필드 + submission_id만.
        가격/상태/주문번호는 DB 기본값. */
  try {
    const supabase = getSupabaseAdmin();
    const payload: Record<string, unknown> = { ...data };
    if (submissionId) payload.submission_id = submissionId;

    let res = await supabase
      .from("ritual_orders")
      .insert(payload)
      .select("order_number")
      .single();

    /* 4-a) submission_id unique 충돌 = 같은 세션의 재요청(더블클릭 등)
            → 이미 생성된 주문의 주문번호를 반환 (멱등 성공) */
    if (res.error && res.error.code === "23505" && submissionId) {
      const existing = await supabase
        .from("ritual_orders")
        .select("order_number")
        .eq("submission_id", submissionId)
        .single();
      if (!existing.error && existing.data) {
        return NextResponse.json({
          ok: true,
          order_number: existing.data.order_number,
          duplicate: true,
        });
      }
    }

    /* 4-b) submission_id 컬럼이 아직 없는 DB(마이그레이션 미실행)면
            컬럼 없이 재시도 — 중복 방지만 약해질 뿐 주문 생성은 동작 */
    if (
      res.error &&
      (res.error.code === "42703" || res.error.code === "PGRST204")
    ) {
      res = await supabase
        .from("ritual_orders")
        .insert({ ...data })
        .select("order_number")
        .single();
    }

    if (res.error || !res.data) {
      // 개인정보 없는 최소 로그만
      console.error(
        `[orders:${requestId}] insert_failed code=${res.error?.code ?? "unknown"}`
      );
      return NextResponse.json(
        { ok: false, error: "insert_failed", message: FRIENDLY_ERROR },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, order_number: res.data.order_number });
  } catch (e) {
    // env 누락 등 초기화 실패 — 상세 내용은 사용자에게 노출하지 않음
    const code = e instanceof Error ? e.constructor.name : "unknown";
    console.error(`[orders:${requestId}] server_error code=${code}`);
    return NextResponse.json(
      { ok: false, error: "server_error", message: FRIENDLY_ERROR },
      { status: 500 }
    );
  }
}
