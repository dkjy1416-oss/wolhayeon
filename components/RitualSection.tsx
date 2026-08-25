const steps = [
  { no: "01", label: "이야기를 들려주세요" },
  { no: "02", label: "두 사람의 관계를 정리합니다" },
  { no: "03", label: "개인 리추얼을 구성합니다" },
  { no: "04", label: "조용한 시간에 직접 진행합니다" },
];

export default function RitualSection() {
  return (
    <section className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-display text-center text-[1.4rem] font-semibold text-ivory sm:text-3xl">
          붉은 인연의 실 리추얼
        </h2>
        <p className="mx-auto mt-8 max-w-md text-center text-[0.92rem] font-light leading-[2] text-ivory-dim">
          당신과 상대방의 이름,
          <br />
          현재 두 사람의 관계,
          <br />
          그리고 당신이 바라는 마음을 바탕으로
          <br />
          하나의 개인 리추얼을 구성합니다.
        </p>

        <ol className="mx-auto mt-14 max-w-md divide-y divide-gold-dim/20 border-y border-gold-dim/20">
          {steps.map((s) => (
            <li key={s.no} className="flex items-center gap-6 px-2 py-6">
              <span className="font-display w-8 shrink-0 text-center text-base tracking-widest text-gold/90">
                {s.no}
              </span>
              <span className="text-[0.95rem] text-ivory">{s.label}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
