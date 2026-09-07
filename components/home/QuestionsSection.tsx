import Reveal from "@/components/home/Reveal";

/** SECTION 06 — "다시 만날 수 있을까?"보다 깊은 질문 (cinematic editorial) */
const QUESTIONS = [
  "다시 이어질 가능성이\n남아 있을까?",
  "지금 연락하면\n더 멀어질까?",
  "상대에게 먼저 연락하지 않고\n내가 할 수 있는 건 무엇일까?",
  "다시 만난다면\n이번에는 무엇이 달라져야 할까?",
  "아직 남아 있는 감정은\n재회를 원하는 마음일까,\n끝내지 못한 마음일까?",
];

export default function QuestionsSection() {
  return (
    <section className="relative px-6 py-28">
      {/* 문장을 잇는 얇은 붉은 실 */}
      <div
        aria-hidden
        className="absolute inset-y-16 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-thread/30 to-transparent"
      />
      <div className="relative mx-auto max-w-2xl text-center">
        <Reveal>
          <h2 className="font-display text-[1.4rem] font-semibold leading-[1.7] text-ivory">
            지금 가장 알고 싶은 건
            <br />
            ‘다시 만날 수 있을까?’일지 몰라요.
          </h2>
          <p className="mt-5 text-[0.95rem] font-light leading-[2] text-ivory-dim">
            그런데 정말 필요한 답은
            <br />그 하나로 끝나지 않습니다.
          </p>
        </Reveal>

        <div className="mt-16 flex flex-col gap-14">
          {QUESTIONS.map((q, i) => (
            <Reveal key={i} delay={i * 60}>
              <p className="relative inline-block bg-ink px-4 py-1">
                <span className="font-display whitespace-pre-line text-[1.1rem] font-medium leading-[1.95] text-ivory">
                  “{q}”
                </span>
              </p>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <p className="font-display mt-16 inline-block bg-ink px-4 text-[1.15rem] font-semibold text-gold">
            월하연은
            <br className="sm:hidden" /> 그 질문을 하나씩 풀어갑니다.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
