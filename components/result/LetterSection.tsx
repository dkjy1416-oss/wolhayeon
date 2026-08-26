/** 편지형 특별 카드 (PART 01 · 14) */
export default function LetterSection({
  no,
  title,
  content,
  id,
}: {
  no: string;
  title: string;
  content: string;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-6 px-5 py-8">
      <div className="mx-auto max-w-[34rem] rounded-2xl border border-gold/25 bg-ink-soft px-7 py-9 shadow-[0_0_40px_rgba(201,169,106,0.06)]">
        <p className="text-center text-[0.65rem] tracking-[0.3em] text-gold/80">
          {no}
        </p>
        <h2 className="font-display mt-3 text-center text-xl font-semibold leading-snug text-ivory">
          {title}
        </h2>
        <div className="mx-auto mt-6 h-px w-10 bg-gold/40" />
        <p className="mt-7 whitespace-pre-wrap text-[0.95rem] font-light leading-[2.1] text-ivory">
          {content}
        </p>
        <p className="mt-8 text-right text-[0.8rem] text-gold/80">— 월화 月華</p>
      </div>
    </section>
  );
}
