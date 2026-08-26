/** 21일 마음 회복 여정 — 7일 단위 섹션 + DAY 카드 전체 렌더 (JS 불필요) */
type Day = { day: number; title: string; action: string; reflection: string };

const WEEKS: Array<{ range: [number, number]; label: string; sub: string }> = [
  { range: [1, 7], label: "DAY 1 – 7", sub: "감정을 바라보는 일주일" },
  { range: [8, 14], label: "DAY 8 – 14", sub: "일상을 회복하는 일주일" },
  { range: [15, 21], label: "DAY 15 – 21", sub: "다른 거리에서 바라보는 일주일" },
];

export default function TwentyOneDayJourney({ days }: { days: Day[] }) {
  return (
    <section id="journey" className="scroll-mt-6 px-5 py-10">
      <div className="mx-auto max-w-[34rem]">
        <p className="text-center text-[0.65rem] tracking-[0.3em] text-gold/70">
          스물하나의 밤
        </p>
        <h2 className="font-display mt-2 text-center text-xl font-semibold text-ivory">
          21일 마음 회복 여정
        </h2>

        {WEEKS.map((week) => (
          <div key={week.label} className="mt-10">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-gold-dim/25" />
              <div className="text-center">
                <p className="text-[0.7rem] font-medium tracking-[0.2em] text-thread/90">
                  {week.label}
                </p>
                <p className="mt-0.5 text-[0.68rem] text-ivory-dim/70">
                  {week.sub}
                </p>
              </div>
              <span className="h-px flex-1 bg-gold-dim/25" />
            </div>

            <div className="mt-5 flex flex-col gap-3.5">
              {days
                .filter((d) => d.day >= week.range[0] && d.day <= week.range[1])
                .map((d) => (
                  <article
                    key={d.day}
                    className="rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4.5 py-5"
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="font-display text-[0.72rem] font-semibold tracking-wider text-thread">
                        DAY {String(d.day).padStart(2, "0")}
                      </span>
                      <h3 className="text-[0.95rem] font-medium text-ivory">
                        {d.title}
                      </h3>
                    </div>
                    <p className="mt-2.5 text-[0.68rem] font-medium text-gold/80">
                      오늘의 행동
                    </p>
                    <p className="mt-1 text-[0.87rem] font-light leading-[1.9] text-ivory">
                      {d.action}
                    </p>
                    <p className="mt-3 text-[0.68rem] font-medium text-gold/80">
                      돌아볼 질문
                    </p>
                    <p className="mt-1 text-[0.87rem] font-light leading-[1.9] text-ivory-dim">
                      {d.reflection}
                    </p>
                  </article>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
