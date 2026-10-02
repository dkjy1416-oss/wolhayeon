import Reveal from "@/components/home/Reveal";
import type { PublicReview } from "@/lib/reviews";

/** 실제 구매자가 공개 동의하고 관리자가 승인한 후기만. 없으면 섹션 자체를 숨김. */
export default function RealReviewsSection({ reviews }: { reviews: PublicReview[] }) {
  if (!reviews.length) return null;
  return (
    <section className="py-16">
      <Reveal>
        <p className="px-6 text-center text-[0.7rem] tracking-[0.3em] text-gold/80">먼저 받아본 분들의 이야기</p>
        <p className="mt-2 px-6 text-center text-[0.72rem] text-ivory-dim/70">
          결제하신 분만 남길 수 있는 후기예요 · 공개에 동의한 글만 그대로 실어요
        </p>
      </Reveal>
      <div className="scrollbar-none mt-7 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-3">
        {reviews.map((r) => (
          <figure key={r.id} className="w-[84%] shrink-0 snap-center rounded-2xl border border-gold-dim/25 bg-ink-soft/70 px-5 py-5">
            <span aria-label={`별점 ${r.rating}점`} className="text-[0.8rem] tracking-[0.1em] text-gold">
              {"★".repeat(r.rating)}
              <span className="text-ivory-dim/25">{"★".repeat(5 - r.rating)}</span>
            </span>
            <blockquote className="mt-2 whitespace-pre-wrap text-[0.88rem] font-light leading-[1.9] text-ivory">{r.body}</blockquote>
            <figcaption className="mt-3 text-[0.72rem] text-ivory-dim">
              {r.name} · {r.product} 구매 · {r.month}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
