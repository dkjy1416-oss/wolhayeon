/** 한눈에 보는 지금 — 결제 전 미리보기에서 정한 판단을 한 장으로 다시 보여 준다 */
export default function SummaryCard({
  name,
  stateLabel,
  modes,
  stanceLabel,
  period,
  decideRule,
  cautions,
  contactPlan = false,
  draft = null,
}: {
  name: string;
  stateLabel: string;
  modes: string[];
  stanceLabel: string;
  period: string;
  decideRule: string;
  cautions: string[];
  contactPlan?: boolean;
  draft?: string | null;
}) {
  return (
    <section className="px-5 pt-2">
      <div className="mx-auto max-w-[34rem] overflow-hidden rounded-2xl border border-gold/35 bg-gradient-to-b from-[#1d1512] to-ink-soft">
        <div className="border-b border-gold-dim/20 px-5 py-4">
          <p className="text-[0.66rem] tracking-[0.25em] text-gold">한눈에 보는 지금</p>
          <p className="mt-1 text-[0.8rem] font-light text-ivory-dim">{name}님 관계의 요약 카드 — 흔들릴 때 여기부터 다시 보세요</p>
        </div>
        <dl className="divide-y divide-gold-dim/15 text-[0.86rem]">
          <div className="grid grid-cols-[5.2rem_1fr] gap-3 px-5 py-3.5">
            <dt className="text-[0.74rem] text-gold/80">지금 관계</dt>
            <dd className="text-ivory">{stateLabel}</dd>
          </div>
          {modes.length > 0 && (
            <div className="grid grid-cols-[5.2rem_1fr] gap-3 px-5 py-3.5">
              <dt className="text-[0.74rem] text-gold/80">상대의 결</dt>
              <dd className="flex flex-wrap gap-1.5">
                {modes.map((m) => (
                  <span key={m} className="rounded-full border border-thread/45 px-2.5 py-0.5 text-[0.74rem] text-thread">
                    {m}
                  </span>
                ))}
              </dd>
            </div>
          )}
          <div className="grid grid-cols-[5.2rem_1fr] gap-3 px-5 py-3.5">
            <dt className="text-[0.74rem] text-gold/80">먼저 할 일</dt>
            <dd>
              <span className="rounded-md bg-gold px-2 py-0.5 text-[0.74rem] font-medium text-ink">{stanceLabel}</span>
              <span className="font-display ml-2 text-[1rem] text-ivory">{period}</span>
            </dd>
          </div>
          {cautions.length > 0 && (
            <div className="grid grid-cols-[5.2rem_1fr] gap-3 px-5 py-3.5">
              <dt className="text-[0.74rem] text-gold/80">피할 행동</dt>
              <dd>
                <ul className="space-y-1">
                  {cautions.map((c) => (
                    <li key={c} className="text-ivory-dim">
                      <span className="mr-1 text-thread">✕</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
          <div className="grid grid-cols-[5.2rem_1fr] gap-3 px-5 py-3.5">
            <dt className="text-[0.74rem] text-gold/80">{contactPlan ? "연락 조건" : "다음 판단"}</dt>
            <dd className="font-light leading-[1.8] text-ivory-dim">{decideRule}</dd>
          </div>
          {contactPlan && (
            <div className="grid grid-cols-[5.2rem_1fr] gap-3 px-5 py-3.5">
              <dt className="text-[0.74rem] text-gold/80">메시지 초안</dt>
              <dd className="leading-[1.8] text-ivory">
                {draft ? <span className="rounded-md bg-ink/70 px-2 py-1">“{draft}”</span> : null}
                <a href="#strategy" className={`${draft ? "mt-1.5 " : ""}block text-[0.76rem] text-gold underline underline-offset-4`}>
                  여섯 · 연락 전략에서 전체 문장 보기
                </a>
              </dd>
            </div>
          )}
          {contactPlan && (
            <div className="grid grid-cols-[5.2rem_1fr] gap-3 px-5 py-3.5">
              <dt className="text-[0.74rem] text-gold/80">반응별 대응</dt>
              <dd className="font-light leading-[1.8] text-ivory-dim">
                반가운 답 · 단답 · 무응답일 때 각각 할 일과 기다릴 기간
                <a href="#strategy" className="block text-[0.76rem] text-gold underline underline-offset-4">바로 보기</a>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}
