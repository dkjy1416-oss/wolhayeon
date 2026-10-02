import TrackedCtaLink from "@/components/TrackedCtaLink";
import Reveal from "@/components/home/Reveal";
import LoopVideo from "@/components/book/LoopVideo";

/** SECTION 10 — FINAL CTA (결제 압박 없이 신청 시작 유도) */
export default function FinalCTASection() {
  return (
    <section id="final-cta" className="relative overflow-hidden bg-ink">
      <div className="relative">
        <LoopVideo
          src="/book/v3/w-final.mp4"
          poster="/book/v3/w-final.webp"
          label="월화"
          fit="contain"
          className="block aspect-[3/4] w-full"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
      </div>
      <div className="relative mx-auto -mt-28 max-w-md px-6 pb-24 text-center">
        <Reveal>
          <h2 className="font-display text-[1.45rem] font-semibold leading-[1.7] text-ivory">
            오늘 밤 보내기 전에,
            <br />
            <span className="text-gold">3분만 먼저.</span>
          </h2>
        </Reveal>
        <Reveal delay={150}>
          <TrackedCtaLink
            event="home_cta_click"
            placement="final"
            href="/apply"
            className="cta-glow mt-10 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85"
          >
            무료로 내 관계 먼저 보기
          </TrackedCtaLink>
          <p className="mt-4 text-[0.75rem] font-light text-ivory-dim/80">
            결제 전, 무료 관계 분석 먼저 제공
          </p>
          <a
            href="/book"
            className="mt-5 inline-block text-[0.8rem] text-gold/90 underline decoration-gold/30 underline-offset-[6px]"
          >
            혼자 펼쳐 볼 책이 필요하다면 → 책 자세히 보기
          </a>
        </Reveal>
      </div>
    </section>
  );
}
