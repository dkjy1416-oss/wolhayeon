/**
 * POST /api/books/process — 결제 완료된 책 주문의 PDF 제작 (고객 흐름)
 * body: { orderNumber, processToken }  (결제 완료 화면이 발급한 서명 토큰)
 */
import { NextResponse } from "next/server";
import { verifyProcessToken } from "@/lib/customer-process-auth";
import { processBookOrder } from "@/lib/book/book-service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

export async function POST(request: Request) {
  let b: Record<string, unknown> = {};
  try {
    b = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const orderNumber = b.orderNumber;
  if (typeof orderNumber !== "string" || !ORDER_NUMBER_RE.test(orderNumber)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!verifyProcessToken(orderNumber, b.processToken)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const r = await processBookOrder(orderNumber);
  if (r.status === "ready") {
    return NextResponse.json({ ok: true, status: "ready", downloadPath: r.downloadPath });
  }
  return NextResponse.json({ ok: r.status === "processing", status: r.status });
}
