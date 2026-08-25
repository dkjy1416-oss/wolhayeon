import Link from "next/link";
import RitualAccordion from "./RitualAccordion";

export default function RitualDetailSection() {
  return (
    <section id="ritual-detail" className="scroll-mt-14 px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-md">
        <h2 className="font-display text-center text-[1.4rem] font-semibold leading-[1.6] text-ivory sm:text-3xl">
          16,900원에
          <br className="sm:hidden" /> 무엇을 받게 되나요?
        </h2>
        <p className="mt-6 text-center text-[0.92rem] font-light leading-[2] text-ivory-dim">
          이름만 바꾼 같은 내용이 아닙니다.
          <br />
          당신이 들려준 이야기를 바탕으로
          <br />
          월화가 하나씩 준비합니다.
        </p>

        <div className="mt-12">
          <RitualAccordion />
        </div>

        {/* 마무리 강조 */}
        <div className="mt-16 text-center">
          <p className="font-display text-lg font-semibold leading-[1.7] text-ivory">
            누구에게나 같은 리추얼을
            <br className="sm:hidden" /> 보내지 않습니다.
          </p>
          <p className="mt-5 text-[0.92rem] font-light leading-[2] text-ivory-dim">
            당신이 들려준 관계와 사연을 바탕으로
            <br />
            편지, 관계 이야기, 리추얼 문장과 행동 가이드가 달라집니다.
          </p>

          <div aria-hidden className="mx-auto mt-10 h-px w-16 bg-gold-dim/50" />

          <p className="font-display mt-9 text-base font-semibold text-ivory">
            붉은 인연의 실 리추얼
          </p>
          <p className="font-display mt-3 text-3xl font-semibold text-gold">
            16,900<span className="ml-1 text-lg text-ivory-dim">원</span>
          </p>
          <p className="mt-2 text-xs tracking-wide text-ivory-dim">
            1회 결제 · 정기결제 없음
          </p>

          <Link
            href="/apply"
            className="mt-9 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85"
          >
            나의 이야기 들려주기
          </Link>
        </div>
      </div>
    </section>
  );
}
