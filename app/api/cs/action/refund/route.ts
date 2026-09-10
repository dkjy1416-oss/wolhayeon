import { NextResponse } from "next/server";
import { loadCsOrder, actionExecuteRefund } from "@/lib/cs-actions";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    orderNumber?: string;
    csToken?: string;
  } | null;
  const order = await loadCsOrder(body?.orderNumber ?? "", body?.csToken);
  if (!order)
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  const r = await actionExecuteRefund(order);
  return NextResponse.json(r);
}
