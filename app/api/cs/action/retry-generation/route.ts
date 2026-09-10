import { NextResponse } from "next/server";
import { loadCsOrderLite, getCsStatus } from "@/lib/cs-actions";
import { processPaidOrder } from "@/lib/ritual-process";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * 결과 생성 복구 — lite/full 모두 가능하지만 응답은 상태 라벨만 반환.
 * 결과 원문 URL이나 process token은 절대 반환하지 않는다.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    orderNumber?: string;
    token?: string;
    csToken?: string;
  } | null;

  const token = body?.token ?? body?.csToken;
  const ctx = await loadCsOrderLite(body?.orderNumber ?? "", token);
  if (!ctx) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  }
  if (ctx.order.payment_status !== "paid") {
    return NextResponse.json({ status: "not_paid" });
  }

  const before = await getCsStatus(ctx.order, "lite");
  if (before.hasResult) {
    return NextResponse.json({
      status: "ok",
      generation: before.generation,
      delivery: before.delivery,
      hasResult: true,
    });
  }

  const updatedAtMs = Date.parse(ctx.order.updated_at);
  const staleGenerating =
    ctx.order.generation_status === "generating" &&
    Number.isFinite(updatedAtMs) &&
    Date.now() - updatedAtMs > 330_000;

  /* 정상 생성 중이면 중복 AI 생성을 시작하지 않고 상태만 반환 */
  if (ctx.order.generation_status === "generating" && !staleGenerating) {
    return NextResponse.json({
      status: "ok",
      generation: "generating",
      delivery: before.delivery,
      hasResult: false,
    });
  }

  try {
    await processPaidOrder(ctx.order.order_number);
  } catch {
    /* 아래 fresh 상태 조회로 결과 판단 */
  }

  const fresh = await loadCsOrderLite(body?.orderNumber ?? "", token);
  const after = fresh ? await getCsStatus(fresh.order, "lite") : before;

  return NextResponse.json({
    status: "ok",
    generation: after.generation,
    delivery: after.delivery,
    hasResult: after.hasResult,
  });
}
