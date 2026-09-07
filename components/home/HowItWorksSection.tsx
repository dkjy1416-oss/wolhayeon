import Reveal from "@/components/home/Reveal";
import HomeImage from "@/components/home/HomeImage";

/** SECTION 05 — 월화가 어떻게 읽는가 (4단계 + ritual-letter 상징 이미지) */
const STEPS = [
  {
    no: "01",
    title: "내 이야기 들려주기",
    body: "관계의 흐름,\n마지막 대화,\n지금 가장 힘든 마음을 적습니다.",
  },
  {
    no: "02",
    title: "월화가 먼저 읽은 마음",
    body: "결제 전에\n내 사연을 바탕으로 한\n개인화 메시지 3문장을 먼저 확인합니다.",
  },
  {
    no: "03",
    title: "내 관계를 깊게 보기",
    body: "관계의 흐름, 현재 감정,\n반복되었던 패턴,\n내가 정말 원하는 것을 봅니다.",
  },
  {
    no: "04",
    title: "다음 행동까지",
    body: "개인 리추얼과\n24시간 · 7일 · 21일 가이드까지 이어집니다.",
  },
];

export default function HowItWorksSection({
  ritualLetter,
}: {
  ritualLetter: string | null;
}) {
  return (
    <section className="bg-ink-soft/40 py-20">
      <div className="px-6">
        <Reveal>
          <h2 className="font-display text-center text-[1.4rem] font-semibold leading-snug text-ivory">
            몇 줄짜리 운세로
            <br />
            끝나지 않습니다.
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

      {/* 편지와 붉은 실 — 월하연의 상징 */}
      <Reveal className="mt-12 px-3">
        <HomeImage
          src={ritualLetter}
          alt="촛불 아래 붉은 실로 묶인 편지"
          aspect="aspect-[4/5]"
          sizes="(max-width: 520px) 100vw, 520px"
        />
      </Reveal>
    </section>
  );
}
