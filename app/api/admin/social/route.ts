/** GET 게시물 목록·채널 연결 상태 / POST 새 게시물 (캡션 자동 작성) — 관리자 전용 */
import { NextResponse, after } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { CHANNELS, getTokens, listPosts, newPostId, publicVideoUrl, savePost, type Channel, type SocialPost } from "@/lib/social/store";
import { generateCaptions } from "@/lib/social/captions";
import { advancePost } from "@/lib/social/runner";
import { missingEnv, PROVIDERS } from "@/lib/social/oauth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const unauthorized = () => NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

export async function GET() {
  if (!(await isAdminAuthenticated())) return unauthorized();
  const [posts, t] = await Promise.all([listPosts(60), getTokens()]);
  const connections = {
    meta: t.meta ? { name: t.meta.pageName, ig: t.meta.igUsername ?? null, savedAt: t.meta.savedAt } : null,
    threads: t.threads ? { name: "스레드", savedAt: t.threads.savedAt, expiresAt: t.threads.expiresAt } : null,
    google: t.google ? { name: t.google.channelTitle ?? "유튜브", savedAt: t.google.savedAt } : null,
    tiktok: t.tiktok ? { name: t.tiktok.name ?? "틱톡", savedAt: t.tiktok.savedAt } : null,
  };
  const envMissing = Object.fromEntries(PROVIDERS.map((p) => [p, missingEnv(p)]));
  return NextResponse.json({ ok: true, posts, connections, envMissing, tiktokMode: process.env.TIKTOK_MODE ?? "draft" });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) return unauthorized();
  const b = (await req.json().catch(() => ({}))) as {
    videoPath?: string;
    videoBytes?: number;
    memo?: string;
    scheduledAt?: string;
    channels?: string[];
    publishNow?: boolean;
  };
  if (!b.videoPath || !b.videoBytes || !b.memo?.trim()) return NextResponse.json({ ok: false, error: "영상과 내용 메모가 필요해요" }, { status: 400 });
  const chans = (b.channels ?? CHANNELS).filter((c): c is Channel => (CHANNELS as string[]).includes(c));
  const when = b.publishNow || !b.scheduledAt ? new Date() : new Date(b.scheduledAt);
  if (isNaN(when.getTime())) return NextResponse.json({ ok: false, error: "예약 시간이 이상해요" }, { status: 400 });
  const captions = await generateCaptions(b.memo.trim());
  const post: SocialPost = {
    id: newPostId(),
    createdAt: new Date().toISOString(),
    memo: b.memo.trim(),
    videoPath: b.videoPath,
    videoUrl: publicVideoUrl(b.videoPath),
    videoBytes: b.videoBytes,
    scheduledAt: when.toISOString(),
    channels: Object.fromEntries(chans.map((c) => [c, { status: "waiting" }])),
    captions,
  };
  await savePost(post);
  if (b.publishNow) after(async () => void (await advancePost(post)));
  return NextResponse.json({ ok: true, post });
}
