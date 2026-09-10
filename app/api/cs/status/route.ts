import { NextResponse } from "next/server";
import { loadCsOrder, getCsStatus } from "@/lib/cs-actions";

export const runtime = "nodejs";

/** 인증된 CS 세션 전용 — 안전 상태 요약 (paymentKey/시크릿 미포함) */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    orderNumber?: string;
    csToken?: string;
  } | null;
  const order = await loadCsOrder(body?.orderNumber ?? "", body?.csToken);
  if (!order)
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  const s = await getCsStatus(order);
  return NextResponse.json({ status: "ok", ...s });
}
