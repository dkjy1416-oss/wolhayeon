import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * /admin/stats — 일별 유입·퍼널 통계 (관리자 전용, 실시간 DB 집계)
 *
 * - 실사용자 기준: 운영자 테스트 이메일 제외
 * - 방문자 수(트래픽)는 Vercel Analytics에서 확인 (여기는 신청 이후 퍼널)
 */

const OPERATOR_EMAILS = new Set(["dkjy1416@naver.com", "tosstest@gmail.com"]);
const DAYS = 14;

interface Row {
  created_at: string;
  paid_at: string | null;
  preview_generated_at: string | null;
  email: string | null;
  applicant_name: string | null;
  payment_amount: number | null;
  remind_sent_at?: string | null;
}

function kstDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}
function kstHour(iso: string): number {
  return Number(
    new Date(iso).toLocaleString("en-GB", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      hour12: false,
    })
  );
}

export default async function AdminStatsPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();

  let rows: Row[] = [];
  let remindAvailable = true;
  {
    const res = await supabase
      .from("ritual_orders")
      .select(
        "created_at, paid_at, preview_generated_at, email, applicant_name, payment_amount, remind_sent_at"
      )
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (res.error) {
      remindAvailable = false;
      const res2 = await supabase
        .from("ritual_orders")
        .select(
          "created_at, paid_at, preview_generated_at, email, applicant_name, payment_amount"
        )
        .gt("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000);
      rows = (res2.data ?? []) as Row[];
    } else {
      rows = (res.data ?? []) as Row[];
    }
  }

  const real = rows.filter(
    (r) => !OPERATOR_EMAILS.has((r.email ?? "").toLowerCase())
  );

  /* ---- 일별 집계 ---- */
  const byDay = new Map<
    string,
    { applied: number; preview: number; paid: number; revenue: number }
  >();
  for (const r of real) {
    const d = kstDate(r.created_at);
    const cur =
      byDay.get(d) ?? { applied: 0, preview: 0, paid: 0, revenue: 0 };
    cur.applied += 1;
    if (r.preview_generated_at) cur.preview += 1;
    if (r.paid_at) {
      cur.paid += 1;
      cur.revenue += r.payment_amount ?? 0;
    }
    byDay.set(d, cur);
  }
  const days = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const maxApplied = Math.max(1, ...days.map(([, v]) => v.applied));

  /* ---- 합계·오늘 ---- */
  const todayKey = kstDate(new Date().toISOString());
  const today = byDay.get(todayKey) ?? {
    applied: 0,
    preview: 0,
    paid: 0,
    revenue: 0,
  };
  const total = {
    applied: real.length,
    preview: real.filter((r) => r.preview_generated_at).length,
    paid: real.filter((r) => r.paid_at).length,
    revenue: real.reduce((s, r) => s + (r.paid_at ? r.payment_amount ?? 0 : 0), 0),
  };
  const convApplyPay = total.applied
    ? ((total.paid / total.applied) * 100).toFixed(1)
    : "0.0";

  /* ---- 시간대 분포 (최근 7일) ---- */
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const hours = new Array<number>(24).fill(0);
  for (const r of real) {
    if (new Date(r.created_at).getTime() >= weekAgo)
      hours[kstHour(r.created_at) % 24] += 1;
  }
  const maxHour = Math.max(1, ...hours);

  /* ---- 리마인드 ---- */
  const reminded = remindAvailable
    ? real.filter((r) => r.remind_sent_at).length
    : 0;
  const remindReturns = remindAvailable
    ? real.filter(
        (r) =>
          r.remind_sent_at &&
          r.paid_at &&
          new Date(r.paid_at) > new Date(r.remind_sent_at)
      ).length
    : 0;

  /* ---- 최근 결제 ---- */
  const recentPaid = real
    .filter((r) => r.paid_at)
    .sort((a, b) => (a.paid_at! < b.paid_at! ? 1 : -1))
    .slice(0, 5);

  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-2xl px-6 py-12 text-ivory">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-xl font-semibold">유입·전환 통계</h1>
        <a href="/admin/orders" className="text-[0.78rem] text-gold underline">
          주문 목록 →
        </a>
      </div>
      <p className="mt-2 text-[0.78rem] text-ivory-dim">
        최근 {DAYS}일 · 실사용자 기준(운영자 테스트 제외) · 방문자 수는 Vercel
        Analytics에서 확인
      </p>

      {/* 오늘 요약 */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["오늘 신청", `${today.applied}명`],
          ["오늘 미리보기", `${today.preview}명`],
          ["오늘 결제", `${today.paid}건`],
          ["오늘 매출", `${today.revenue.toLocaleString()}원`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-gold-dim/25 bg-ink-soft/70 px-4 py-4"
          >
            <p className="text-[0.7rem] text-ivory-dim">{label}</p>
            <p className="mt-1 text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* 기간 합계 */}
      <div className="mt-4 rounded-xl border border-gold-dim/25 bg-ink-soft/50 px-5 py-4 text-[0.85rem] leading-[1.9]">
        {DAYS}일 합계 — 신청 <b>{total.applied}</b> · 미리보기 도달{" "}
        <b>{total.preview}</b> · 결제 <b className="text-gold">{total.paid}</b>{" "}
        ({convApplyPay}%) · 매출{" "}
        <b className="text-gold">{total.revenue.toLocaleString()}원</b>
        {remindAvailable ? (
          <>
            <br />
            리마인드 발송 <b>{reminded}</b>명 · 리마인드 후 결제{" "}
            <b>{remindReturns}</b>건
          </>
        ) : null}
      </div>

      {/* 일별 표 */}
      <h2 className="font-display mt-10 text-[1rem] font-semibold">
        일별 추이
      </h2>
      <div className="mt-3 flex flex-col gap-2">
        {days.map(([d, v]) => (
          <div key={d} className="flex items-center gap-3 text-[0.8rem]">
            <span className="w-[4.6rem] shrink-0 text-ivory-dim">
              {d.slice(5)}
            </span>
            <div className="h-4 flex-1 overflow-hidden rounded-sm bg-ink-soft">
              <div
                className="h-full bg-gold-dim/60"
                style={{ width: `${(v.applied / maxApplied) * 100}%` }}
                aria-hidden
              />
            </div>
            <span className="w-[11rem] shrink-0 text-right tabular-nums">
              신청 {v.applied} · 보기 {v.preview} · 결제{" "}
              <span className={v.paid ? "text-gold" : ""}>{v.paid}</span>
            </span>
          </div>
        ))}
        {days.length === 0 && (
          <p className="text-[0.85rem] text-ivory-dim">기간 내 신청이 없습니다.</p>
        )}
      </div>

      {/* 시간대 분포 */}
      <h2 className="font-display mt-10 text-[1rem] font-semibold">
        시간대별 신청 (최근 7일)
      </h2>
      <div className="mt-3 flex h-24 items-end gap-[3px]">
        {hours.map((n, h) => (
          <div key={h} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t-sm bg-thread/60"
              style={{ height: `${(n / maxHour) * 100}%`, minHeight: n ? 3 : 1 }}
              title={`${h}시 · ${n}명`}
              aria-hidden
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[0.62rem] text-ivory-dim">
        <span>0시</span>
        <span>6시</span>
        <span>12시</span>
        <span>18시</span>
        <span>23시</span>
      </div>

      {/* 최근 결제 */}
      <h2 className="font-display mt-10 text-[1rem] font-semibold">
        최근 결제 5건
      </h2>
      <div className="mt-3 flex flex-col gap-2 text-[0.82rem]">
        {recentPaid.map((r) => (
          <div
            key={r.paid_at}
            className="flex justify-between rounded-lg border border-gold-dim/20 bg-ink-soft/50 px-4 py-2.5"
          >
            <span>{(r.applicant_name ?? "").trim() || "(이름 없음)"}님</span>
            <span className="text-ivory-dim">
              {new Date(r.paid_at!).toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
        {recentPaid.length === 0 && (
          <p className="text-ivory-dim">기간 내 결제가 없습니다.</p>
        )}
      </div>
    </main>
  );
}
