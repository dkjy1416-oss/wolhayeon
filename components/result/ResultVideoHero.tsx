import HeroMontage from "@/components/home/HeroMontage";

const CLIPS = [
  { src: "/book/v3/w-reading.mp4", poster: "/book/v3/w-reading.webp", position: "object-top" },
  { src: "/book/v3/w-thread.mp4", poster: "/book/v3/w-thread.webp", position: "object-top" },
  { src: "/book/v3/w-mirror.mp4", poster: "/book/v3/w-mirror.webp", position: "object-top" },
  { src: "/book/v3/w-final.mp4", poster: "/book/v3/w-final.webp", position: "object-top" },
];

/** 결과 첫 화면 — 월화 영상(무음) 위에 이름과 목차 */
export default function ResultVideoHero({
  name,
  toc,
}: {
  name: string;
  toc: { href: string; label: string }[];
}) {
  return (
    <header className="relative h-[88svh] min-h-[34rem] overflow-hidden">
      <div className="absolute inset-0" aria-hidden>
        <HeroMontage clips={CLIPS} interval={5200} />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-ink via-ink/85 to-transparent" />
      </div>
      <p className="absolute inset-x-0 top-[max(1.4rem,env(safe-area-inset-top))] text-center text-[0.7rem] tracking-[0.4em] text-gold/90">
        月下緣
      </p>
      <div className="absolute inset-x-0 bottom-0 px-6 pb-8 text-center">
        <p className="text-[0.68rem] tracking-[0.3em] text-thread">월화가 다 썼어요</p>
        <h1 className="font-display mt-3 text-[1.75rem] font-semibold leading-[1.45] text-ivory">
          {name}님을 위한
          <br />
          월화의 전체 답장
        </h1>
        <p className="mt-3 text-[0.84rem] font-light leading-[1.9] text-ivory-dim">
          천천히, 처음부터 끝까지 당신의 속도로.
        </p>
        <nav className="mx-auto mt-6 flex max-w-sm flex-wrap items-center justify-center gap-1.5">
          {toc.map((t) => (
            <a
              key={t.href}
              href={t.href}
              className="rounded-full border border-gold-dim/40 bg-ink/50 px-3 py-1.5 text-[0.72rem] text-ivory-dim backdrop-blur"
            >
              {t.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
