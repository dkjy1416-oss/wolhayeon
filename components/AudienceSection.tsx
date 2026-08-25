const audiences = [
  "헤어진 후에도 마음이 남아 있는 분",
  "연락이 끊긴 관계가 마음에 걸리는 분",
  "짝사랑으로 마음이 복잡한 분",
  "관계를 정리할 계기가 필요한 분",
];

export default function AudienceSection() {
  return (
    <section className="glow-gold px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-md">
        <h2 className="font-display text-center text-[1.4rem] font-semibold leading-[1.6] text-ivory sm:text-3xl">
          이런 분들을 위해
          <br />
          준비했습니다
        </h2>

        <ul className="mt-12 flex flex-col gap-5">
          {audiences.map((a) => (
            <li key={a} className="flex items-start gap-4">
              <span
                aria-hidden
                className="mt-[0.6rem] h-1 w-1 shrink-0 rounded-full bg-gold/70"
              />
              <span className="text-[0.95rem] font-light leading-relaxed text-ivory-dim">
                {a}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
