/** 05. 나에게 맞는 상황 — 큰 영상 대신 짧은 선택 카드. 고른 값은 신청서 초안에 반영되고 고객이 바꿀 수 있다 (/apply?sit=) */
import TrackedCtaLink from "@/components/TrackedCtaLink";
import { PICKS } from "./content";

export default function SituationPick() {
  return (
    <section className="px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1120px]">
        <p className="text-[0.8rem] tracking-[0.14em] text-gold">지금 내 상황은</p>
        <h2 className="font-display font-bold mt-2 text-[1.55rem] leading-[1.45] text-ivory md:text-[2rem]">가장 가까운 상황에서 시작해 보세요</h2>
        <p className="mt-3 text-[0.96rem] leading-[1.75] text-ivory-dim">고른 상황은 사연 쓰기의 첫 선택으로 들어가고, 쓰는 동안 언제든 바꿀 수 있어요.</p>
        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {PICKS.map((p, i) => (
            <TrackedCtaLink
              key={p.label}
              event="home_cta_click"
              placement={`situation_${i + 1}`}
              href={`/apply?sit=${i + 1}`}
              className="shadow-paper group flex min-h-[7.5rem] flex-col justify-between rounded-2xl border border-gold-dim bg-ink-soft px-5 py-5 transition-colors hover:border-burgundy"
            >
              <span className="font-display text-[1.08rem] leading-[1.5] text-ivory">{p.label}</span>
              <span className="mt-3 flex items-center justify-between text-[0.84rem] text-ivory-dim">
                {p.sub}
                <span aria-hidden className="text-burgundy transition-transform group-hover:translate-x-1">→</span>
              </span>
            </TrackedCtaLink>
          ))}
        </div>
      </div>
    </section>
  );
}
