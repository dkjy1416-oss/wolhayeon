/** 주별 대화 온도 선 그래프 (나 / 상대) — SVG, 외부 라이브러리 없음 */
export default function TempChart({
  weeks,
  meLabel = "나",
  partnerLabel = "그 사람",
  example = false,
}: {
  weeks: { label: string; me: number; partner: number }[];
  meLabel?: string;
  partnerLabel?: string;
  example?: boolean;
}) {
  const W = 320;
  const H = 150;
  const pad = { l: 26, r: 30, t: 14, b: 24 };
  const n = Math.max(2, weeks.length);
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / (n - 1);
  const y = (v: number) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
  const line = (k: "me" | "partner") => weeks.map((w, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(w[k]).toFixed(1)}`).join(" ");
  const last = weeks[weeks.length - 1];
  const step = Math.ceil(weeks.length / 5);
  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="주별 대화 온도">
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity={0.12} />
            <text x={pad.l - 6} y={y(v) + 3} fontSize="9" textAnchor="end" fill="currentColor" fillOpacity={0.5}>
              {v}
            </text>
          </g>
        ))}
        {weeks.map((w, i) =>
          i % step === 0 || i === weeks.length - 1 ? (
            <text key={w.label} x={x(i)} y={H - 6} fontSize="9" textAnchor="middle" fill="currentColor" fillOpacity={0.55}>
              {w.label}
            </text>
          ) : null
        )}
        <path d={line("me")} fill="none" stroke="#e8b04a" strokeWidth={2.2} strokeLinejoin="round" />
        <path d={line("partner")} fill="none" stroke="#e46b8a" strokeWidth={2.2} strokeLinejoin="round" />
        {last && (
          <>
            <circle cx={x(weeks.length - 1)} cy={y(last.me)} r={3.2} fill="#e8b04a" />
            <circle cx={x(weeks.length - 1)} cy={y(last.partner)} r={3.2} fill="#e46b8a" />
            <text x={x(weeks.length - 1) + 6} y={y(last.me) + 3} fontSize="10" fill="#e8b04a" fontWeight={700}>{last.me}</text>
            <text x={x(weeks.length - 1) + 6} y={y(last.partner) + 3} fontSize="10" fill="#e46b8a" fontWeight={700}>{last.partner}</text>
          </>
        )}
      </svg>
      <figcaption className="mt-1 flex items-center gap-4 text-[0.72rem] opacity-80">
        <span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-4 bg-[#e8b04a]" />{meLabel}</span>
        <span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-4 bg-[#e46b8a]" />{partnerLabel}</span>
        {example && <span className="ml-auto opacity-70">예시 차트</span>}
      </figcaption>
    </figure>
  );
}
