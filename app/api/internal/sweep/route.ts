/**
 * GET|POST /api/internal/sweep — 멈춘 주문 자동 재처리 (lib/sweep.ts).
 * 사이트 방문·결제 이벤트 때마다 가볍게 불리고, Vercel 하루 1회 예약 실행으로도 불린다.
 * 응답은 바로 돌려주고 실제 처리는 응답 뒤(after)에서 진행.
 * 개인정보·주문 내용은 응답에 포함하지 않는다.
 */
import { NextResponse, after } from "next/server";
import { claimSweepSlot, pickSweepJob, recordSweepAttempt, runSweepJob } from "@/lib/sweep";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function handle() {
  try {
    if (!(await claimSweepSlot())) return NextResponse.json({ ok: true, ran: false });
    const job = await pickSweepJob();
    if (!job) return NextResponse.json({ ok: true, ran: true, job: null });
    await recordSweepAttempt(job);
    after(async () => {
      const r = await runSweepJob(job);
      console.error(`[sweep] ${job.kind} ${job.why} -> ${r}`);
    });
    return NextResponse.json({ ok: true, ran: true, job: job.kind });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
