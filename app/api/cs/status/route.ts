import { NextResponse, after } from "next/server";
import { loadCsOrderLite, getCsStatus } from "@/lib/cs-actions";
import { kickSweep } from "@/lib/sweep-kick";

export const runtime = "nodejs";

/** 상태 요약 — lite: 라벨만 / full: 결과 링크·처리 토큰 포함 */
export async function POST(req: Request) {
  /* 멈춘 주문 자동 재처리 깨우기 (응답 뒤, 실패해도 무관) */
  after(() => kickSweep());
  const body = (await req.json().catch(() => null)) as {
    orderNumber?: string;
    token?: string;
    csToken?: string;
  } | null;
  const ctx = await loadCsOrderLite(
    body?.orderNumber ?? "",
    body?.token ?? body?.csToken
  );
  if (!ctx)
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  const s = await getCsStatus(ctx.order, ctx.level);
  return NextResponse.json({ status: "ok", level: ctx.level, ...s });
}
