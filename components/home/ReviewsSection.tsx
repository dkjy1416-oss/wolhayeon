import Reveal from "@/components/home/Reveal";
import { HOME_REVIEWS } from "@/components/home/reviews-data";

/**
 * SECTION 05 — 리뷰 ("저만 이런 줄 알았어요.")
 * 실제 동의받은 후기만 reviews-data.ts에 추가한다.
 * 데이터가 없으면 "후기 준비 중" 안내만 표시 (가짜 후기·별점·통계 금지).
 */
export default function ReviewsSection() {
  /* 실제 후기가 아직 없으면 섹션 자체를 렌더하지 않음 (가짜 후기·빈 카드 금지).
     reviews-data.ts에 실제 데이터를 추가하면 코드 수정 없이 자동 노출. */
  if (HOME_REVIEWS.length === 0) return null;
  return (
    <section className="bg-ink-soft/40 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="font-display text-center text-[1.5rem] font-semibold leading-snug text-ivory">
            월하연을 지나
            <br />
            다시 이어진 이야기
          </h2>
          <p className="mt-4 text-center text-[0.88rem] font-light leading-[1.9] text-ivory-dim">
            비슷한 마음을 지나온 사람들이
            <br className="sm:hidden" /> 월하연을 이용한 뒤 남긴 이야기입니다.
          </p>
        </Reveal>

        {
          <div className="scrollbar-none mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4">
            {HOME_REVIEWS.map((r, i) => (
              <div
                key={i}
                className="w-[82%] shrink-0 snap-center border border-gold-dim/30 bg-ink px-7 py-8"
              >
                {r.verified && r.outcome === "reunited" && (
                  <span className="mb-3 inline-block rounded-full border border-thread/40 px-3 py-1 text-[0.62rem] tracking-wide text-thread">
                    재회 성공 사례
                  </span>
                )}
                <p className="font-display text-2xl leading-none text-gold/60">
                  “
                </p>
                <p className="mt-2 text-[0.9rem] font-light leading-[2] text-ivory">
                  {r.text}
                </p>
                <div className="mt-6 border-t border-gold-dim/20 pt-4">
                  <p className="text-[0.8rem] text-gold/80">{r.nickname}</p>
                  <p className="mt-1 text-[0.7rem] font-light text-ivory-dim/70">
                    {[r.age_group, r.relationship_context, r.breakup_elapsed]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </section>
  );
}
