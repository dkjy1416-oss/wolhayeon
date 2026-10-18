/**
 * 플랫폼 로그인 후 돌아오는 곳: 토큰 저장 → 관리자 업로드 센터로.
 * 관리자 쿠키는 SameSite=strict 라서 외부 사이트(페이스북 등)에서 돌아올 때 붙지 않습니다.
 * 대신 연결 시작 때 관리자만 만들 수 있는 서명된 state(15분 유효)로 확인하고,
 * 화면 이동은 우리 사이트 안에서 다시 시작해(HTML 이동) 쿠키가 정상으로 붙게 합니다.
 */
import { checkState, exchange, PROVIDERS, type Provider } from "@/lib/social/oauth";

export const dynamic = "force-dynamic";

function back(q: string) {
  const to = `/admin/social?${q}`;
  const html = `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${to.replace(/"/g, "&quot;")}"><script>location.replace(${JSON.stringify(to).replace(/</g, "\\u003c")})</script>이동 중…`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const url = new URL(req.url);
  const { provider } = await ctx.params;
  if (!(PROVIDERS as string[]).includes(provider)) return back("error=unknown_provider");
  if (!checkState(provider as Provider, url.searchParams.get("state"))) return back("error=" + encodeURIComponent("연결 시간이 지났어요. 다시 눌러 주세요"));
  const code = url.searchParams.get("code");
  if (!code) return back("error=" + encodeURIComponent(url.searchParams.get("error_description") ?? url.searchParams.get("error") ?? "취소됨"));
  try {
    const name = await exchange(provider as Provider, code);
    return back("connected=" + encodeURIComponent(name));
  } catch (e) {
    return back("error=" + encodeURIComponent((e instanceof Error ? e.message : "연결 실패").slice(0, 200)));
  }
}
