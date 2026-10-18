/**
 * 예약된 SNS 게시 진행 (10분마다 GitHub Actions가 호출).
 * 헤더 x-social-secret 이 SOCIAL_CRON_SECRET 과 같아야 실행.
 */
import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { runDue } from "@/lib/social/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function ok(given: string | null) {
  const s = process.env.SOCIAL_CRON_SECRET?.trim();
  if (!s || s.length < 16 || !given) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(s).digest();
  return timingSafeEqual(a, b);
}

async function handle(req: Request) {
  if (!ok(req.headers.get("x-social-secret"))) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await runDue()) });
  } catch (e) {
    console.error("[social-tick]", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
