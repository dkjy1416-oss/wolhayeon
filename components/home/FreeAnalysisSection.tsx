import Reveal from "@/components/home/Reveal";
import TrackedCtaLink from "@/components/TrackedCtaLink";

/**
 * 메인 3~5번째 영역 (10/9 개발지시서 12):
 * 무료로 확인할 수 있는 것 → 가상 결과 미리보기(실제 무료 결과 카드 UI 축소) → CTA
 */
const FREE_ITEMS = [
  ["지금 연락해도 되는지", "먼저 움직일 때인지, 잠시 멈출 때인지"],
  ["상대 반응이 의미하는 것", "단답·읽씹·거리두기가 어떤 상태인지"],
  ["지금 하면 안 되는 행동", "관계를 더 멀어지게 하는 행동 3가지"],
] as const;

const SAMPLE_CARDS = [
  ["지금 연락", "잠시 멈추는 편이 좋아요"],
  ["현재 관계", "감정 소진 후 거리두기"],
  ["가장 위험한 행동", "장문 메시지 반복"],
  ["지금 필요한 것", "상대의 피로부터 낮추기"],
] as const;

export default function FreeAnalysisSection() {
  return (
    <section className="px-4 pb-16 pt-6">
      <Reveal>
        <p className="text-center text-[0.7rem] tracking-[0.3em] text-gold/80">무료로 먼저 확인할 수 있어요</p>
        <ul className="mx-auto mt-5 flex max-w-md flex-col gap-2">
          {FREE_ITEMS.map(([t, d]) => (
            <li key={t} className="rounded-xl border border-gold-dim/25 bg-ink-soft px-4 py-3.5">
              <p className="text-[0.95rem] font-semibold text-ivory">✓ {t}</p>
              <p className="mt-0.5 pl-5 text-[0.8rem] font-light text-ivory-dim">{d}</p>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal delay={100}>
        <div className="mx-auto mt-10 max-w-md">
          <p className="text-center text-[0.7rem] tracking-[0.3em] text-gold/80">무료 결과는 이렇게 보여요</p>
          <p className="mt-1.5 text-center text-[0.72rem] text-ivory-dim/80">가상의 사연으로 만든 예시 화면</p>
          <div className="mt-4 rounded-2xl border border-gold-dim/30 bg-ink px-3.5 py-4">
            <p className="font-display text-[0.98rem] font-semibold text-ivory">지수님의 관계를 분석했어요</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {SAMPLE_CARDS.map(([k, v], i) => (
                <div
                  key={k}
                  className={`min-w-0 rounded-xl border px-3 py-3 ${
                    i === 0 ? "border-burgundy/70 bg-gradient-to-b from-[#2a1015] to-[#1a0c0f]" : "border-gold-dim/25 bg-ink-soft"
                  }`}
                >
                  <p className="text-[0.62rem] text-ivory-dim">{k}</p>
                  <p className="mt-1 break-keep text-[0.82rem] font-semibold leading-[1.4] text-ivory">{v}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 rounded-xl border border-gold-dim/20 bg-ink-soft px-3 py-2.5 text-[0.78rem] font-light leading-[1.8] text-ivory">
              마지막 다툼 이후 상대가 먼저 연락하지 않았고, 긴 메시지에는 짧은 답만 반복됐어요…
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {["나에게 맞는 연락 시점", "첫 연락 실제 문장"].map((t) => (
                <p key={t} className="rounded-lg border border-gold-dim/20 bg-ink-soft/60 px-3 py-2 text-[0.76rem] text-ivory-dim">
                  🔒 {t} <span className="text-gold/70">· 전체 결과에서</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={150}>
        <div className="mx-auto mt-8 max-w-md">
          <TrackedCtaLink
            event="home_cta_click"
            placement="free_analysis"
            href="/apply"
            className="cta-glow inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.97rem] font-semibold text-ivory active:opacity-85"
          >
            내 상황도 무료로 분석하기
          </TrackedCtaLink>
          <p className="mt-3 text-center text-[0.72rem] font-light text-ivory-dim/85">
            결제는 무료 결과를 본 뒤, 원할 때만
          </p>
        </div>
      </Reveal>
    </section>
  );
}
