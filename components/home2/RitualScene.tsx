/** 06. 리추얼을 실제로 이해시키기 — 준비물 · 순서 · 마친 뒤 한 줄 (가상 예시 · 실제 결과 part_07~09 형식) */
import Image from "next/image";

export default function RitualScene() {
  return (
    <section className="night px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto grid max-w-[1120px] items-center gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-14">
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[420px] overflow-hidden rounded-[24px]">
          <Image src="/wolhwa/ritual-letter.webp" alt="촛불 아래 접힌 편지와 펜" fill sizes="(min-width: 768px) 420px, 90vw" className="object-cover" />
        </div>
        <div className="min-w-0">
          <p className="text-[0.8rem] tracking-[0.14em] text-gold">리추얼이란</p>
          <h2 className="font-display font-bold mt-2 text-[1.55rem] leading-[1.45] text-ivory [text-wrap:balance] md:text-[2rem]">
            월하연에서 말하는 리추얼은 이런 시간입니다.
          </h2>
          <p className="mt-4 max-w-[36rem] text-[1rem] leading-[1.8] text-ivory-dim">
            내 감정을 적고, 준비물을 두고, 짧은 순서에 따라 마음과 행동을 정리하는 개인적인 실천이에요. 상대의 마음이나 연락을 바꾸는 효능을 약속하지 않아요.
            전체 구성에는 내 사연에 맞춘 리추얼의 의미 · 준비물 · 진행 순서가 들어가요.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-2xl border border-gold-dim bg-ink-soft px-5 py-4">
              <p className="text-[0.76rem] tracking-[0.12em] text-gold">준비물</p>
              <ul className="mt-2 flex flex-col gap-1 text-[0.95rem] text-ivory">
                <li>종이 한 장</li>
                <li>펜</li>
                <li>작은 봉투</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-gold-dim bg-ink-soft px-5 py-4">
              <p className="text-[0.76rem] tracking-[0.12em] text-gold">진행 순서 (일부)</p>
              <ol className="mt-2 flex flex-col gap-1.5 text-[0.95rem] leading-[1.6] text-ivory">
                <li>1. 보내고 싶은 말을 종이에 끝까지 적기</li>
                <li>2. 있었던 일과 내 감정을 나눠 밑줄 긋기</li>
                <li>3. 오늘 지킬 작은 행동 하나를 정하기</li>
              </ol>
            </div>
          </div>
          <p className="font-display mt-4 rounded-2xl border border-gold/40 px-5 py-4 text-[1.02rem] leading-[1.7] text-ivory">
            마친 뒤 적는 한 줄 · “오늘은 보내지 않고, 내 하루를 지켰다.”
          </p>
          <p className="mt-2 text-[0.78rem] text-ivory-dim">가상 예시 · 실제 리추얼의 이름과 순서는 내 사연에 따라 달라져요</p>
        </div>
      </div>
    </section>
  );
}
