const questions = [
  "왜 갑자기 변했을까?",
  "다시 연락이 올까?",
  "나를 아직 생각하고 있을까?",
  "내가 먼저 연락해야 할까?",
  "정말 우리 관계는 끝난 걸까?",
];

export default function EmpathySection() {
  return (
    <section className="glow-red relative px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-display text-center text-[1.4rem] font-semibold text-ivory sm:text-3xl">
          이런 생각을 하고 있나요?
        </h2>

        {/* 카드 대신 세로형 텍스트 — 어둠 속 독백처럼 */}
        <ul className="mx-auto mt-14 flex max-w-md flex-col items-center">
          {questions.map((q, i) => (
            <li key={q} className="flex flex-col items-center text-center">
              {i > 0 && (
                <span
                  aria-hidden
                  className="my-6 block h-6 w-px bg-gradient-to-b from-transparent via-gold-dim/40 to-transparent"
                />
              )}
              <p className="text-[1.02rem] font-light leading-relaxed text-ivory-dim">
                &ldquo;{q}&rdquo;
              </p>
            </li>
          ))}
        </ul>

        <p className="font-display mt-16 text-center text-[1.3rem] font-semibold leading-[1.7] text-ivory sm:text-2xl">
          그래서 우리는
          <br />
          쉽게 놓지 못합니다.
        </p>
      </div>
    </section>
  );
}
