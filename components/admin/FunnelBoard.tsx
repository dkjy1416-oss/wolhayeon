/**
 * 관리자 대시보드 — 상단 핵심 6개 + 전환 퍼널 + 전환율(전날·7일·30일) (10/9 개발지시서 18·15)
 * 서버 컴포넌트. 숫자는 getMarketingStats(30)의 일별 퍼널을 합산한다 (테스트 주문 제외).
 */
import Link from "next/link";
import type { Funnel, MarketingStats } from "@/lib/marketing-stats";
import { won, kstDate } from "@/lib/admin-util";

function sum(rows: Funnel[]): Funnel {
  const z: Funnel = {
    visitors: 0, applyStart: 0, q1: 0, q2: 0, q3: 0, q4: 0, applied: 0, preview: 0, previewView: 0,
    payClick: 0, payPage: 0, payWindow: 0, paid: 0, payFail: 0, payCancel: 0, revenue: 0,
  };
  for (const r of rows) for (const k of Object.keys(z) as (keyof Funnel)[]) z[k] += r[k] ?? 0;
  return z;
}

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 1000) / 10}%` : "–");

/** 미리보기 열람 기록이 없던 기간에는 '미리보기 생성'으로 대신 센다 */
const viewed = (f: Funnel) => Math.max(f.previewView, 0) || f.preview;

export default function FunnelBoard({ stats }: { stats: MarketingStats }) {
  const days = stats.byDay; // 최신순
  const today = days[0]?.f ?? sum([]);
  const yesterday = days[1]?.f ?? sum([]);
  const w7 = sum(days.slice(0, 7).map((d) => d.f));
  const prev = sum(days.slice(1, 2).map((d) => d.f));
  /* 방문·미리보기 열람 기록이 시작된 날 이후만 (그 전 날짜가 섞이면 전환율이 비정상으로 보임) */
  const trackFrom = stats.trackingSince ? kstDate(stats.trackingSince) : "";
  const w30 = sum(days.slice(0, 30).filter((d) => d.day >= trackFrom).map((d) => d.f));

  const tiles: Array<[string, string, string, boolean?]> = [
    ["오늘 방문자", `${today.visitors}명`, `어제 ${yesterday.visitors}명`],
    ["무료 신청", `${today.applied}명`, `어제 ${yesterday.applied}명`],
    ["미리보기", `${viewed(today)}명`, `어제 ${viewed(yesterday)}명`],
    ["결제 클릭", `${today.payClick}명`, `어제 ${yesterday.payClick}명`],
    ["결제 완료", `${today.paid}건`, `어제 ${yesterday.paid}건`, today.paid > 0],
    ["오늘 매출", won(today.revenue), `어제 ${won(yesterday.revenue)}`, today.revenue > 0],
  ];

  const steps: Array<[string, number]> = [
    ["방문", w7.visitors],
    ["무료 시작", w7.applyStart],
    ["신청 완료", w7.applied],
    ["미리보기", viewed(w7)],
    ["결제 클릭", w7.payClick],
    ["결제창 진입", w7.payWindow],
    ["결제 완료", w7.paid],
  ];
  const top = Math.max(1, ...steps.map((s) => s[1]));

  const rates: Array<[string, (f: Funnel) => string]> = [
    ["방문 → 무료분석 시작", (f) => pct(f.applyStart, f.visitors)],
    ["무료분석 시작 → 신청 완료", (f) => pct(f.applied, f.applyStart)],
    ["신청 완료 → 미리보기 열람", (f) => pct(viewed(f), f.applied)],
    ["미리보기 → 결제 클릭", (f) => pct(f.payClick, viewed(f))],
    ["결제 클릭 → 결제 완료", (f) => pct(f.paid, f.payClick)],
    ["전체 방문 → 결제 완료", (f) => pct(f.paid, f.visitors)],
  ];

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map(([label, value, sub, accent]) => (
          <div key={label} className="rounded-xl border border-gold-dim/25 bg-ink-soft/70 px-4 py-4">
            <p className="text-[0.7rem] text-ivory-dim">{label}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${accent ? "text-gold" : ""}`}>{value}</p>
            <p className="mt-0.5 text-[0.68rem] text-ivory-dim/70">{sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gold-dim/25 bg-ink-soft/50 px-4 py-4">
          <p className="text-[0.85rem] font-semibold">전환 퍼널 · 최근 7일</p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {steps.map(([label, n], i) => (
              <li key={label} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 text-[0.78rem]">
                <span className="text-ivory-dim">{label}</span>
                <span className="h-3 overflow-hidden rounded-full bg-ink">
                  <span
                    className={`block h-full rounded-full ${i === steps.length - 1 ? "bg-gold" : "bg-burgundy"}`}
                    style={{ width: `${Math.max(2, (n / top) * 100)}%` }}
                  />
                </span>
                <span className="w-24 text-right tabular-nums">
                  {n}
                  {i > 0 && <span className="ml-1 text-[0.68rem] text-ivory-dim">({pct(n, steps[i - 1][1])})</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[0.7rem] text-ivory-dim">
            날짜별 합계(결제는 결제한 날 기준) · 결제 실패 {w7.payFail}건 · 결제창에서 취소 {w7.payCancel}건 ·{" "}
            <Link href="/admin/stats" className="underline">자세히</Link>
          </p>
        </section>

        <section className="overflow-x-auto rounded-xl border border-gold-dim/25 bg-ink-soft/50 px-4 py-4">
          <p className="text-[0.85rem] font-semibold">전환율</p>
          <table className="mt-3 w-full min-w-[22rem] text-[0.78rem] tabular-nums">
            <thead>
              <tr className="text-ivory-dim">
                <th className="py-1 text-left font-normal">구간</th>
                <th className="py-1 text-right font-normal">전날</th>
                <th className="py-1 text-right font-normal">최근 7일</th>
                <th className="py-1 text-right font-normal">최근 30일</th>
              </tr>
            </thead>
            <tbody>
              {rates.map(([label, f]) => (
                <tr key={label} className="border-t border-gold-dim/10">
                  <td className="py-1.5">{label}</td>
                  <td className="py-1.5 text-right">{f(prev)}</td>
                  <td className="py-1.5 text-right">{f(w7)}</td>
                  <td className="py-1.5 text-right">{f(w30)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[0.68rem] text-ivory-dim/70">
            테스트 주문·책 쿠폰 자동 주문 제외 · 30일은 방문 기록이 시작된 {trackFrom.slice(5).replace("-", "/")}부터
          </p>
        </section>
      </div>
    </>
  );
}
