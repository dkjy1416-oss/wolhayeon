/** POST 영상 업로드용 1회용 주소 발급 (브라우저 → Supabase Storage 직접 업로드) — 관리자 전용 */
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { ensureBuckets, MEDIA_BUCKET } from "@/lib/social/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { filename?: string; size?: number };
  if (!b.size || b.size > 300 * 1024 * 1024) return NextResponse.json({ ok: false, error: "영상은 300MB 이하만 올릴 수 있어요" }, { status: 400 });
  const ext = (b.filename?.split(".").pop() ?? "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  await ensureBuckets();
  const path = `${new Date().toISOString().slice(0, 10)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { data, error } = await getSupabaseAdmin().storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ ok: false, error: "업로드 주소를 만들지 못했어요" }, { status: 500 });
  return NextResponse.json({ ok: true, path, uploadUrl: data.signedUrl });
}
