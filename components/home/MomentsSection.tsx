import Reveal from "@/components/home/Reveal";
import LoopVideo from "@/components/book/LoopVideo";

/**
 * 히어로 바로 아래 — "이 장면, 지금 내 얘기다" (운영자 원본 영상, 무음)
 * 각 장면마다 그 밤에 보내기 쉬운 한 줄을 얹어 둔다.
 */
const MOMENTS = [
  { src: "/book/v3/fight.mp4", poster: "/book/v3/fight.webp", tag: "자주 오는 고민", line: "싸우고\n연락이 끊겼어요." },
  { src: "/book/v3/grab.mp4", poster: "/book/v3/grab.webp", tag: "자주 오는 고민", line: "제가 너무 많이\n매달렸어요." },
  { src: "/book/v3/bed.mp4", poster: "/book/v3/bed.webp", tag: "자주 오는 고민", line: "읽씹인데 다시\n연락해도 될까요?" },
  { src: "/book/v3/drink.mp4", poster: "/book/v3/drink.webp", tag: "자주 오는 고민", line: "헤어진 뒤 SNS는\n계속 보고 있어요." },
];

export default function MomentsSection() {
  return (
    <section className="px-4 pb-16 pt-4">
      <Reveal>
        <p className="text-center text-[0.7rem] tracking-[0.3em] text-gold/80">이런 고민으로 와요</p>
        <h2 className="font-display mt-3 text-center text-[1.45rem] leading-[1.6] text-ivory">
          혹시 지금,
          <br />
          <span className="text-gold">이 중 하나인가요?</span>
        </h2>
      </Reveal>

      <div className="mt-8 grid grid-cols-2 gap-2">
        {MOMENTS.map((m, i) => (
          <Reveal key={m.src} delay={i * 60}>
            <div className="relative overflow-hidden rounded-xl bg-ink-soft">
              <LoopVideo
                src={m.src}
                poster={m.poster}
                label={m.tag}
                className="block aspect-[9/16] w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink via-ink/75 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-3">
                <p className="text-[0.64rem] tracking-[0.15em] text-thread">{m.tag}</p>
                <p className="mt-1 whitespace-pre-line text-[0.86rem] font-medium leading-[1.55] text-ivory">
                  {m.line}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

    </section>
  );
}
