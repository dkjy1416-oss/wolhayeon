/** 월화의 실전 노트 — 순간별 대처 · 지켜볼 신호 · 흔들리는 밤 카드 */
type Scene = { when: string; do_this: string; avoid: string; why: string };

export default function PlaybookSection({
  title,
  intro,
  scenes,
  good,
  caution,
  sos,
}: {
  title: string;
  intro: string;
  scenes: Scene[];
  good: string[];
  caution: string[];
  sos: string[];
}) {
  return (
    <section id="playbook" className="scroll-mt-6 px-5 py-10">
      <div className="mx-auto max-w-[34rem]">
        <p className="text-center text-[0.66rem] tracking-[0.3em] text-thread">월화의 실전 노트</p>
        <h2 className="font-display mt-2 text-center text-[1.35rem] leading-[1.5] text-ivory">{title}</h2>
        <p className="mx-auto mt-3 max-w-sm text-center text-[0.84rem] font-light leading-[1.9] text-ivory-dim">{intro}</p>

        <ol className="mt-7 space-y-3">
          {scenes.map((s, i) => (
            <li key={i} className="overflow-hidden rounded-2xl border border-gold-dim/25 bg-ink-soft/70">
              <div className="flex items-center gap-3 border-b border-gold-dim/15 px-4 py-3">
                <span className="font-display flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-burgundy/60 text-[0.78rem] text-ivory">
                  {i + 1}
                </span>
                <p className="text-[0.95rem] text-ivory">{s.when}</p>
              </div>
              <div className="space-y-2.5 px-4 py-3.5 text-[0.84rem] leading-[1.85]">
                <p>
                  <span className="mr-1.5 rounded bg-gold/15 px-1.5 py-0.5 text-[0.68rem] text-gold">이렇게</span>
                  <span className="text-ivory">{s.do_this}</span>
                </p>
                <p>
                  <span className="mr-1.5 rounded bg-thread/15 px-1.5 py-0.5 text-[0.68rem] text-thread">피해요</span>
                  <span className="font-light text-ivory-dim">{s.avoid}</span>
                </p>
                <p className="border-t border-gold-dim/10 pt-2.5 text-[0.78rem] font-light text-ivory-dim/85">{s.why}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-gold/30 bg-gold/5 px-4 py-4">
            <p className="text-[0.7rem] tracking-[0.2em] text-gold">열리고 있다는 신호</p>
            <ul className="mt-2.5 space-y-2 text-[0.82rem] font-light leading-[1.8] text-ivory-dim">
              {good.map((g) => (
                <li key={g} className="flex gap-2">
                  <span className="text-gold">○</span>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-thread/30 bg-thread/5 px-4 py-4">
            <p className="text-[0.7rem] tracking-[0.2em] text-thread">조금 더 기다릴 신호</p>
            <ul className="mt-2.5 space-y-2 text-[0.82rem] font-light leading-[1.8] text-ivory-dim">
              {caution.map((g) => (
                <li key={g} className="flex gap-2">
                  <span className="text-thread">△</span>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10">
          <p className="text-center text-[0.7rem] tracking-[0.25em] text-gold/80">흔들리는 밤, 꺼내 읽는 카드</p>
          <p className="mt-1 text-center text-[0.72rem] text-ivory-dim/70">옆으로 넘겨 보세요 · 캡처해 두면 좋아요</p>
          <div className="-mx-5 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
            {sos.map((line, i) => (
              <figure
                key={i}
                className="relative flex aspect-[3/4] w-[68%] shrink-0 snap-center flex-col justify-between overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-b from-[#2a1416] to-ink px-5 py-6"
              >
                <span aria-hidden className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-gold/10 blur-2xl" />
                <p className="text-[0.62rem] tracking-[0.3em] text-gold/70">月下緣 · {String(i + 1).padStart(2, "0")}</p>
                <blockquote className="font-display text-[1.12rem] leading-[1.7] text-ivory">{line}</blockquote>
                <span aria-hidden className="block h-px w-10 bg-thread/70" />
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
