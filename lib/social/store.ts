/**
 * SNS 업로드 센터 저장소.
 *
 * 새 DB 테이블 없이 Supabase Storage 두 개만 씁니다 (서버가 처음 쓸 때 자동 생성).
 *  - social-media   (공개)  : 업로드한 영상. 인스타·스레드·페이스북이 URL로 가져가야 해서 공개.
 *  - social-private (비공개): 게시물 기록(JSON)과 채널 연결 토큰.
 */
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const MEDIA_BUCKET = "social-media";
export const PRIVATE_BUCKET = "social-private";

export type Channel = "instagram" | "facebook" | "threads" | "youtube" | "tiktok";
export const CHANNELS: Channel[] = ["instagram", "facebook", "threads", "youtube", "tiktok"];

export type ChannelState = {
  status: "waiting" | "processing" | "done" | "error" | "skipped";
  /** 처리 중 컨테이너 id 등 채널별 중간 값 */
  ref?: string;
  /** 게시 후 링크 */
  url?: string;
  error?: string;
  updatedAt?: string;
  tries?: number;
};

export type Captions = {
  instagram: { caption: string; first_comment: string };
  facebook: { caption: string };
  threads: { text: string };
  youtube: { title: string; description: string };
  tiktok: { caption: string };
};

export type SocialPost = {
  id: string; // 예: p2610181530
  createdAt: string;
  memo: string;
  videoPath: string; // social-media 버킷 안 경로
  videoUrl: string; // 공개 URL
  videoBytes: number;
  scheduledAt: string; // ISO. 이 시각 이후 첫 실행 때 게시
  channels: Partial<Record<Channel, ChannelState>>;
  captions: Captions;
};

export type Tokens = {
  meta?: { pageId: string; pageName: string; pageToken: string; igUserId?: string; igUsername?: string; savedAt: string };
  threads?: { userId: string; token: string; expiresAt: string; savedAt: string };
  google?: { refreshToken: string; channelTitle?: string; savedAt: string };
  tiktok?: { openId: string; accessToken: string; refreshToken: string; accessExpiresAt: string; savedAt: string; name?: string };
};

let bucketsReady = false;
export async function ensureBuckets() {
  if (bucketsReady) return;
  const sb = getSupabaseAdmin();
  const { data } = await sb.storage.listBuckets();
  const names = new Set((data ?? []).map((b) => b.name));
  if (!names.has(MEDIA_BUCKET)) await sb.storage.createBucket(MEDIA_BUCKET, { public: true });
  if (!names.has(PRIVATE_BUCKET)) await sb.storage.createBucket(PRIVATE_BUCKET, { public: false });
  bucketsReady = true;
}

async function readJson<T>(path: string): Promise<T | null> {
  const { data, error } = await getSupabaseAdmin().storage.from(PRIVATE_BUCKET).download(path);
  if (error || !data) return null;
  try {
    return JSON.parse(await data.text()) as T;
  } catch {
    return null;
  }
}

async function writeJson(path: string, value: unknown) {
  const body = new Blob([JSON.stringify(value, null, 1)], { type: "application/json" });
  const { error } = await getSupabaseAdmin().storage.from(PRIVATE_BUCKET).upload(path, body, { upsert: true, contentType: "application/json" });
  if (error) throw new Error("store_write_failed: " + error.message);
}

export async function getTokens(): Promise<Tokens> {
  await ensureBuckets();
  return (await readJson<Tokens>("tokens.json")) ?? {};
}

export async function saveTokens(patch: Partial<Tokens>) {
  const cur = await getTokens();
  await writeJson("tokens.json", { ...cur, ...patch });
}

export async function removeToken(key: keyof Tokens) {
  const cur = await getTokens();
  delete cur[key];
  await writeJson("tokens.json", cur);
}

export async function getPost(id: string): Promise<SocialPost | null> {
  return readJson<SocialPost>(`posts/${id}.json`);
}

export async function savePost(p: SocialPost) {
  await writeJson(`posts/${p.id}.json`, p);
}

export async function deletePostRecord(id: string) {
  await getSupabaseAdmin().storage.from(PRIVATE_BUCKET).remove([`posts/${id}.json`]);
}

export async function listPosts(limit = 60): Promise<SocialPost[]> {
  await ensureBuckets();
  const { data } = await getSupabaseAdmin()
    .storage.from(PRIVATE_BUCKET)
    .list("posts", { limit: 500, sortBy: { column: "name", order: "desc" } });
  const ids = (data ?? []).map((f) => f.name.replace(/\.json$/, "")).filter(Boolean).slice(0, limit);
  const posts = await Promise.all(ids.map((id) => getPost(id)));
  return posts.filter((p): p is SocialPost => !!p).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function publicVideoUrl(path: string): string {
  return getSupabaseAdmin().storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function downloadVideo(path: string): Promise<ArrayBuffer> {
  const { data, error } = await getSupabaseAdmin().storage.from(MEDIA_BUCKET).download(path);
  if (error || !data) throw new Error("video_download_failed");
  return data.arrayBuffer();
}

/** KST 기준 짧은 게시물 id: p + yyMMddHHmm + 2자리 랜덤 */
export function newPostId(now = new Date()): string {
  const k = new Date(now.getTime() + 9 * 3600_000);
  const s = k.toISOString().replace(/[-:T]/g, "").slice(2, 12);
  return `p${s}${Math.floor(Math.random() * 90 + 10)}`;
}
