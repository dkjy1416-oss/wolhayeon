/** GET /chat/bundle?o=WC-...&t=<bundle token> — 패키지 재회 분석 이용권 쿠키를 심고 신청서로 */
import { NextResponse } from "next/server";
import { verifyChatToken } from "@/lib/chat/auth";
import { BUNDLE_COOKIE } from "@/lib/chat/bundle";

export async function GET(request: Request) {
  const u = new URL(request.url);
  const o = u.searchParams.get("o") ?? "";
  const t = u.searchParams.get("t") ?? "";
  if (!verifyChatToken("bundle", o, t)) return NextResponse.redirect(new URL("/chat", u.origin), 302);
  const res = NextResponse.redirect(new URL("/apply?from=chat_bundle", u.origin), 302);
  res.cookies.set(BUNDLE_COOKIE, `${o}.${t}`, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 30 * 86400 });
  return res;
}
