import Reveal from "@/components/home/Reveal";

/**
 * HERO 바로 아래 — 재회를 원할 때 지금 가장 알고 싶은 것들 (질문형 — 단정 금지)
 */
const QUESTIONS = [
  "지금 연락해도 될까,\n조금 더 기다려야 할까?",
  "그 사람은 왜\n이렇게 행동하는 걸까?",
  "내가 하는 행동이\n관계를 더 망치고 있진 않을까?",
  "다시 만난다면 이번에는\n무엇이 달라져야 할까?",
];

export default function ReunionQuestionsSection() {
  return (
    <section className="px-6 py-20">
      <Reveal>
        <h2 className="font-display text-center text-[1.4rem] font-semibold leading-[1.7] text-ivory">
          재회를 원한다면,
          <br />
          지금 가장 알고 싶은 것들
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
          월화는 재회를 약속하지 않아요.
        </p>
        <p className="mt-4 text-center text-[0.9rem] font-light leading-[2.05] text-ivory-dim">
          대신
          <br />
          지금 관계가 어떤 상태인지,
          <br />
          무엇이 관계를 더 멀어지게 하는지,
          <br />
          어떤 순서로 움직여야 하는지를
          <br />
          당신의 이야기로 함께 봐요.
        </p>
      </Reveal>
    </section>
  );
}
