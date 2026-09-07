import Reveal from "@/components/home/Reveal";
import ShortCard from "@/components/home/ShortCard";
import type { ShortMeta } from "@/lib/home-media";

/**
 * SECTION 08 — 월화 숏폼 (9:16 카드, 모바일 swipe)
 * 실제 파일이 있는 항목만 video 카드로, 없는 항목은 '영상 준비 중' 카드로
 * (빈 video 태그·404 요청 없음)
 */
export default function WolhwaShortsSection({ shorts }: { shorts: ShortMeta[] }) {
  return (
    <section className="bg-ink-soft/40 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="font-display text-center text-[1.5rem] font-semibold leading-snug text-ivory">
            월화가 짧게 전하는 관계 이야기
          </h2>
        </Reveal>

        <div className="scrollbar-none mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
          {shorts.map((s) => (
            <div key={s.id} className="w-[52%] shrink-0 snap-center">
              {s.src ? (
                <ShortCard title={s.title} src={s.src} poster={s.poster} />
              ) : (
                <div className="relative flex aspect-[9/16] w-full flex-col justify-end overflow-hidden rounded-lg border border-gold-dim/25 bg-gradient-to-b from-[#161219] via-ink-soft to-ink px-4 pb-5">
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-thread/30 to-transparent"
                  />
                  <p className="whitespace-pre-line text-[0.82rem] font-medium leading-[1.7] text-ivory">
                    {s.title}
                  </p>
                  <p className="mt-2 text-[0.62rem] text-ivory-dim/60">
                    영상 준비 중
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
