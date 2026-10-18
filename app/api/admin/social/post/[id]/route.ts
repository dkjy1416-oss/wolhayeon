/** PATCH 캡션·예약시간 수정 / 실패 채널 다시 시도, DELETE 기록 삭제 — 관리자 전용 */
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { CHANNELS, deletePostRecord, getPost, MEDIA_BUCKET, savePost, type Captions, type Channel } from "@/lib/social/store";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const p = await getPost(id);
  if (!p) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { captions?: Captions; scheduledAt?: string; retry?: string; cancel?: string };
  if (b.captions) p.captions = b.captions;
  if (b.scheduledAt && !isNaN(new Date(b.scheduledAt).getTime())) p.scheduledAt = new Date(b.scheduledAt).toISOString();
  if (b.retry && (CHANNELS as string[]).includes(b.retry)) p.channels[b.retry as Channel] = { status: "waiting" };
  if (b.cancel && (CHANNELS as string[]).includes(b.cancel)) p.channels[b.cancel as Channel] = { status: "skipped" };
  await savePost(p);
  return NextResponse.json({ ok: true, post: p });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const p = await getPost(id);
  if (p) await getSupabaseAdmin().storage.from(MEDIA_BUCKET).remove([p.videoPath]);
  await deletePostRecord(id);
  return NextResponse.json({ ok: true });
}
