import Reveal from "@/components/home/Reveal";

/**
 * 루프 영상 감정 섹션 — 영상은 "배경"이고 그 위에 카피가 얹히는 full-bleed 구성.
 * <video> 플레이어/카드처럼 보이지 않게: 컨트롤 없음, 테두리·라운드 없음,
 * 상하단은 ink로 길게 녹아들고, 중앙엔 가벼운 vignette.
 */
export default function WolhwaReadingSection({
  video,
  poster,
}: {
  video: string | null;
  poster: string | null;
}) {
  return (
    <section className="relative min-h-[88svh] overflow-hidden">
      {/* 배경 미디어 (full-bleed) */}
      <div className="absolute inset-0" aria-hidden>
        {video ? (
          <video
            className="h-full w-full object-cover object-[50%_30%]"
            src={video}
            poster={poster ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-b from-ink via-[#131017] to-ink" />
        )}
        {/* 상하단 녹아들기 + 은은한 vignette */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink via-ink/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(13,13,15,0.55)_100%)]" />
      </div>

      {/* 카피 오버레이 */}
      <div className="relative flex min-h-[88svh] flex-col justify-end px-6 pb-16">
        <Reveal>
          <p className="text-[0.66rem] tracking-[0.32em] text-gold/80">
            月華의 시선
          </p>
          <p className="font-display mt-4 text-[1.3rem] font-semibold leading-[1.8] text-ivory">
            당신의 이야기를 들은 뒤,
            <br />
            월화는 이렇게 읽습니다.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-6 text-[0.92rem] font-light leading-[2.05] text-ivory-dim">
            관계의 흐름은 감정보다
            <br />
            먼저 드러나는 순간이 있습니다.
          </p>
          <p className="mt-4 text-[0.92rem] font-light leading-[2.05] text-ivory">
            지금 필요한 건 조급한 연락인지,
            <br />
            천천한 거리두기인지 먼저 살펴봅니다.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
