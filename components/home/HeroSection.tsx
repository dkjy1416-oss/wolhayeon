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
        <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/15 to-ink" />
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
      </div>

      <div className="relative flex min-h-[100svh] flex-col justify-end px-6 pb-14 pt-24">
        <Reveal>
          <p className="text-[0.78rem] font-light leading-[1.9] tracking-wide text-gold/90">
            헤어진 뒤, 제일 힘든 건
            <br />
            끝난 건지 아닌지 모르는 시간입니다.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <h1 className="font-display mt-5 text-[1.9rem] font-semibold leading-[1.5] text-ivory">
            연락해야 할까.
            <br />
            기다려야 할까.
            <br />
            아니면 이제 정말 놓아야 할까.
          </h1>
        </Reveal>
        <Reveal delay={240}>
          <p className="mt-6 text-[0.92rem] font-light leading-[2.05] text-ivory-dim">
            마지막 대화를 몇 번이고 다시 읽고,
            <br />
            연락이 올 것 같아 괜히 휴대폰을 확인하고,
            <br />
            다시 만나고 싶은 건지
            <br />
            그때의 내가 그리운 건지도 헷갈릴 때.
          </p>
          <p className="mt-4 text-[0.92rem] font-light leading-[2.05] text-ivory">
            월화가 지금
            <br />
            당신 마음이 머물러 있는 곳부터 읽어드립니다.
          </p>
        </Reveal>
        <Reveal delay={360}>
          <Link
            href="/apply"
            className="cta-glow mt-9 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85"
          >
            내 이야기 먼저 들려주기
          </Link>
          <p className="mt-3 text-center text-[0.73rem] font-light leading-relaxed text-ivory-dim/80">
            결제 전에 월화가 내 사연을 읽은
            <br />
            개인화 메시지를 먼저 보여드려요.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
