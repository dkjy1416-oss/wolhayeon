import TrackedCtaLink from "@/components/TrackedCtaLink";
import Image from "next/image";
import Reveal from "@/components/home/Reveal";
import HeroMontage, { type MontageClip } from "@/components/home/HeroMontage";

/**
 * SECTION 01 — HERO (모바일 전용)
 * 첫 화면 전체를 월화 무음 loop 영상이 지배. (muted autoplay loop playsInline)
 * 얼굴이 상단에 있는 실제 영상 구도 기준 object-position 상단 고정.
 */
export default function HeroSection({
  video,
  poster,
  clips = [],
}: {
  video: string | null;
  poster: string | null;
  /** 있으면 여러 원본 영상을 교차 재생 */
  clips?: MontageClip[];
}) {
  return (
    <section className="relative min-h-[100svh] overflow-hidden">
      <div className="absolute inset-0" aria-hidden>
        {clips.length > 0 ? (
          <HeroMontage clips={clips} />
        ) : video ? (
          <video
            className="h-full w-full object-cover object-[50%_22%]"
            src={video}
            poster={poster ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : poster ? (
          <Image
            src={poster}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[50%_22%]"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-b from-[#141019] via-ink-soft to-ink" />
        )}
        {/* 영상이 보이도록 하단만 어둡게 */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-ink via-ink/80 to-transparent" />
      </div>

      <div className="relative flex min-h-[100svh] flex-col justify-end px-6 pb-10 pt-24">
        <Reveal>
          <h1 className="font-display text-[2.15rem] font-semibold leading-[1.38] text-ivory drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
            연락해야 할까.
            <br />
            기다려야 할까.
          </h1>
        </Reveal>
        <Reveal delay={150}>
          <TrackedCtaLink
            event="home_cta_click"
            placement="hero"
            href="/apply"
            className="cta-glow mt-7 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.98rem] font-medium text-ivory transition-opacity active:opacity-85"
          >
            무료로 내 관계 먼저 보기
          </TrackedCtaLink>
          <p className="mt-3 text-center text-[0.72rem] font-light text-ivory-dim/85">
            사연 3분 · 결제 전 미리보기 무료
          </p>
        </Reveal>
      </div>
    </section>
  );
}
