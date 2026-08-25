export default function PreviewSection() {
  return (
    <section className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-md">
        <h2 className="font-display text-center text-[1.4rem] font-semibold text-ivory sm:text-3xl">
          결과물 미리보기
        </h2>

        {/* 가상의 리추얼 결과 카드 */}
        <div className="relative mt-12 overflow-hidden rounded-2xl border border-gold-dim/25 bg-gradient-to-b from-ink-soft to-ink px-8 py-10">
          {/* 은은한 상단 금빛 */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,rgba(201,169,106,0.1),transparent)]"
          />

          <div className="relative text-center">
            <p className="font-display text-2xl font-semibold text-gold">月華</p>
            <p className="font-display mt-2 text-lg text-ivory">
              붉은 인연의 실
            </p>
            <div
              aria-hidden
              className="mx-auto mt-6 h-px w-16 bg-gold-dim/50"
            />
            <p className="mt-6 text-sm text-ivory-dim">
              김○○님을 위한 개인 리추얼
            </p>
          </div>

          {/* 블러 처리된 개인 결과 텍스트 */}
          <div aria-hidden className="mt-8 select-none space-y-3 blur-[6px]">
            <p className="text-sm leading-relaxed text-ivory-dim">
              달이 가장 높이 떠오르는 밤, 조용한 방 안에서 붉은 실을 왼손에
              감고 두 사람의 이름을 천천히 떠올립니다.
            </p>
            <p className="text-sm leading-relaxed text-ivory-dim">
              마음속에 남아 있는 말들을 하나씩 꺼내어 정리하고, 준비된 문구를
              나지막이 읽어 내려갑니다.
            </p>
            <p className="text-sm leading-relaxed text-ivory-dim">
              리추얼이 끝난 뒤에는 오늘의 마음을 짧게 기록해 둡니다.
            </p>
          </div>

          <p className="relative mt-8 text-center text-[0.7rem] tracking-wide text-ivory-dim/60">
            * 위 화면은 이해를 돕기 위한 샘플이며 실제 결과물이 아닙니다.
          </p>
        </div>
      </div>
    </section>
  );
}
