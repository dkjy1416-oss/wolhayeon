import Link from "next/link";

export default function PricingSection() {
  return (
    <section id="pricing" className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-gold-dim/30 bg-gradient-to-b from-ink-soft to-ink px-8 py-12 text-center">
          <h2 className="font-display text-xl font-semibold text-ivory">
            붉은 인연의 실 리추얼
          </h2>

          <p className="font-display mt-8 text-4xl font-semibold text-gold">
            16,900
            <span className="ml-1 text-xl text-ivory-dim">원</span>
          </p>
          <p className="mt-3 text-xs tracking-wide text-ivory-dim">
            1회 결제 · 정기결제 없음
          </p>

          <div aria-hidden className="mx-auto mt-8 h-px w-16 bg-gold-dim/50" />

          <p className="mt-8 text-[0.95rem] text-ivory">
            월화가 준비하는 9가지 이야기
            <span className="text-gold"> + BONUS</span>
          </p>
          <p className="mt-3 text-[0.82rem] font-light leading-relaxed text-ivory-dim">
            개인 편지 · 관계 이야기 · 마음 들여다보기
            <br />· 개인 리추얼 · 21일 플랜 외
          </p>

          <a
            href="#ritual-detail"
            className="mt-5 inline-block text-xs text-gold/90 underline underline-offset-4 transition-colors hover:text-gold"
          >
            받게 되는 내용 자세히 보기
          </a>

          <Link
            href="/apply"
            className="mt-9 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85"
          >
            나의 리추얼 신청하기
          </Link>
        </div>
      </div>
    </section>
  );
}
