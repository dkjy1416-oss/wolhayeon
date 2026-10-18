/**
 * 채널 연결(OAuth). 관리자 화면의 "연결" 버튼 → 각 플랫폼 로그인 → 콜백에서 토큰 저장.
 * 앱 ID·시크릿은 Vercel 환경변수에만 둡니다 (브라우저로 나가지 않음).
 */
import "server-only";
import { createHmac } from "crypto";
import { saveTokens } from "@/lib/social/store";

export type Provider = "meta" | "threads" | "google" | "tiktok";
export const PROVIDERS: Provider[] = ["meta", "threads", "google", "tiktok"];

const SITE = (process.env.SOCIAL_SITE_URL ?? "https://thewolha.com").replace(/\/+$/, "");
export const redirectUri = (p: Provider) => `${SITE}/api/social/callback/${p}`;

function secret() {
  return process.env.RITUAL_ADMIN_SECRET ?? "";
}
export function makeState(p: Provider) {
  const exp = Date.now() + 15 * 60_000;
  return `${exp}.${createHmac("sha256", secret()).update(`social:${p}:${exp}`).digest("hex").slice(0, 32)}`;
}
export function checkState(p: Provider, state: string | null) {
  if (!state || secret().length < 16) return false;
  const [exp, sig] = state.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return createHmac("sha256", secret()).update(`social:${p}:${exp}`).digest("hex").slice(0, 32) === sig;
}

export function missingEnv(p: Provider): string[] {
  const need: Record<Provider, string[]> = {
    meta: ["META_APP_ID", "META_APP_SECRET"],
    threads: ["THREADS_APP_ID", "THREADS_APP_SECRET"],
    google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    tiktok: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
  };
  return need[p].filter((k) => !process.env[k]?.trim());
}

const env = (k: string) => process.env[k]?.trim() ?? "";

export function authorizeUrl(p: Provider): string {
  const state = makeState(p);
  const ru = encodeURIComponent(redirectUri(p));
  switch (p) {
    case "meta":
      return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${env("META_APP_ID")}&redirect_uri=${ru}&state=${state}&scope=${encodeURIComponent(
        "pages_show_list,pages_read_engagement,pages_manage_posts,publish_video,business_management,instagram_basic,instagram_content_publish,instagram_manage_comments"
      )}`;
    case "threads":
      return `https://threads.net/oauth/authorize?client_id=${env("THREADS_APP_ID")}&redirect_uri=${ru}&scope=threads_basic,threads_content_publish&response_type=code&state=${state}`;
    case "google":
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${env("GOOGLE_CLIENT_ID")}&redirect_uri=${ru}&response_type=code&access_type=offline&prompt=consent&scope=${encodeURIComponent(
        "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly"
      )}&state=${state}`;
    case "tiktok":
      return `https://www.tiktok.com/v2/auth/authorize/?client_key=${env("TIKTOK_CLIENT_KEY")}&response_type=code&scope=user.info.basic,video.upload,video.publish&redirect_uri=${ru}&state=${state}`;
  }
}

async function json(res: Response) {
  const b = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || b.error) throw new Error(JSON.stringify(b.error ?? b).slice(0, 300));
  return b;
}

/** 콜백 code → 토큰 교환 후 저장. 연결된 계정 이름을 돌려줌 */
export async function exchange(p: Provider, code: string): Promise<string> {
  const savedAt = new Date().toISOString();
  if (p === "meta") {
    const s = await json(
      await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${env("META_APP_ID")}&redirect_uri=${encodeURIComponent(redirectUri(p))}&client_secret=${env("META_APP_SECRET")}&code=${code}`
      )
    );
    const l = await json(
      await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${env("META_APP_ID")}&client_secret=${env("META_APP_SECRET")}&fb_exchange_token=${s.access_token}`
      )
    );
    const acc = await json(
      await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${l.access_token}`)
    );
    const pages = (acc.data as { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username: string } }[]) ?? [];
    const want = env("META_PAGE_NAME") || "월하연";
    const page = pages.find((x) => x.name.includes(want)) ?? pages.find((x) => x.instagram_business_account) ?? pages[0];
    if (!page) throw new Error("관리 중인 페이스북 페이지를 찾지 못했어요");
    await saveTokens({
      meta: {
        pageId: page.id,
        pageName: page.name,
        pageToken: page.access_token,
        igUserId: page.instagram_business_account?.id,
        igUsername: page.instagram_business_account?.username,
        savedAt,
      },
    });
    return `${page.name}${page.instagram_business_account ? ` + @${page.instagram_business_account.username}` : " (인스타 미연결)"}`;
  }
  if (p === "threads") {
    const s = await json(
      await fetch("https://graph.threads.net/oauth/access_token", {
        method: "POST",
        body: new URLSearchParams({
          client_id: env("THREADS_APP_ID"),
          client_secret: env("THREADS_APP_SECRET"),
          grant_type: "authorization_code",
          redirect_uri: redirectUri(p),
          code,
        }),
      })
    );
    const l = await json(
      await fetch(`https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${env("THREADS_APP_SECRET")}&access_token=${s.access_token}`)
    );
    await saveTokens({
      threads: {
        userId: String(s.user_id),
        token: String(l.access_token),
        expiresAt: new Date(Date.now() + Number(l.expires_in ?? 5184000) * 1000).toISOString(),
        savedAt,
      },
    });
    return "스레드";
  }
  if (p === "google") {
    const s = await json(
      await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: new URLSearchParams({
          client_id: env("GOOGLE_CLIENT_ID"),
          client_secret: env("GOOGLE_CLIENT_SECRET"),
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri(p),
        }),
      })
    );
    if (!s.refresh_token) throw new Error("갱신 토큰이 없어요. 다시 연결해 주세요");
    let channelTitle: string | undefined;
    try {
      const ch = await json(await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: `Bearer ${s.access_token}` } }));
      channelTitle = (ch.items as { snippet: { title: string } }[])?.[0]?.snippet?.title;
    } catch {}
    await saveTokens({ google: { refreshToken: String(s.refresh_token), channelTitle, savedAt } });
    return channelTitle ?? "유튜브";
  }
  const s = await json(
    await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: env("TIKTOK_CLIENT_KEY"),
        client_secret: env("TIKTOK_CLIENT_SECRET"),
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri(p),
      }),
    })
  );
  let name: string | undefined;
  try {
    const u = await json(await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name", { headers: { Authorization: `Bearer ${s.access_token}` } }));
    name = ((u.data as { user?: { display_name?: string } })?.user?.display_name) ?? undefined;
  } catch {}
  await saveTokens({
    tiktok: {
      openId: String(s.open_id),
      accessToken: String(s.access_token),
      refreshToken: String(s.refresh_token),
      accessExpiresAt: new Date(Date.now() + Number(s.expires_in ?? 86400) * 1000).toISOString(),
      savedAt,
      name,
    },
  });
  return name ?? "틱톡";
}
