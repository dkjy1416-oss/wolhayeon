import Reveal from "@/components/home/Reveal";
import LoopVideo from "@/components/book/LoopVideo";
import TrackedCtaLink from "@/components/TrackedCtaLink";

/**
 * 히어로 바로 아래 — "이 장면, 지금 내 얘기다" (운영자 원본 영상, 무음)
 * 각 장면마다 그 밤에 보내기 쉬운 한 줄을 얹어 둔다.
 */
const MOMENTS = [
  { src: "/book/v3/fight.mp4", poster: "/book/v3/fight.webp", tag: "싸우고 끝난 밤", line: "“근데 너도 그렇게까지\n말할 필요는 없었잖아”" },
  { src: "/book/v3/grab.mp4", poster: "/book/v3/grab.webp", tag: "붙잡았던 날", line: "“이번에 안 받아주면\n진짜 끝이야”" },
  { src: "/book/v3/drink.mp4", poster: "/book/v3/drink.webp", tag: "혼자 마신 새벽", line: "“자니…? 그냥\n생각나서”" },
  { src: "/book/v3/typing.mp4", poster: "/book/v3/typing.webp", tag: "썼다 지운 메시지", line: "“솔직하게 말해줘.\n나 아직 좋아해?”" },
];

export default function MomentsSection() {
  return (
    <section className="px-4 pb-16 pt-4">
      <Reveal>
        <p className="text-center text-[0.7rem] tracking-[0.3em] text-gold/80">이 장면, 낯설지 않다면</p>
        <h2 className="font-display mt-3 text-center text-[1.45rem] leading-[1.6] text-ivory">
          지금 보내려는 그 한 줄,
          <br />
          <span className="text-gold">이 중에 있나요?</span>
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
                className="block aspect-[9/14] w-full object-cover object-top"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink via-ink/75 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-3">
                <p className="text-[0.64rem] tracking-[0.15em] text-thread">{m.tag}</p>
                <p className="mt-1 whitespace-pre-line text-[0.78rem] leading-[1.6] text-ivory line-through decoration-thread/70">
                  {m.line}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="mt-8 rounded-2xl border border-thread/30 bg-thread/5 px-5 py-5 text-center">
          <p className="font-display text-[1.02rem] leading-[1.8] text-ivory">
            보낸 메시지는 지울 수 있어도,
            <br />
            <span className="text-gold">읽힌 마음은 되돌릴 수 없어요.</span>
          </p>
          <p className="mt-3 text-[0.82rem] font-light leading-[1.95] text-ivory-dim">
            그 한 줄이 ‘다시 생각해 볼 사람’이 될지,
            <br />
            ‘또 시작이네’가 될지는 보내기 전에 정해져요.
          </p>
          <TrackedCtaLink
            event="home_cta_click"
            placement="moments"
            href="/apply"
            className="cta-glow mt-5 inline-flex h-12 w-full items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.9rem] font-medium text-ivory active:opacity-85"
          >
            보내기 전에, 월화에게 먼저 보여주기
          </TrackedCtaLink>
          <p className="mt-2.5 text-[0.7rem] font-light text-ivory-dim/80">사연을 들려주면 무료 미리보기부터 보여드려요</p>
        </div>
      </Reveal>
    </section>
  );
}
