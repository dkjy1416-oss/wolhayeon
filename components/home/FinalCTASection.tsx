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
          className="block aspect-[4/5] w-full object-cover object-top"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
      </div>
      <div className="relative mx-auto -mt-28 max-w-md px-6 pb-24 text-center">
        <Reveal>
          <h2 className="font-display text-[1.45rem] font-semibold leading-[1.75] text-ivory">
            다시 만나고 싶은 마음이
            <br />
            아직 그대로라면,
          </h2>
          <p className="mt-6 text-[0.93rem] font-light leading-[2.05] text-ivory-dim">
            그 마음을 없애지 않아도 돼요.
            <br />
            다만 그 마음을 망치지 않도록
            <br />
            지금 연락할지, 기다릴지,
            <br />
            어떤 순서로 움직일지는
            <br />한 번 제대로 봐야 해요.
          </p>
          <p className="mt-6 text-[0.95rem] font-light leading-[2] text-ivory">
            월화에게
            <br />
            지금 두 사람의 이야기를 들려주세요.
          </p>
        </Reveal>
        <Reveal delay={150}>
          <TrackedCtaLink
            event="home_cta_click"
            placement="final"
            href="/apply"
            className="cta-glow mt-10 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85"
          >
            월화에게 내 이야기 들려주기
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
