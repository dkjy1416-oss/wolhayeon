import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getMarketingStats, type Funnel } from "@/lib/marketing-stats";

export const dynamic = "force-dynamic";

/**
 * /admin/marketing — 마케팅 한눈에 보기
 * 방문 → 신청 → 미리보기 → 결제, 성별·나이대·찾아온 이유별 전환, 유입 경로, 이탈 이유
 */

const PERIODS: [number, string][] = [
  [1, "오늘"],
  [7, "7일"],
  [14, "14일"],
  [30, "30일"],
];

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 1000) / 10}%` : "—");

function FunnelBars({ f }: { f: Funnel }) {
  const steps: [string, number][] = [
    ["방문자", f.visitors],
    ["신청 시작", f.applyStart],
    ["신청 완료", f.applied],
    ["미리보기 도달", f.preview],
    ["결제 버튼 클릭", f.payClick],
    ["결제 완료", f.paid],
  ];
  const max = Math.max(1, ...steps.map(([, n]) => n));
  return (
    <div className="space-y-2">
      {steps.map(([label, n], i) => (
        <div key={label} className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-3 text-[0.8rem]">
          <span className="text-ivory-dim">{label}</span>
          <div className="h-5 overflow-hidden rounded bg-ink">
            <div
              className={`h-full rounded ${i === steps.length - 1 ? "bg-gold/80" : "bg-gold/35"}`}
              style={{ width: `${(n / max) * 100}%` }}
            />
          </div>
          <span className="text-right tabular-nums">
            <b>{n}</b>
            {i > 0 && <span className="ml-1 text-[0.68rem] text-ivory-dim">{pct(n, steps[i - 1][1])}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function AdminMarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const { d } = await searchParams;
  const days = PERIODS.some(([n]) => String(n) === d) ? Number(d) : 7;
  const s = await getMarketingStats(days);
  const t = s.today;

  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-5xl px-5 pb-24 pt-8 text-ivory">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-xl font-semibold">마케팅 한눈에 보기</h1>
        <div className="flex gap-1">
          {PERIODS.map(([n, label]) => (
            <Link
              key={n}
              href={`/admin/marketing?d=${n}`}
              className={`rounded-full px-3 py-1 text-[0.78rem] ${
                n === days ? "bg-gold/15 text-gold" : "text-ivory-dim hover:text-ivory"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[0.74rem] text-ivory-dim">
        운영자 테스트 제외 · 방문자 기록은{" "}
        {s.trackingSince
          ? new Date(s.trackingSince).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })
          : "오늘"}
        부터 쌓여요 (그 전 기간은 방문·신청 시작이 0으로 보일 수 있어요)
      </p>

      {/* 오늘 */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["오늘 방문자", `${t.visitors}명`],
          ["오늘 신청", `${t.applied}명`],
          ["오늘 미리보기", `${t.preview}명`],
          ["오늘 결제", `${t.paid}건`],
          ["오늘 매출", `${t.revenue.toLocaleString()}원`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-gold-dim/25 bg-ink-soft/70 px-4 py-3.5">
            <p className="text-[0.7rem] text-ivory-dim">{label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      {/* 인사이트 */}
      {s.insights.length > 0 && (
        <section className="mt-6 rounded-xl border border-gold/30 bg-gold/5 px-5 py-4">
          <p className="text-xs tracking-wide text-gold">지금 데이터가 말해주는 것</p>
          <ul className="mt-2 space-y-1.5 text-[0.85rem] leading-relaxed">
            {s.insights.map((x) => (
              <li key={x}>· {x}</li>
            ))}
          </ul>
          <Link href="/admin/promo" className="mt-3 inline-block text-[0.78rem] text-gold underline underline-offset-4">
            이걸 바탕으로 한 홍보 제안 보기 →
          </Link>
        </section>
      )}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {/* 퍼널 */}
        <section className="min-w-0 rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
          <p className="text-sm font-semibold">
            {days === 1 ? "오늘" : `최근 ${days}일`} 전환 흐름
          </p>
          <div className="mt-3">
            <FunnelBars f={s.total} />
          </div>
          <p className="mt-3 text-[0.78rem] text-ivory-dim">
            매출 <b className="text-ivory">{s.total.revenue.toLocaleString()}원</b> · 신청→결제{" "}
            <b className="text-ivory">{pct(s.total.paid, s.total.applied)}</b>
          </p>
        </section>

        {/* 이탈 */}
        <section className="min-w-0 rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
          <p className="text-sm font-semibold">어디서, 왜 빠지나</p>
          <div className="mt-3 space-y-1.5 text-[0.8rem]">
            {s.dropoff.map((x) => (
              <div key={x.stage} className="flex justify-between gap-3">
                <span className="text-ivory-dim">{x.stage}</span>
                <span className="tabular-nums">
                  {x.lost}명 이탈 <span className={x.rate >= 60 ? "text-thread" : "text-ivory-dim"}>({x.rate}%)</span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[0.72rem] tracking-wide text-gold/80">결제 실패 이유</p>
          {s.payFails.length === 0 ? (
            <p className="mt-1 text-[0.78rem] text-ivory-dim">기간 내 결제 실패 기록 없음</p>
          ) : (
            <div className="mt-1 space-y-1 text-[0.78rem]">
              {s.payFails.map((f) => (
                <div key={f.label} className="flex justify-between gap-3">
                  <span className="min-w-0 break-all text-ivory-dim">{f.label}</span>
                  <span className="tabular-nums">{f.count}건</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 세그먼트 */}
      <section className="mt-6">
        <p className="text-sm font-semibold">누가, 왜 오고, 누가 결제하나</p>
        <p className="mt-1 text-[0.74rem] text-ivory-dim">신청 수 · 미리보기 · 결제 · 결제율(결제/신청)</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {s.segments.map((g) => (
            <div key={g.key} className="min-w-0 rounded-xl border border-gold-dim/20 bg-ink-soft px-4 py-3">
              <p className="text-[0.8rem] text-gold/90">{g.title}</p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-[0.78rem]">
                  <thead>
                    <tr className="text-[0.68rem] text-ivory-dim">
                      <th className="py-1 text-left font-normal">구분</th>
                      <th className="py-1 text-right font-normal">신청</th>
                      <th className="py-1 text-right font-normal">미리보기</th>
                      <th className="py-1 text-right font-normal">결제</th>
                      <th className="py-1 text-right font-normal">결제율</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {g.rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-2 text-ivory-dim">기간 내 신청 없음</td>
                      </tr>
                    )}
                    {g.rows.slice(0, 10).map((r) => (
                      <tr key={r.label} className="border-t border-gold-dim/10">
                        <td className="py-1.5 pr-2">{r.label}</td>
                        <td className="py-1.5 text-right">{r.applied}</td>
                        <td className="py-1.5 text-right">{r.preview}</td>
                        <td className="py-1.5 text-right">{r.paid}</td>
                        <td className={`py-1.5 text-right ${r.paid > 0 ? "text-gold" : "text-ivory-dim"}`}>{r.conv}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 유입 경로 */}
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {[
          ["어디서 들어왔나 (첫 유입)", s.sources],
          ["기기", s.devices],
        ].map(([title, rows]) => (
          <section key={title as string} className="min-w-0 rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
            <p className="text-sm font-semibold">{title as string}</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-[0.78rem]">
                <thead>
                  <tr className="text-[0.68rem] text-ivory-dim">
                    <th className="py-1 text-left font-normal">경로</th>
                    <th className="py-1 text-right font-normal">방문자</th>
                    <th className="py-1 text-right font-normal">신청</th>
                    <th className="py-1 text-right font-normal">결제</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {(rows as typeof s.sources).length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-2 text-ivory-dim">아직 기록 없음</td>
                    </tr>
                  )}
                  {(rows as typeof s.sources).slice(0, 12).map((r) => (
                    <tr key={r.label} className="border-t border-gold-dim/10">
                      <td className="max-w-[14rem] break-all py-1.5 pr-2">{r.label}</td>
                      <td className="py-1.5 text-right">{r.visitors}</td>
                      <td className="py-1.5 text-right">{r.applied}</td>
                      <td className="py-1.5 text-right">{r.paid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      {/* 일별 */}
      <section className="mt-6 rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
        <p className="text-sm font-semibold">날짜별</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-[0.78rem]">
            <thead>
              <tr className="text-[0.68rem] text-ivory-dim">
                {["날짜", "방문자", "신청 시작", "신청", "미리보기", "결제 버튼", "결제", "매출"].map((h, i) => (
                  <th key={h} className={`py-1 font-normal ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {s.byDay.map(({ day, f }) => (
                <tr key={day} className="border-t border-gold-dim/10">
                  <td className="py-1.5">{day.slice(5).replace("-", ".")}</td>
                  <td className="py-1.5 text-right">{f.visitors}</td>
                  <td className="py-1.5 text-right">{f.applyStart}</td>
                  <td className="py-1.5 text-right">{f.applied}</td>
                  <td className="py-1.5 text-right">{f.preview}</td>
                  <td className="py-1.5 text-right">{f.payClick}</td>
                  <td className="py-1.5 text-right text-gold">{f.paid}</td>
                  <td className="py-1.5 text-right">{f.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 시간대 */}
      <section className="mt-6 rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
        <p className="text-sm font-semibold">시간대별 신청</p>
        <div className="mt-3 flex h-24 items-end gap-[3px]">
          {s.hours.map((n, h) => {
            const max = Math.max(1, ...s.hours);
            return (
              <div key={h} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t bg-gold/50" style={{ height: `${(n / max) * 80}px` }} title={`${h}시 ${n}명`} />
                <span className="text-[0.55rem] text-ivory-dim">{h % 3 === 0 ? h : ""}</span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
