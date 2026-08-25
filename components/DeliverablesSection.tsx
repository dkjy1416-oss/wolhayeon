const items = [
  "두 사람을 위한 개인 리추얼",
  "리추얼 준비 방법",
  "약 5분의 진행 순서",
  "개인화된 리추얼 문구",
  "리추얼 이후 마음 정리 가이드",
];

export default function DeliverablesSection() {
  return (
    <section className="glow-red px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-md">
        <h2 className="font-display text-center text-[1.4rem] font-semibold text-ivory sm:text-3xl">
          당신에게 전달되는 것
        </h2>

        <ul className="mt-12 flex flex-col gap-4">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-4">
              <span
                aria-hidden
                className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-thread"
              />
              <span className="text-[0.95rem] font-light leading-relaxed text-ivory-dim">
                {item}
              </span>
            </li>
          ))}
        </ul>

        <p className="font-display mt-14 text-center text-lg font-semibold text-gold">
          누구에게나 똑같은 내용이 아닙니다.
        </p>
      </div>
    </section>
  );
}
