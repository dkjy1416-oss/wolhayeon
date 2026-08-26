/** 24시간 체크리스트 + 7일 원칙 카드 (PART 11·12) */
export default function GuideSection({
  hours24,
  days7,
}: {
  hours24: string[];
  days7: string[];
}) {
  return (
    <section className="px-5 py-10">
      <div className="mx-auto flex max-w-[34rem] flex-col gap-10">
        <div>
          <p className="text-[0.65rem] tracking-[0.3em] text-gold/70">
            리추얼 이후
          </p>
          <h2 className="font-display mt-2 text-lg font-semibold text-ivory">
            앞으로 24시간
          </h2>
          <ul className="mt-4 flex flex-col gap-2">
            {hours24.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg border border-gold-dim/25 bg-ink-soft px-4 py-3"
              >
                <span
                  aria-hidden
                  className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-[4px] border border-gold/50"
                />
                <span className="text-[0.88rem] font-light leading-[1.9] text-ivory">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-ivory">
            앞으로 7일
          </h2>
          <p className="mt-1 text-[0.72rem] text-ivory-dim/70">
            일주일 동안 지켜볼 나만의 원칙
          </p>
          <ul className="mt-4 flex flex-col gap-2.5">
            {days7.map((item, i) => (
              <li
                key={i}
                className="rounded-xl border border-gold-dim/30 bg-ink-soft px-5 py-4"
              >
                <p className="text-[0.7rem] font-medium text-gold/80">
                  원칙 {i + 1}
                </p>
                <p className="mt-1 text-[0.88rem] font-light leading-[1.9] text-ivory">
                  {item}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
