import { NextResponse } from "next/server";
import {
  loadCsOrder,
  startEmailChange,
  confirmEmailChange,
} from "@/lib/cs-actions";

export const runtime = "nodejs";

/** step: "start" {newEmail} → 새 이메일로 OTP / "confirm" {otp} → 변경 확정 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    orderNumber?: string;
    csToken?: string;
    step?: "start" | "confirm";
    newEmail?: string;
    otp?: string;
  } | null;
  const order = await loadCsOrder(body?.orderNumber ?? "", body?.csToken);
  if (!order)
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  if (body?.step === "start") {
    const r = await startEmailChange(order, body.newEmail ?? "");
    return NextResponse.json(r);
  }
  if (body?.step === "confirm" && /^\d{6}$/.test(body?.otp ?? "")) {
    const r = await confirmEmailChange(order, body!.otp!);
    return NextResponse.json(r);
  }
  return NextResponse.json({ ok: false, code: "bad_request" });
}
