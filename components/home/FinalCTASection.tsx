import Link from "next/link";
import Reveal from "@/components/home/Reveal";

/** SECTION 10 — FINAL CTA (결제 압박 없이 신청 시작 유도) */
export default function FinalCTASection() {
  return (
    <section id="final-cta" className="bg-ink-soft/40 px-6 py-28">
      <div className="mx-auto max-w-md text-center">
        <Reveal>
          <h2 className="font-display text-[1.45rem] font-semibold leading-[1.75] text-ivory">
            다시 만나고 싶은 마음이
            <br />
            아직 남아 있다면,
          </h2>
          <p className="mt-6 text-[0.93rem] font-light leading-[2.05] text-ivory-dim">
            그 마음을 없애려고 하기 전에
            <br />왜 이렇게 남아 있는지부터
            <br />한 번 제대로 봐도 됩니다.
          </p>
          <p className="mt-6 text-[0.95rem] font-light leading-[2] text-ivory">
            월화에게
            <br />
            지금 두 사람의 이야기를 들려주세요.
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
            결제 전 개인화 미리보기 제공
          </p>
        </Reveal>
      </div>
    </section>
  );
}
