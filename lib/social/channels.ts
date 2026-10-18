/**
 * 채널별 게시 단계.
 * 영상 처리에 시간이 걸리는 채널(인스타·스레드)은 "컨테이너 생성 → (다음 실행 때) 상태 확인 → 게시"로
 * 나눠서, 한 번의 서버 실행이 오래 붙잡히지 않게 합니다.
 * 각 함수는 현재 상태를 받아 다음 상태를 돌려줍니다.
 */
import "server-only";
import type { ChannelState, SocialPost, Tokens } from "@/lib/social/store";
import { downloadVideo, saveTokens } from "@/lib/social/store";
import { finalText } from "@/lib/social/captions";

const GRAPH = "https://graph.facebook.com/v21.0";
const THREADS = "https://graph.threads.net/v1.0";
const now = () => new Date().toISOString();

async function j(res: Response): Promise<Record<string, unknown>> {
  const t = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(t);
  } catch {
    body = { raw: t.slice(0, 300) };
  }
  if (!res.ok || body.error) {
    const e = body.error as { message?: string } | string | undefined;
    throw new Error(typeof e === "string" ? e : e?.message ?? `http_${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  }
  return body;
}

function form(params: Record<string, string>) {
  return new URLSearchParams(params);
}

const done = (url?: string): ChannelState => ({ status: "done", url, updatedAt: now() });
const processing = (ref: string, prev?: ChannelState): ChannelState => ({ status: "processing", ref, updatedAt: now(), tries: (prev?.tries ?? 0) + 1 });

/* ───────── 인스타그램 릴스 (+ 첫 댓글) ───────── */
export async function stepInstagram(p: SocialPost, t: Tokens, st?: ChannelState): Promise<ChannelState> {
  const m = t.meta;
  if (!m?.igUserId) throw new Error("인스타 연결 안 됨 (페이스북 페이지에 인스타가 연결돼 있어야 해요)");
  const text = finalText(p.captions, p.id);
  if (!st || st.status === "waiting") {
    const r = await j(
      await fetch(`${GRAPH}/${m.igUserId}/media`, {
        method: "POST",
        body: form({ media_type: "REELS", video_url: p.videoUrl, caption: text.instagram, share_to_feed: "true", access_token: m.pageToken }),
      })
    );
    return processing(String(r.id));
  }
  const s = await j(await fetch(`${GRAPH}/${st.ref}?fields=status_code,status&access_token=${m.pageToken}`));
  if (s.status_code === "ERROR") throw new Error("인스타 영상 처리 실패: " + String(s.status ?? ""));
  if (s.status_code !== "FINISHED") {
    if ((st.tries ?? 0) > 40) throw new Error("인스타 영상 처리 시간 초과");
    return processing(st.ref!, st);
  }
  const pub = await j(await fetch(`${GRAPH}/${m.igUserId}/media_publish`, { method: "POST", body: form({ creation_id: st.ref!, access_token: m.pageToken }) }));
  const mediaId = String(pub.id);
  let url: string | undefined;
  try {
    const info = await j(await fetch(`${GRAPH}/${mediaId}?fields=permalink&access_token=${m.pageToken}`));
    url = info.permalink as string;
  } catch {}
  if (text.instagramComment) {
    try {
      await j(await fetch(`${GRAPH}/${mediaId}/comments`, { method: "POST", body: form({ message: text.instagramComment, access_token: m.pageToken }) }));
    } catch (e) {
      console.error("[social] ig_comment_failed", e instanceof Error ? e.message : "");
    }
  }
  return done(url);
}

/* ───────── 페이스북 페이지 영상 ───────── */
export async function stepFacebook(p: SocialPost, t: Tokens): Promise<ChannelState> {
  const m = t.meta;
  if (!m?.pageId) throw new Error("페이스북 페이지 연결 안 됨");
  const text = finalText(p.captions, p.id);
  const r = await j(
    await fetch(`${GRAPH}/${m.pageId}/videos`, {
      method: "POST",
      body: form({ file_url: p.videoUrl, description: text.facebook, access_token: m.pageToken }),
    })
  );
  return done(`https://www.facebook.com/${m.pageId}/videos/${r.id}`);
}

/* ───────── 스레드 ───────── */
export async function stepThreads(p: SocialPost, t: Tokens, st?: ChannelState): Promise<ChannelState> {
  const th = t.threads;
  if (!th) throw new Error("스레드 연결 안 됨");
  const token = await threadsToken(t);
  const text = finalText(p.captions, p.id);
  if (!st || st.status === "waiting") {
    const r = await j(
      await fetch(`${THREADS}/${th.userId}/threads`, { method: "POST", body: form({ media_type: "VIDEO", video_url: p.videoUrl, text: text.threads, access_token: token }) })
    );
    return processing(String(r.id));
  }
  const s = await j(await fetch(`${THREADS}/${st.ref}?fields=status,error_message&access_token=${token}`));
  if (s.status === "ERROR") throw new Error("스레드 영상 처리 실패: " + String(s.error_message ?? ""));
  if (s.status !== "FINISHED") {
    if ((st.tries ?? 0) > 40) throw new Error("스레드 영상 처리 시간 초과");
    return processing(st.ref!, st);
  }
  const pub = await j(await fetch(`${THREADS}/${th.userId}/threads_publish`, { method: "POST", body: form({ creation_id: st.ref!, access_token: token }) }));
  let url: string | undefined;
  try {
    const info = await j(await fetch(`${THREADS}/${pub.id}?fields=permalink&access_token=${token}`));
    url = info.permalink as string;
  } catch {}
  return done(url);
}

/** 스레드 장기 토큰(60일)은 만료 10일 전부터 자동 갱신 */
async function threadsToken(t: Tokens): Promise<string> {
  const th = t.threads!;
  const left = new Date(th.expiresAt).getTime() - Date.now();
  if (left > 10 * 86400_000) return th.token;
  const r = await j(await fetch(`https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${th.token}`));
  const token = String(r.access_token);
  const expiresAt = new Date(Date.now() + Number(r.expires_in ?? 5184000) * 1000).toISOString();
  await saveTokens({ threads: { ...th, token, expiresAt } });
  return token;
}

/* ───────── 유튜브 쇼츠 ───────── */
export async function stepYoutube(p: SocialPost, t: Tokens): Promise<ChannelState> {
  const g = t.google;
  if (!g) throw new Error("유튜브 연결 안 됨");
  const tok = await j(
    await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: form({
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        refresh_token: g.refreshToken,
        grant_type: "refresh_token",
      }),
    })
  );
  const access = String(tok.access_token);
  const text = finalText(p.captions, p.id);
  const meta = {
    snippet: { title: text.youtubeTitle, description: text.youtubeDescription, categoryId: "22", defaultLanguage: "ko" },
    status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
  };
  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "video/mp4",
      "X-Upload-Content-Length": String(p.videoBytes),
    },
    body: JSON.stringify(meta),
  });
  if (!init.ok) throw new Error("유튜브 업로드 시작 실패: " + (await init.text()).slice(0, 200));
  const loc = init.headers.get("location");
  if (!loc) throw new Error("유튜브 업로드 주소 없음");
  const bytes = await downloadVideo(p.videoPath);
  const up = await j(await fetch(loc, { method: "PUT", headers: { "Content-Type": "video/mp4" }, body: bytes }));
  return done(`https://youtube.com/shorts/${up.id}`);
}

/* ───────── 틱톡 ─────────
 * TIKTOK_MODE=draft(기본): 틱톡 앱 '임시저장함'으로 보냄 → 앱에서 인기 음악 붙여 게시 (조회수에 유리)
 * TIKTOK_MODE=direct     : 바로 게시 (틱톡 앱 심사 통과 전에는 '나만 보기'로만 올라감)
 */
export async function stepTiktok(p: SocialPost, t: Tokens): Promise<ChannelState> {
  if (!t.tiktok) throw new Error("틱톡 연결 안 됨");
  const access = await tiktokToken(t);
  const mode = (process.env.TIKTOK_MODE ?? "draft").trim();
  const text = finalText(p.captions, p.id);
  const source_info = { source: "FILE_UPLOAD", video_size: p.videoBytes, chunk_size: p.videoBytes, total_chunk_count: 1 };
  const endpoint = mode === "direct" ? "https://open.tiktokapis.com/v2/post/publish/video/init/" : "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/";
  const body =
    mode === "direct"
      ? {
          post_info: {
            title: text.tiktok,
            privacy_level: process.env.TIKTOK_PRIVACY?.trim() || "SELF_ONLY",
            disable_comment: false,
            disable_duet: false,
            disable_stitch: false,
          },
          source_info,
        }
      : { source_info };
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body),
  });
  const jr = (await r.json()) as { data?: { upload_url?: string; publish_id?: string }; error?: { code?: string; message?: string } };
  if (!r.ok || (jr.error && jr.error.code !== "ok") || !jr.data?.upload_url) throw new Error("틱톡 업로드 시작 실패: " + (jr.error?.message ?? r.status));
  const bytes = await downloadVideo(p.videoPath);
  const put = await fetch(jr.data.upload_url, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Range": `bytes 0-${p.videoBytes - 1}/${p.videoBytes}`, "Content-Length": String(p.videoBytes) },
    body: bytes,
  });
  if (!put.ok) throw new Error("틱톡 영상 전송 실패: " + put.status);
  return { status: "done", ref: jr.data.publish_id, updatedAt: now(), url: mode === "direct" ? undefined : "틱톡 앱 알림(임시저장함)에서 음악 붙여 게시" };
}

async function tiktokToken(t: Tokens): Promise<string> {
  const tk = t.tiktok!;
  if (new Date(tk.accessExpiresAt).getTime() - Date.now() > 10 * 60_000) return tk.accessToken;
  const r = await j(
    await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form({
        client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
        client_secret: process.env.TIKTOK_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: tk.refreshToken,
      }),
    })
  );
  const next = {
    ...tk,
    accessToken: String(r.access_token),
    refreshToken: String(r.refresh_token ?? tk.refreshToken),
    accessExpiresAt: new Date(Date.now() + Number(r.expires_in ?? 86400) * 1000).toISOString(),
  };
  await saveTokens({ tiktok: next });
  return next.accessToken;
}
