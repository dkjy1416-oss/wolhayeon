import Link from "next/link";

const included = [
  "개인 리추얼",
  "진행 방법",
  "개인화 리추얼 문구",
  "마음 정리 가이드",
];

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

          <ul className="mt-8 flex flex-col gap-3">
            {included.map((item) => (
              <li key={item} className="text-sm text-ivory-dim">
                {item}
              </li>
            ))}
          </ul>

          <Link
            href="/apply"
            className="mt-10 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85"
          >
            나의 리추얼 신청하기
          </Link>
        </div>
      </div>
    </section>
  );
}
