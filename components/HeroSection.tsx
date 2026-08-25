import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden">
      {/* 월화 메인 이미지 — 얼굴은 상단, 붉은 실은 중앙에 오도록 배치 */}
      <Image
        src="/images/wolhwa-hero.webp"
        alt="달빛 아래에서 붉은 실을 든 월화"
        fill
        priority
        quality={90}
        sizes="100vw"
        className="object-cover object-[center_30%]"
      />

      {/* 텍스트 가독성용 오버레이 — 이미지 blur 없음, 그라데이션만 사용.
          얼굴이 있는 상단은 거의 건드리지 않고 하단만 어둡게 */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-ink/20 via-transparent to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-ink via-ink/75 to-transparent"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-end px-6 pb-14 pt-28 sm:px-8">
        <p className="mb-5 text-[0.68rem] tracking-[0.35em] text-gold/90">
          月下緣 · 달빛 아래의 인연
        </p>
        <h1 className="font-display max-w-[19ch] text-[1.75rem] font-semibold leading-[1.5] text-ivory sm:text-4xl sm:leading-[1.45]">
          아직 그 사람과의
          <br />
          인연이 끝나지 않았다고
          <br />
          느끼시나요?
        </h1>
        <p className="mt-5 max-w-[24ch] text-[0.92rem] font-light leading-[1.9] text-ivory-dim sm:max-w-none sm:text-base">
          연락은 끊겼지만 마음까지
          <br className="sm:hidden" /> 끝난 것은 아닐 수 있습니다.
        </p>

        <Link
          href="#pricing"
          className="mt-9 inline-flex h-14 w-full max-w-sm items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85"
        >
          우리의 인연 리추얼 시작하기
        </Link>

        <p className="mt-4 text-[0.68rem] tracking-wide text-ivory-dim/60">
          두 사람의 마음을 돌아보는 개인화 리추얼
        </p>
      </div>
    </section>
  );
}
