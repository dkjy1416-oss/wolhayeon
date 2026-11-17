import RollingCount from "./RollingCount";
import type { SiteTotals } from "@/lib/site-totals";

/**
 * 11/17 운영자 요청 — "지금까지 이만큼 찾아왔다" 누적 숫자를 크게, 숫자가 촤라락.
 * 숫자는 lib/site-totals 의 실제 집계 그대로 (테스트 주문 제외). 집계 기준은 아래 작은 글씨로 밝힌다.
 * 너무 작은 숫자는 오히려 역효과라 100 미만 항목은 숨긴다.
 */

function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 40 96"
      aria-hidden
      className={`h-[4.6rem] w-auto shrink-0 text-[#d4b46a] ${flip ? "-scale-x-100" : ""}`}
      fill="currentColor"
    >
      <path d="M26 92c-9-12-14-27-13-44 1-14 6-27 14-38" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      {[
        [27, 12, -35],
        [22, 22, -25],
        [18, 33, -15],
        [16, 45, -5],
        [16, 57, 5],
        [18, 69, 15],
        [22, 80, 28],
      ].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <ellipse cx="-6" cy="0" rx="6.2" ry="2.8" />
          <ellipse cx="6" cy="-1" rx="6.2" ry="2.8" transform="rotate(-40 6 -1)" />
        </g>
      ))}
    </svg>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <Laurel />
      <div className="min-w-0 text-center">
        <p className="text-[0.86rem] text-ivory-dim">{label}</p>
        <p className="mt-1 font-sans text-[2.15rem] font-extrabold leading-none tracking-[-0.02em] text-ivory">
          <RollingCount value={value} />
          <span className="ml-0.5 text-[1.7rem]">{suffix}</span>
        </p>
      </div>
      <Laurel flip />
    </div>
  );
}

function ymd(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
}

export default function Totals({ totals }: { totals: SiteTotals }) {
  const rows = [
    { label: "사연을 들려준 분", value: totals.stories, suffix: "명" },
    { label: "무료 미리보기를 받아 본 분", value: totals.previews, suffix: "명" },
    { label: "누적 페이지 방문", value: totals.views, suffix: "회" },
  ].filter((r) => r.value >= 100);
  if (rows.length === 0) return null;
  return (
    <section className="relative px-6 py-14" aria-label="지금까지 월하연을 찾은 분들">
      <div className="mx-auto max-w-[480px] rounded-[1.8rem] border border-white/10 bg-[#0d0b0c] px-5 pb-7 pt-9">
        <p className="text-center font-display text-[1.45rem] font-bold leading-[1.45] text-ivory">
          이미 많은 분이
          <br />
          월화를 찾아왔어요
        </p>
        <div className="mt-8 space-y-8">
          {rows.map((r) => (
            <Stat key={r.label} {...r} />
          ))}
        </div>
        <p className="mt-8 break-keep text-center text-[0.72rem] leading-[1.7] text-ivory-dim/70">
          월하연 내부 집계 · 운영자 테스트 주문 제외 · {ymd(totals.at)} 기준. 페이지 방문은 같은 분이 여러 번 들어온 것도 포함한
          조회 수예요.
        </p>
      </div>
    </section>
  );
}
