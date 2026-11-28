/**
 * 11/28 관리자 첫 화면: 기간(오늘/7일/30일) · 매출 요약 · 메타 광고 · 상품 3개 퍼널 · 유입 출처별 결제
 */
import Link from "next/link";
import type { Overview, ProductFunnel } from "@/lib/admin-overview";
import { won } from "@/lib/admin-util";

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 1000) / 10}%` : "-");

function Funnel({ f }: { f: ProductFunnel }) {
  const top = Math.max(1, f.steps[0]?.n ?? 1);
  const rows = [...f.steps, { label: "결제 완료", n: f.paid }];
  return (
    <section className="rounded-2xl border border-gold-dim/25 bg-ink-soft/60 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[1rem] font-semibold">{f.title}</h3>
        <p className="text-[0.95rem] font-semibold tabular-nums text-gold">{won(f.revenue)}</p>
      </div>
      <ol className="mt-3 flex flex-col gap-1.5">
        {rows.map((s, i) => {
          const prev = i > 0 ? rows[i - 1].n : 0;
          const last = i === rows.length - 1;
          return (
            <li key={s.label} className="relative overflow-hidden rounded-lg bg-ink/60 px-3 py-2">
              <span
                aria-hidden
                className={`absolute inset-y-0 left-0 ${last ? "bg-emerald-500/25" : "bg-gold/15"}`}
                style={{ width: `${Math.min(100, (s.n / top) * 100)}%` }}
              />
              <span className="relative flex items-center justify-between gap-2 text-[0.82rem]">
                <span className={last ? "font-semibold text-emerald-300" : ""}>{s.label}</span>
                <span className="flex items-baseline gap-2 tabular-nums">
                  <b>{s.n.toLocaleString()}</b>
                  {i > 0 && <span className="w-12 text-right text-[0.7rem] text-ivory-dim">{pct(s.n, prev)}</span>}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 flex flex-wrap gap-x-3 text-[0.74rem] text-ivory-dim">
        <span>
          결제창에서 취소 <b className="text-thread">{f.cancel}</b>
        </span>
        <span>
          결제 실패 <b className="text-thread">{f.fail}</b>
        </span>
        <span>방문→결제 {pct(f.paid, f.steps[0]?.n ?? 0)}</span>
      </p>
      {f.note && <p className="mt-1 text-[0.7rem] text-ivory-dim/70">{f.note}</p>}
    </section>
  );
}

export default function OverviewBoard({ o }: { o: Overview }) {
  const tabs: Array<[number, string]> = [
    [1, "오늘"],
    [7, "최근 7일"],
    [30, "최근 30일"],
  ];
  return (
    <div className="mt-6">
      <div className="flex gap-1.5">
        {tabs.map(([d, t]) => (
          <Link
            key={d}
            href={`/admin?d=${d}`}
            className={`rounded-full px-4 py-2 text-[0.82rem] ${o.days === d ? "bg-gold text-ink font-semibold" : "border border-gold-dim/30 text-ivory-dim"}`}
          >
            {t}
          </Link>
        ))}
      </div>

      {/* 요약 */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          ["방문자", `${o.total.visitors.toLocaleString()}명`, ""],
          ["결제", `${o.total.paid}건`, `방문 대비 ${pct(o.total.paid, o.total.visitors)}`],
          ["매출", won(o.total.revenue), o.total.paid ? `객단가 ${won(Math.round(o.total.revenue / o.total.paid))}` : ""],
          ["메타 광고 매출", won(o.ad.revenue), `광고 유입 ${o.ad.visitors}명 · 결제 ${o.ad.paid}건`],
        ].map(([l, v, s]) => (
          <div key={l} className="rounded-xl border border-gold-dim/25 bg-ink-soft/70 px-4 py-3">
            <p className="text-[0.7rem] text-ivory-dim">{l}</p>
            <p className="mt-1 text-[1.15rem] font-semibold tabular-nums">{v}</p>
            {s && <p className="mt-0.5 text-[0.68rem] text-ivory-dim/80">{s}</p>}
          </div>
        ))}
      </div>

      {/* 메타 광고 효율 */}
      <section className="mt-4 rounded-2xl border border-[#4f6bed]/40 bg-[#4f6bed]/10 p-4">
        <h2 className="text-[0.95rem] font-semibold">메타 광고 효율</h2>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[0.82rem] sm:grid-cols-4">
          <p>광고로 온 사람 <b className="tabular-nums">{o.ad.visitors}</b>명</p>
          <p>시작까지 <b className="tabular-nums">{o.ad.starts}</b>명 ({pct(o.ad.starts, o.ad.visitors)})</p>
          <p>결제 <b className="tabular-nums">{o.ad.paid}</b>건 ({pct(o.ad.paid, o.ad.visitors)})</p>
          <p>매출 <b className="tabular-nums">{won(o.ad.revenue)}</b></p>
        </div>
        <p className="mt-2 text-[0.72rem] leading-relaxed text-ivory-dim">
          광고 링크에 utm_source=ig 또는 fb, utm_campaign(캠페인), utm_content(광고 이름)를 붙인 유입만 광고로 셉니다. 광고비 대비 효율(ROAS)은 이 매출 ÷ 메타 광고 관리자의 지출 금액으로 보세요.
        </p>
      </section>

      {/* 상품 3개 */}
      <h2 className="font-display mt-7 text-[1rem] font-semibold">상품별 — 어디까지 왔나</h2>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {o.products.map((f) => (
          <Funnel key={f.key} f={f} />
        ))}
      </div>

      {/* 상품별 매출 */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-gold-dim/25 bg-ink-soft/50">
        <table className="w-full min-w-[420px] text-[0.8rem]">
          <thead>
            <tr className="text-left text-[0.7rem] text-ivory-dim">
              <th className="px-4 py-2 font-normal">팔린 상품</th>
              <th className="px-3 py-2 text-right font-normal">건수</th>
              <th className="px-3 py-2 text-right font-normal">매출</th>
            </tr>
          </thead>
          <tbody>
            {o.sales.map((s) => (
              <tr key={s.label} className="border-t border-gold-dim/15">
                <td className="px-4 py-2">{s.label}</td>
                <td className="px-3 py-2 text-right tabular-nums">{s.n}건</td>
                <td className="px-3 py-2 text-right tabular-nums">{won(s.rev)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 유입 출처 */}
      <h2 className="font-display mt-7 text-[1rem] font-semibold">어디서 들어왔나 (결제까지)</h2>
      {/* 11/28: 휴대폰에서 표가 잘려 방문자만 보이던 문제 → 한 줄 카드로 (결제가 있는 출처를 위로) */}
      <div className="mt-3 overflow-hidden rounded-xl border border-gold-dim/25 bg-ink-soft/50">
        {[...o.sources]
          .sort((a, b) => b.revenue - a.revenue || b.paid - a.paid || b.visitors - a.visitors)
          .map((r) => (
            <div key={r.label} className={`border-t border-gold-dim/15 px-4 py-2.5 first:border-0 ${r.ad ? "bg-[#4f6bed]/10" : ""}`}>
              <p className="text-[0.8rem] leading-snug">
                {r.ad && <span className="mr-1.5 rounded bg-[#4f6bed] px-1.5 py-0.5 text-[0.62rem] font-bold text-white">광고</span>}
                <span className="break-all">{r.label}</span>
              </p>
              <p className="mt-1 flex flex-wrap gap-x-3 text-[0.74rem] tabular-nums text-ivory-dim">
                <span>방문 <b className="text-ivory">{r.visitors}</b></span>
                <span>재회 시작 <b className="text-ivory">{r.ritualStart}</b></span>
                <span>카톡 시작 <b className="text-ivory">{r.chatStart}</b></span>
                <span className={r.paid ? "text-[#7fd6a2]" : ""}>
                  결제 <b>{r.paid}</b>
                  {r.paid > 0 && ` · ${won(r.revenue)}`}
                </span>
              </p>
            </div>
          ))}
      </div>
      <p className="mt-2 text-[0.72rem] text-ivory-dim">
        더 자세한 단계별 이탈·나이·상황별 분석은{" "}
        <Link href="/admin/marketing?d=30" className="text-gold underline">
          상세 통계
        </Link>
        에서 볼 수 있어요.
      </p>
    </div>
  );
}
