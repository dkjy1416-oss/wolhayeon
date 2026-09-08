import Reveal from "@/components/home/Reveal";

/**
 * HERO 바로 아래 — 헤어진 뒤 제일 먼저 궁금해지는 것들 (질문형 — 단정 금지)
 */
const QUESTIONS = [
  "다시 이어질 가능성이\n남아 있을까?",
  "지금 연락하면\n더 멀어질까?",
  "상대도 아직\n나를 생각하고 있을까?",
  "다시 만난다면 이번에는\n무엇이 달라져야 할까?",
];

export default function ReunionQuestionsSection() {
  return (
    <section className="px-6 py-20">
      <Reveal>
        <h2 className="font-display text-center text-[1.4rem] font-semibold leading-[1.7] text-ivory">
          헤어진 뒤,
          <br />
          제일 먼저 궁금해지는 것들
        </h2>
      </Reveal>

      <div className="mt-10 flex flex-col gap-4">
        {QUESTIONS.map((q, i) => (
          <Reveal key={i} delay={i * 70}>
            <div className="border-l-2 border-thread/40 bg-ink-soft/60 px-5 py-5">
              <p className="font-display whitespace-pre-line text-[1rem] font-medium leading-[1.9] text-ivory">
                “{q}”
              </p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <p className="mt-12 text-center text-[0.95rem] font-light leading-[2.05] text-ivory">
          월화는 재회를 약속하지 않습니다.
        </p>
        <p className="mt-4 text-center text-[0.9rem] font-light leading-[2.05] text-ivory-dim">
          대신
          <br />두 사람 사이에 남아 있는 흐름,
          <br />
          반복됐던 관계의 패턴,
          <br />
          그리고 지금 내가 할 수 있는 일을
          <br />
          함께 봅니다.
        </p>
      </Reveal>
    </section>
  );
}
