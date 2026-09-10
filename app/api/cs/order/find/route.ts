import { NextResponse } from "next/server";
import { startOrderVerification } from "@/lib/cs-actions";

export const runtime = "nodejs";

/** 주문번호 없이 이름+출생연도+이메일로 주문 확인 시작 (enumeration 방지 응답) */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    birthYear?: number;
    email?: string;
  } | null;
  const name = body?.name?.trim() ?? "";
  const birthYear = Number(body?.birthYear);
  const email = body?.email?.trim() ?? "";
  if (
    name.length < 1 ||
    !Number.isInteger(birthYear) ||
    birthYear < 1900 ||
    birthYear > 2100 ||
    !email.includes("@")
  ) {
    return NextResponse.json({ status: "sent_if_match" });
  }
  try {
    const r = await startOrderVerification({ name, birthYear, email });
    return NextResponse.json(r);
  } catch {
    /* 서버 오류도 동일 응답 — 존재 여부/오류 원인 미노출 */
    return NextResponse.json({ status: "sent_if_match" });
  }
}
