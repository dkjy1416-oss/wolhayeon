import Reveal from "@/components/home/Reveal";
import LoopVideo from "@/components/book/LoopVideo";
import TrackedCtaLink from "@/components/TrackedCtaLink";

/**
 * 무엇을 받는지 — 결제 전 무료 / 결제 후 전체 (실제 미리보기·결과 구성과 일치)
 * 미리보기: lib/ritual-preview (관계 상태·상대 읽기·조심할 행동·지금 할 일)
 * 전체 결과: lib/ritual-result-schema + 결과 화면(요약 카드·실전 노트)
 */
const FREE = [
  { k: "판정", t: "지금 연락해도 되는지", d: "기다릴지 · 가볍게 연락할지 · 거리를 둘지, 그리고 그 기간" },
  { k: "상대", t: "그 사람이 왜 이러는지", d: "지금 상대의 행동을 어떻게 읽어야 하는지" },
  { k: "주의", t: "지금 하면 안 되는 행동", d: "관계를 더 멀게 만드는 행동과 그 이유" },
];

const PAID = [
  { n: "01", t: "한눈에 보는 지금", d: "지금 관계 · 상대의 결 · 지금 할 일과 기간 · 멈출 것을 한 장으로" },
  { n: "02", t: "월화의 첫 편지", d: "당신 이야기로 쓴 한 통" },
  { n: "03", t: "관계 읽기 4편", d: "두 사람의 흐름 · 지금 내 마음 · 반복된 패턴 · 진짜 원하는 것" },
  { n: "04", t: "연락 전략", d: "언제 · 어떤 방식으로 · 사연에 맞춘 첫 메시지 예시 · 반가운 답 / 단답 / 무응답일 때 다음 행동" },
  { n: "05", t: "월화의 실전 노트", d: "답장이 왔을 때, 단답일 때, 술 마신 밤 — 순간마다 ‘이렇게 / 피해요’ · 열리는 신호와 기다릴 신호 · 흔들리는 밤 카드", isNew: true },
  { n: "06", t: "24시간 · 7일 가이드", d: "오늘 밤부터 일주일, 무엇을 하고 하지 말지" },
  { n: "07", t: "21일 하루 플랜", d: "DAY 1~21, 하루 하나의 행동과 질문" },
  { n: "08", t: "붉은 실 리추얼", d: "흔들리는 밤에 마음을 정돈하는 5분" },
  { n: "09", t: "마지막 편지 · 마음 기록장", d: "다 읽은 뒤 남는 말과 스스로 답해 볼 질문들" },
];

export default function WhatYouGetSection() {
  return (
    <section id="what" className="scroll-mt-16">
      <div className="relative">
        <LoopVideo
          src="/book/v3/w-reading.mp4"
          poster="/book/v3/w-reading.webp"
          label="이야기를 읽는 월화"
          fit="contain"
          className="block aspect-[3/4] w-full"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink to-transparent" />
      </div>

      <div className="relative -mt-14 px-5 pb-16">
        <Reveal>
          <h2 className="font-display text-center text-[1.45rem] leading-[1.55] text-ivory">
            사연을 들려주면,
            <br />
            <span className="text-gold">월화가 이렇게 답해요</span>
          </h2>
        </Reveal>

        {/* 무료 */}
        <Reveal>
          <div className="mt-8 rounded-2xl border border-gold/40 bg-ink-soft/80 px-5 py-5">
            <p className="text-[0.7rem] tracking-[0.2em] text-gold">
              결제 전 · <b className="font-medium">무료</b>로 먼저
            </p>
            <ul className="mt-3 space-y-3">
              {FREE.map((f) => (
                <li key={f.k} className="flex gap-3">
                  <span className="mt-0.5 h-fit shrink-0 rounded-md bg-gold/15 px-2 py-0.5 text-[0.68rem] text-gold">{f.k}</span>
                  <div className="min-w-0">
                    <p className="text-[0.92rem] text-ivory">{f.t}</p>
                    <p className="text-[0.76rem] font-light leading-[1.7] text-ivory-dim">{f.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        {/* 유료 */}
        <Reveal>
          <div className="mt-3 rounded-2xl border border-gold-dim/30 bg-ink-soft/50 px-5 py-5">
            <p className="text-[0.7rem] tracking-[0.2em] text-gold/80">결제하면 · 전체 결과</p>
            <ol className="mt-3 divide-y divide-gold-dim/15">
              {PAID.map((p) => (
                <li key={p.n} className="flex gap-3 py-2.5">
                  <span className="font-display w-6 shrink-0 text-[0.8rem] text-thread">{p.n}</span>
                  <div className="min-w-0">
                    <p className="text-[0.9rem] text-ivory">
                      {p.t}
                      {"isNew" in p && p.isNew && (
                        <span className="ml-1.5 rounded bg-thread/20 px-1.5 py-0.5 align-middle text-[0.6rem] text-thread">NEW</span>
                      )}
                    </p>
                    <p className="text-[0.74rem] font-light leading-[1.65] text-ivory-dim">{p.d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-[0.7rem] font-light leading-[1.7] text-ivory-dim/70">
              결제 후 1~3분이면 웹 화면으로 바로 열리고, 메일로도 보내 드려요 (30일 열람).
              <br />
              차단·안전 문제가 있는 사연엔 연락 전략 대신 거리를 지키는 방법을 담아요.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <ol className="mt-6 grid grid-cols-3 gap-2 text-center">
            {[
              ["사연 쓰기", "3분"],
              ["무료 미리보기", "바로"],
              ["전체 결과", "결제 후 1~3분"],
            ].map(([t, s], i) => (
              <li key={t} className="rounded-xl border border-gold-dim/20 px-1 py-2.5">
                <p className="font-display text-[0.8rem] text-gold">{i + 1}</p>
                <p className="text-[0.74rem] text-ivory">{t}</p>
                <p className="text-[0.64rem] text-ivory-dim/70">{s}</p>
              </li>
            ))}
          </ol>
          <TrackedCtaLink
            event="home_cta_click"
            placement="what_you_get"
            href="/apply"
            className="cta-glow mt-6 flex h-14 w-full items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory active:opacity-85"
          >
            무료로 내 관계 먼저 보기
          </TrackedCtaLink>
          <p className="mt-2.5 text-center text-[0.7rem] font-light text-ivory-dim/80">
            미리보기는 무료 · 마음에 들 때만 결제 · 재회를 보장하지는 않아요
          </p>
        </Reveal>
      </div>
    </section>
  );
}
