/** POST /api/admin/login — 관리자 로그인 (서버 전용 비교, 서명 쿠키 발급) */
import { NextResponse } from "next/server";
import {
  verifyAdminSecret,
  createSessionToken,
  sessionCookieOptions,
  ADMIN_COOKIE_NAME,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const secret = (body as Record<string, unknown>)?.secret;

  if (!verifyAdminSecret(secret)) {
    // 실패 사유(키 미설정/불일치)를 구분해 알려주지 않음
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const token = createSessionToken();
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, sessionCookieOptions());
  return res;
}
