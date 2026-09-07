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
            계속 생각나는 데는
            <br />
            이유가 있을 수 있습니다.
          </p>
          <p className="mt-6 text-[1rem] font-light leading-[2.1] text-ivory-dim">
            그 이유가
            <br />
            다시 만나야 한다는 뜻은
            <br />
            아닐 수도 있고요.
          </p>
        </Reveal>
        <Reveal delay={150}>
          <p className="mt-14 text-[1rem] font-light leading-[2.1] text-ivory">
            그래서 월화는
            <br />
            재회를 약속하기보다,
          </p>
          <p className="font-display mt-4 text-[1.2rem] font-semibold leading-[1.95] text-gold">
            지금 두 사람 사이에서
            <br />
            무엇을 봐야 하는지부터
            <br />
            이야기합니다.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
