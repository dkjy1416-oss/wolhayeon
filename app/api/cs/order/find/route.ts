import { NextResponse } from "next/server";
import { lightLookup } from "@/lib/cs-actions";
import { safeRoute } from "@/lib/route-safe";
import { allowRequest, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * 라이트 조회: 이름+출생연도(애매하면 이메일 추가)로 읽기 전용 세션 발급.
 * 민감정보는 반환하지 않음 (상태 라벨은 /api/cs/status에서 레벨별 제공).
 */
async function handlePOST(req: Request) {
  if (!allowRequest(`find:${clientIp(req)}`, 12, 10 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, status: "rate_limited", code: "rate_limited", message: "조회가 너무 많아요. 10분 뒤 다시 시도해 주세요." },
      { status: 429 }
    );
  }
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

export const POST = safeRoute("cs_find", handlePOST);
