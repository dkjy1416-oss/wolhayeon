import { NextResponse } from "next/server";
import { lightLookup } from "@/lib/cs-actions";

export const runtime = "nodejs";

/**
 * 라이트 조회: 이름+출생연도(애매하면 이메일 추가)로 읽기 전용 세션 발급.
 * 민감정보는 반환하지 않음 (상태 라벨은 /api/cs/status에서 레벨별 제공).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    birthYear?: number;
    email?: string;
  } | null;
  const name = body?.name?.trim() ?? "";
  const birthYear = Number(body?.birthYear);
  if (
    name.length < 1 ||
    !Number.isInteger(birthYear) ||
    birthYear < 1900 ||
    birthYear > 2100
  ) {
    return NextResponse.json({ status: "not_found" });
  }
  try {
    const r = await lightLookup({
      name,
      birthYear,
      email: body?.email?.trim() || undefined,
    });
    return NextResponse.json(r);
  } catch {
    return NextResponse.json({ status: "not_found" });
  }
}
