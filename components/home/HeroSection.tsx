import Link from "next/link";
import Image from "next/image";
import Reveal from "@/components/home/Reveal";

/**
 * SECTION 01 — HERO (모바일 전용)
 * 첫 화면 전체를 월화 무음 loop 영상이 지배. (muted autoplay loop playsInline)
 * 얼굴이 상단에 있는 실제 영상 구도 기준 object-position 상단 고정.
 */
export default function HeroSection({
  video,
  poster,
}: {
  video: string | null;
  poster: string | null;
}) {
  return (
    <section className="relative min-h-[100svh] overflow-hidden">
      <div className="absolute inset-0" aria-hidden>
        {video ? (
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
        {/* 카피 가독성용 어두운 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/45 via-transparent to-ink" />
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
      </div>

      <div className="relative flex min-h-[100svh] flex-col justify-end px-6 pb-14 pt-24">
        <Reveal>
          <p className="text-[0.78rem] font-light leading-[1.8] tracking-wide text-gold/90">
            끝난 건지, 아직 남아 있는 건지.
          </p>
        </Reveal>
        <Reveal delay={100}>
          <h1 className="font-display mt-5 text-[2.15rem] font-semibold leading-[1.42] text-ivory">
            연락해야 할까.
            <br />
            기다려야 할까.
          </h1>
        </Reveal>
        <Reveal delay={200}>
          <p className="mt-6 text-[0.95rem] font-light leading-[2.05] text-ivory-dim">
            <span className="text-ivory">
              월화는 먼저,
              <br />두 사람 사이의 흐름부터 읽습니다.
            </span>
          </p>
        </Reveal>
        <Reveal delay={300}>
          <Link
            href="/apply"
            className="cta-glow mt-9 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.98rem] font-medium text-ivory transition-opacity active:opacity-85"
          >
            내 이야기 먼저 들려주기
          </Link>
          <p className="mt-3 text-center text-[0.72rem] font-light text-ivory-dim/80">
            결제 전, 개인화 미리보기부터 보여드려요
          </p>
        </Reveal>
      </div>
    </section>
  );
}
