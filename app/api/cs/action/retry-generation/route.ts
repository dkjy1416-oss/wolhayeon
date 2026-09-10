import { NextResponse } from "next/server";
import { loadCsOrder } from "@/lib/cs-actions";
import { processPaidOrder } from "@/lib/ritual-process";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { orderNumber?: string; csToken?: string } | null;
  const order = await loadCsOrder(body?.orderNumber ?? "", body?.csToken);
  if (!order) return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  if (order.payment_status !== "paid") return NextResponse.json({ status: "not_paid" }, { status: 409 });
  return NextResponse.json(await processPaidOrder(order.order_number));
}
