/** 붉은 실 리추얼 영역 (PART 07~10) — 분위기 전환 + 특별 연출 */
export default function RitualSection({
  ritual,
  items,
  steps,
  lines,
}: {
  ritual: { title: string; meaning: string };
  items: string[];
  steps: string[];
  lines: string[];
}) {
  return (
    <section id="ritual" className="mt-10 scroll-mt-6 border-y border-thread/25 bg-gradient-to-b from-ink via-[#120a0c] to-ink px-5 py-14">
      <div className="mx-auto max-w-[34rem]">
        {/* PART 07 — 리추얼 이름과 의미 */}
        <div className="text-center">
          <div className="mx-auto mb-8 h-10 w-px bg-gradient-to-b from-transparent via-thread/70 to-thread/30" />
          <p className="text-[0.65rem] tracking-[0.35em] text-thread/90">
            나만을 위한 붉은 실 리추얼
          </p>
          <h2 className="font-display mt-5 text-2xl font-semibold tracking-wide text-ivory">
            {ritual.title}
          </h2>
          <div className="mx-auto mt-6 flex items-center justify-center gap-2">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-thread/60" />
            <span className="h-1.5 w-1.5 rotate-45 border border-thread/70" />
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-thread/60" />
          </div>
          <p className="mt-7 whitespace-pre-wrap text-[0.92rem] font-light leading-[2.05] text-ivory-dim">
            {ritual.meaning}
          </p>
        </div>

        {/* PART 08 — 준비물 */}
        <div className="mt-14">
          <h3 className="text-center text-sm font-medium tracking-wide text-gold">
            준비물
          </h3>
          <ul className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-2.5">
            {items.map((item, i) => (
              <li
                key={i}
                className="rounded-xl border border-gold-dim/30 bg-ink-soft px-4 py-3.5 text-center text-[0.85rem] leading-relaxed text-ivory"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* PART 09 — 리추얼 순서 (세로 타임라인) */}
        <div className="mt-14">
          <h3 className="text-center text-sm font-medium tracking-wide text-gold">
            리추얼 순서
          </h3>
          <ol className="mt-6 flex flex-col">
            {steps.map((step, i) => (
              <li key={i} className="relative flex gap-4 pb-7 last:pb-0">
                {i < steps.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute left-[0.95rem] top-8 h-[calc(100%-1.6rem)] w-px bg-thread/30"
                  />
                )}
                <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-thread/60 bg-ink text-[0.62rem] font-medium text-thread">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="pt-1 text-[0.9rem] font-light leading-[1.95] text-ivory">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </div>

        {/* PART 10 — 개인 문장 */}
        <div className="mt-14">
          <h3 className="text-center text-sm font-medium tracking-wide text-gold">
            나만의 리추얼 문장
          </h3>
          <p className="mt-2 text-center text-[0.72rem] text-ivory-dim/70">
            리추얼 중, 한 문장씩 소리 내어 천천히 읽어주세요.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {lines.map((line, i) => (
              <blockquote
                key={i}
                className="rounded-xl border border-gold/20 bg-ink-soft/70 px-6 py-5 text-center"
              >
                <p className="font-display text-[0.95rem] leading-[1.9] text-ivory">
                  “{line}”
                </p>
              </blockquote>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
