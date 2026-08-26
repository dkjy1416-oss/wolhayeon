/** 관계·감정 읽기 섹션 (PART 02~06) — 차분한 리딩 카드 */
export default function ReadingSection({
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
    <section id={id} className="scroll-mt-6 px-5 py-5">
      <div className="mx-auto max-w-[34rem]">
        <p className="text-[0.65rem] tracking-[0.3em] text-gold/70">{no}</p>
        <h2 className="font-display mt-2 text-lg font-semibold text-ivory">
          {title}
        </h2>
        <p className="mt-4 whitespace-pre-wrap border-l border-gold-dim/30 pl-5 text-[0.92rem] font-light leading-[2.05] text-ivory-dim">
          {content}
        </p>
      </div>
    </section>
  );
}
