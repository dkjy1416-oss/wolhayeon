/** BONUS · 월화의 마음 기록장 — 읽고 개인적으로 기록하는 형태 (저장 기능 없음) */
export default function JournalSection({
  title,
  intro,
  questions,
}: {
  title: string;
  intro: string;
  questions: string[];
}) {
  return (
    <section id="journal" className="scroll-mt-6 px-5 py-12">
      <div className="mx-auto max-w-[34rem] rounded-2xl border border-gold/25 bg-ink-soft px-7 py-9">
        <p className="text-center text-[0.65rem] tracking-[0.35em] text-gold/80">
          BONUS
        </p>
        <h2 className="font-display mt-3 text-center text-xl font-semibold text-ivory">
          {title}
        </h2>
        <p className="mt-5 whitespace-pre-wrap text-center text-[0.88rem] font-light leading-[2] text-ivory-dim">
          {intro}
        </p>
        <div className="mt-8 flex flex-col gap-7">
          {questions.map((q, i) => (
            <div key={i}>
              <p className="text-[0.9rem] font-light leading-[1.9] text-ivory">
                <span className="mr-2 text-gold/80">{String(i + 1).padStart(2, "0")}</span>
                {q}
              </p>
              <div aria-hidden className="mt-4 space-y-4">
                <div className="h-px w-full bg-gold-dim/25" />
                <div className="h-px w-full bg-gold-dim/25" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
