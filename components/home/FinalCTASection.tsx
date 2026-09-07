import Link from "next/link";
import Reveal from "@/components/home/Reveal";

/** SECTION 10 — FINAL CTA (결제 압박 없이 신청 시작 유도) */
export default function FinalCTASection() {
  return (
    <section id="final-cta" className="bg-ink-soft/40 px-6 py-28">
      <div className="mx-auto max-w-md text-center">
        <Reveal>
          <h2 className="font-display text-[1.5rem] font-semibold leading-[1.7] text-ivory">
            혼자 같은 생각을
            <br />
            계속 반복하고 있다면
          </h2>
          <p className="mt-6 text-[0.95rem] font-light leading-[2.05] text-ivory-dim">
            월화에게
            <br />
            지금의 이야기를 한번 들려주세요.
          </p>
          <p className="mt-4 text-[0.92rem] font-light leading-[2] text-ivory">
            결제하기 전에
            <br />
            월화가 먼저 읽은 마음부터
            <br />
            확인할 수 있습니다.
          </p>
        </Reveal>
        <Reveal delay={150}>
          <Link
            href="/apply"
            className="cta-glow mt-10 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85"
          >
            월화에게 내 이야기 들려주기
          </Link>
          <p className="mt-4 text-[0.75rem] font-light text-ivory-dim/80">
            개인화 미리보기 확인 후
            <br className="sm:hidden" /> 전체 결과를 선택할 수 있어요.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
