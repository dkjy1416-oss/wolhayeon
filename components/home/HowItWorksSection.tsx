import Reveal from "@/components/home/Reveal";
import LoopVideo from "@/components/book/LoopVideo";

/** SECTION 05 — 월화가 어떻게 읽는가 (4단계 + ritual-letter 상징 이미지) */
const STEPS = [
  {
    no: "01",
    title: "내 이야기 들려주기",
    body: "관계의 흐름,\n마지막 대화,\n지금 가장 힘든 마음을 적어요.",
  },
  {
    no: "02",
    title: "결제 전, 무료로 먼저 받는 분석",
    body: "현재 관계 상태, 상대 반응 해석,\n지금 조심할 행동과\n지금 해야 할 행동을 먼저 확인해요.",
  },
  {
    no: "03",
    title: "내 관계를 깊게 보기",
    body: "상대 반응, 관계가 깨진 원인,\n연락 타이밍과 방식,\n첫 메시지 방향과 반응별 대응까지 봐요.",
  },
  {
    no: "04",
    title: "다시 반복되지 않도록",
    body: "재회 후 같은 문제를 막는 방법,\n개인 리추얼과\n24시간 · 7일 · 21일 가이드까지 이어져요.",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="bg-ink-soft/40 py-20">
      <div className="px-6">
        <Reveal>
          <h2 className="font-display text-center text-[1.4rem] font-semibold leading-snug text-ivory">
            몇 줄짜리 운세로
            <br />
            끝나지 않아요.
          </h2>
        </Reveal>
        <ol className="mt-12 flex flex-col gap-9">
          {STEPS.map((s, i) => (
            <Reveal key={s.no} delay={i * 70}>
              <li className="flex gap-5">
                <span className="font-display mt-0.5 text-sm tracking-widest text-gold/80">
                  {s.no}
                </span>
                <div>
                  <p className="text-[1rem] font-medium text-ivory">{s.title}</p>
                  <p className="mt-2 whitespace-pre-line text-[0.87rem] font-light leading-[1.95] text-ivory-dim">
                    {s.body}
                  </p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>

      {/* 붉은 실 — 월하연의 상징 (원본 영상, 무음) */}
      <Reveal className="mt-12">
        <div className="relative">
          <LoopVideo
            src="/book/v3/w-cups.mp4"
            poster="/book/v3/w-cups.webp"
            label="붉은 실로 이어진 찻잔 앞의 월화"
            fit="contain"
            className="block aspect-[3/4] w-full"
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink-soft/80 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-6">
            <p className="text-[0.66rem] tracking-[0.3em] text-gold/80">붉은 실의 리추얼</p>
            <p className="font-display mt-2 text-[1.15rem] leading-[1.7] text-ivory">
              다시 만나기 전에
              <br />
              먼저 봐야 할 것
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
