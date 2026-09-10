import { NextResponse } from "next/server";
import { confirmOrderVerification } from "@/lib/cs-actions";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    birthYear?: number;
    email?: string;
    otp?: string;
  } | null;
  if (!body?.name || !body?.email || !/^\d{6}$/.test(body?.otp ?? "")) {
    return NextResponse.json({ status: "invalid" });
  }
  try {
    const r = await confirmOrderVerification({
      name: body.name,
      birthYear: Number(body.birthYear),
      email: body.email,
      otp: body.otp!,
    });
    return NextResponse.json(r);
  } catch {
    return NextResponse.json({ status: "invalid" });
  }
}
