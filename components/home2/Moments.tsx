/** 02. 이런 고민으로 와요 — 고민 장면 영상 4개. 누르면 그 상황이 신청서 첫 선택으로 들어간다 (/apply?sit=) */
import TrackedCtaLink from "@/components/TrackedCtaLink";
import LoopVideo from "@/components/book/LoopVideo";
import { MOMENTS } from "./media";

export default function Moments() {
  return (
    <section className="night px-4 pb-16 pt-14 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1120px]">
        <p className="text-center text-[0.78rem] tracking-[0.2em] text-gold">이런 밤에 찾아와요</p>
        <h2 className="font-display font-bold mt-3 text-center text-[1.55rem] leading-[1.5] text-ivory md:text-[2rem]">
          혹시 지금, 이 중 하나인가요?
        </h2>
        <div className="mt-8 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
          {MOMENTS.map((m) => (
            <TrackedCtaLink
              key={m.src}
              event="home_cta_click"
              placement={`moment_${m.sit}`}
              href={`/apply?sit=${m.sit}`}
              className="group relative block overflow-hidden rounded-2xl bg-[#2a2528]"
            >
              <LoopVideo src={m.src} poster={m.poster} className="block aspect-[9/14] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#201d20] via-[#201d20]/75 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3.5 pb-3.5">
                <p className="whitespace-pre-line text-[0.95rem] font-semibold leading-[1.5] text-ivory">{m.line}</p>
                <p className="mt-1.5 text-[0.74rem] text-gold">내 이야기로 시작하기 →</p>
              </div>
            </TrackedCtaLink>
          ))}
        </div>
      </div>
    </section>
  );
}
