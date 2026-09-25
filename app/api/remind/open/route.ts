/**
 * GET /api/remind/open?order=WH-...&t=<remindToken>
 *
 * 리마인드 메일 링크의 착지점.
 * 14일짜리 remind 토큰을 검증한 뒤, 기존 미리보기 검증 로직이 그대로
 * 이해하는 30분짜리 continue 토큰을 새로 발급해 미리보기 페이지로
 * 리다이렉트한다. 실패 시에는 신청 첫 화면으로 보낸다.
 */
import { NextResponse } from "next/server";
import { verifyRemindToken } from "@/lib/remind-auth";
import { createContinueToken } from "@/lib/cs-auth";

export const dynamic = "force-dynamic";

const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const order = url.searchParams.get("order") ?? "";
  const token = url.searchParams.get("t") ?? "";

  const fallback = new URL("/apply", url.origin);

  if (!ORDER_NUMBER_RE.test(order) || !verifyRemindToken(order, token)) {
    return NextResponse.redirect(fallback, 302);
  }

  const ct = createContinueToken(order);
  if (!ct) return NextResponse.redirect(fallback, 302);

  const dest = new URL("/apply/preview", url.origin);
  dest.searchParams.set("order", order);
  dest.searchParams.set("ct", ct);
  return NextResponse.redirect(dest, 302);
}
