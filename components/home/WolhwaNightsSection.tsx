import Reveal from "@/components/home/Reveal";
import LoopVideo from "@/components/book/LoopVideo";

/** 월화의 밤 — 자막 없는 원본 월화 영상 (무음 반복) + 짧은 제목 */
const NIGHTS = [
  { src: "/book/v3/w-phone.mp4", poster: "/book/v3/w-phone.webp", title: "답장이 없을 때\n자꾸 확인하는 이유" },
  { src: "/book/v3/w-thread.mp4", poster: "/book/v3/w-thread.webp", title: "재회하고 싶다면\n먼저 볼 것" },
  { src: "/book/v3/w-cups.mp4", poster: "/book/v3/w-cups.webp", title: "다시 만나도\n같은 이유로 헤어질 때" },
  { src: "/book/v3/w-mirror.mp4", poster: "/book/v3/w-mirror.webp", title: "그 사람이 필요한 걸까,\n그때가 그리운 걸까" },
];

export default function WolhwaNightsSection() {
  return (
    <section className="bg-ink-soft/40 py-16" aria-label="월화의 밤 영상">
      <Reveal>
        <p className="text-center text-[0.7rem] tracking-[0.3em] text-gold/80">月華 · 월화의 밤</p>
        <h2 className="font-display mt-3 px-6 text-center text-[1.35rem] leading-[1.6] text-ivory">
          월화가 오래 들여다본
          <br />
          관계의 순간들
        </h2>
      </Reveal>
      <div className="scrollbar-none mt-8 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-6 pb-2">
        {NIGHTS.map((n) => (
          <div key={n.src} className="relative w-[58%] shrink-0 snap-center overflow-hidden rounded-xl bg-ink-soft">
            <LoopVideo src={n.src} poster={n.poster} label="월화 영상" className="block aspect-[9/16] w-full object-cover object-top" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
            <p className="font-display pointer-events-none absolute inset-x-0 bottom-0 whitespace-pre-line px-4 pb-4 text-[0.88rem] leading-[1.7] text-ivory">
              {n.title}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 px-6 text-center text-[0.7rem] text-ivory-dim/60">옆으로 넘겨 보세요 →</p>
    </section>
  );
}
