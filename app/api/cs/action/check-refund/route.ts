import { NextResponse } from "next/server";
import { loadCsOrder, actionCheckRefund } from "@/lib/cs-actions";
import { safeRoute } from "@/lib/route-safe";

export const runtime = "nodejs";

async function handlePOST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    orderNumber?: string;
    csToken?: string;
  } | null;
  const order = await loadCsOrder(body?.orderNumber ?? "", body?.csToken);
  if (!order)
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  const r = await actionCheckRefund(order);
  return NextResponse.json(r);
}

export const POST = safeRoute("cs_check_refund", handlePOST);
