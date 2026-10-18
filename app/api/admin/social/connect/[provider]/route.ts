/** GET 채널 연결 시작 (플랫폼 로그인으로 이동) / DELETE 연결 해제 — 관리자 전용 */
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { authorizeUrl, missingEnv, PROVIDERS, type Provider } from "@/lib/social/oauth";
import { removeToken } from "@/lib/social/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.redirect(new URL("/admin/login", req.url));
  const { provider } = await ctx.params;
  if (!(PROVIDERS as string[]).includes(provider)) return NextResponse.json({ ok: false }, { status: 404 });
  const miss = missingEnv(provider as Provider);
  if (miss.length) return NextResponse.redirect(new URL(`/admin/social?error=${encodeURIComponent("Vercel 환경변수 필요: " + miss.join(", "))}`, req.url));
  return NextResponse.redirect(authorizeUrl(provider as Provider));
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ provider: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 });
  const { provider } = await ctx.params;
  if (!(PROVIDERS as string[]).includes(provider)) return NextResponse.json({ ok: false }, { status: 404 });
  await removeToken(provider as Provider);
  return NextResponse.json({ ok: true });
}
