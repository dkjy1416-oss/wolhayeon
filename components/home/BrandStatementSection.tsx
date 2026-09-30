import Reveal from "@/components/home/Reveal";
import HomeImage from "@/components/home/HomeImage";

/** SECTION 09 — 브랜드 신뢰 문장 (큰 여백의 어두운 섹션) */
export default function BrandStatementSection({
  bgLetter,
}: {
  bgLetter: string | null;
}) {
  return (
    <section className="relative overflow-hidden px-6 py-28">
      {bgLetter && (
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
          <HomeImage src={bgLetter} alt="" aspect="h-full" sizes="520px" />
        </div>
      )}
      <div className="relative mx-auto max-w-xl">
        <Reveal>
          <p className="font-display text-[1.35rem] font-semibold leading-[1.95] text-ivory md:text-[1.7rem]">
            너무 힘든 거,
            <br />
            알고 있어요.
          </p>
          <p className="mt-6 text-[1rem] font-light leading-[2.1] text-ivory-dim">
            그래서 그 마음을
            <br />
            함부로 내려놓으라고
            <br />
            하지 않을게요.
          </p>
        </Reveal>
        <Reveal delay={150}>
          <p className="mt-14 text-[1rem] font-light leading-[2.1] text-ivory">
            재회를 약속할 수는 없지만,
            <br />
            재회를 원한다면
          </p>
          <p className="font-display mt-4 text-[1.2rem] font-semibold leading-[1.95] text-gold">
            지금 할 수 있는 것부터
            <br />
            월화와 같이 봐요.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
