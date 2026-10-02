/** 관계·감정 읽기 섹션 (PART 02~06) — 문단을 나눠 숨 쉴 틈을 두고, 첫 문단은 크게 */
export default function ReadingSection({
  no,
  title,
  content,
  id,
  highlight = false,
}: {
  no: string;
  title: string;
  content: string;
  id?: string;
  /** 연락 전략처럼 핵심 파트 — 카드로 강조 */
  highlight?: boolean;
}) {
  const paras = content
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const [lead, ...rest] = paras.length ? paras : [content];
  return (
    <section id={id} className="scroll-mt-6 px-5 py-6">
      <div
        className={`mx-auto max-w-[34rem] ${
          highlight ? "rounded-2xl border border-gold/40 bg-gradient-to-b from-[#1d1512] to-ink-soft px-5 py-6" : ""
        }`}
      >
        <p className="text-[0.65rem] tracking-[0.3em] text-gold/75">{no}</p>
        <h2 className="font-display mt-2 text-[1.2rem] font-semibold leading-[1.5] text-ivory">{title}</h2>
        <div className="mt-2 h-px w-10 bg-thread/70" />
        <p className="mt-5 text-[0.98rem] leading-[2] text-ivory">{lead}</p>
        {rest.map((p, i) => (
          <p key={i} className="mt-4 text-[0.92rem] font-light leading-[2.05] text-ivory-dim">
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}
