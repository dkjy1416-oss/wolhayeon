export default function StorySection() {
  return (
    <section className="relative overflow-hidden px-6 py-24 sm:py-32">
      {/* 붉은 실 — 섹션을 세로로 가로지르는 한 가닥 */}
      <svg
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-full w-40 -translate-x-1/2 opacity-30"
        viewBox="0 0 160 800"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          className="thread-path"
          d="M80 0 C 48 120, 112 220, 80 340 C 48 460, 112 560, 80 680 L 80 800"
          stroke="var(--color-thread)"
          strokeWidth="1"
        />
      </svg>

      <div className="relative mx-auto max-w-5xl">
        {/* 월화 스토리 이미지 — 테두리 없이 가장자리가 어둠에 녹아들도록 */}
        <div
          className="img-blend mx-auto aspect-[3/4] w-full max-w-[330px] bg-ink-soft bg-cover bg-[position:center_25%] sm:max-w-sm"
          style={{ backgroundImage: "url('/images/wolhwa-story.webp')" }}
          role="img"
          aria-label="촛불 곁에서 붉은 실을 다루는 월화"
        />

        <div className="mx-auto mt-12 max-w-md text-center">
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
