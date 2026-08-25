import Image from "next/image";

export default function StorySection() {
  return (
    <section className="relative overflow-hidden pb-24 sm:pb-32">
      {/* 몰입형 이미지 — 카드에 가두지 않고 화면 가장자리까지,
          위아래는 딥블랙 배경으로 자연스럽게 이어지도록 페이드 */}
      <div className="relative mx-auto aspect-[2/3] w-full max-w-xl">
        <Image
          src="/images/wolhwa-story.webp"
          alt="촛불 곁에서 붉은 실을 바라보는 월화"
          fill
          quality={90}
          sizes="(max-width: 640px) 100vw, 576px"
          className="object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-ink via-ink/60 to-transparent"
        />
        {/* 넓은 화면에서는 좌우도 배경으로 스며들게 */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 hidden w-24 bg-gradient-to-r from-ink to-transparent sm:block"
        />
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 hidden w-24 bg-gradient-to-l from-ink to-transparent sm:block"
        />
      </div>

      {/* 텍스트 영역 — 붉은 실이 이미지에서 문장으로 이어지는 효과 */}
      <div className="relative mx-auto -mt-6 max-w-md px-6 text-center">
        <svg
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-full w-40 -translate-x-1/2 opacity-30"
          viewBox="0 0 160 600"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            className="thread-path"
            d="M80 0 C 52 90, 108 170, 80 260 C 52 350, 108 430, 80 520 L 80 600"
            stroke="var(--color-thread)"
            strokeWidth="1"
          />
        </svg>

        <div className="relative">
          <p className="font-display text-[1.3rem] font-semibold leading-[1.7] text-ivory sm:text-2xl">
            사람과 사람 사이에는
            <br />
            눈에 보이지 않는 인연이 있습니다.
          </p>
          <p className="mt-8 text-[0.92rem] font-light leading-[2] text-ivory-dim">
            어떤 인연은 짧게 지나가고,
            <br />
            어떤 인연은 멀어져도
            <br />
            오랫동안 마음속에 남습니다.
          </p>
          <p className="font-display mt-12 text-lg font-semibold leading-[1.8] text-gold sm:text-xl">
            월하연에서는 이것을
            <br />
            &lsquo;인연의 실&rsquo;이라고 부릅니다.
          </p>
        </div>
      </div>
    </section>
  );
}
