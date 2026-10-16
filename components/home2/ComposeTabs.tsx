"use client";

/** 03. 무엇을 받는가 — 편지 · 관계 읽기 · 리추얼 · 실천 가이드를 읽을 수 있는 예시 카드로 (가상 사연) */
import { useState } from "react";
import Image from "next/image";
import { TABS, EXAMPLE_STORY } from "./content";
import { V2 } from "./media";

export default function ComposeTabs() {
  const [i, setI] = useState(0);
  const t = TABS[i];
  return (
    <section id="compose" className="scroll-mt-16 px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1120px]">
        <p className="text-[0.8rem] tracking-[0.14em] text-gold">무엇을 받나요</p>
        <h2 className="font-display font-bold mt-2 text-[1.55rem] leading-[1.45] text-ivory [text-wrap:balance] md:text-[2rem]">
          무료로 먼저 읽고, 필요할 때 전체 구성을 받아요
        </h2>
        <p className="mt-3 max-w-[40rem] text-[0.98rem] leading-[1.75] text-ivory-dim">
          아래는 가상 사연으로 만든 실제 형식의 예시예요. 내 결과는 입력한 사연에 따라 문장과 기준, 기간이 달라져요.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-[280px_1fr] md:gap-10">
          <div className="min-w-0">
            <div className="shadow-paper relative mb-4 aspect-[4/5] w-full overflow-hidden rounded-2xl">
              <Image src={V2.set} alt="편지 · 리추얼 카드 · 실천 가이드가 놓인 책상" fill sizes="(min-width: 768px) 280px, 92vw" className="object-cover" />
              <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#201d20]/85 to-transparent px-4 pb-3 pt-10 text-[0.84rem] text-[#f3ece4]">편지 · 나만의 리추얼 · 첫날~21일 가이드</p>
            </div>
            <div className="rounded-2xl border border-gold-dim bg-ink-soft px-5 py-4">
              <p className="text-[0.74rem] tracking-[0.12em] text-gold">예시 사연</p>
              <ul className="mt-2 flex flex-col gap-1.5 text-[0.9rem] leading-[1.6] text-ivory">
                {EXAMPLE_STORY.map((s) => (
                  <li key={s} className="flex gap-2">
                    <span aria-hidden className="text-thread">·</span>
                    <span className="min-w-0">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div role="tablist" aria-label="결과 구성" className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-1">
              {TABS.map((x, k) => (
                <button
                  key={x.id}
                  type="button"
                  role="tab"
                  aria-selected={k === i}
                  onClick={() => setI(k)}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-[0.92rem] transition-colors ${
                    k === i ? "border-burgundy bg-burgundy text-[#fbf7f2]" : "border-gold-dim bg-ink-soft text-ivory"
                  }`}
                >
                  <span>{x.label}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] ${k === i ? "bg-white/15" : x.free ? "bg-[#e9efe6] text-[#3f5b3a]" : "bg-[#f1e6e9] text-burgundy"}`}>
                    {x.free ? "무료 일부" : "유료"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <article role="tabpanel" className="shadow-paper min-w-0 rounded-[22px] border border-gold-dim bg-ink-soft px-6 py-7 md:px-10 md:py-9">
            <p className="flex flex-wrap items-center gap-2 text-[0.74rem] tracking-[0.1em] text-gold">
              <span>{t.label}</span>
              <span className="rounded-full border border-gold-dim px-2 py-0.5 tracking-normal text-ivory-dim">가상 사연 예시</span>
              <span className={`rounded-full px-2 py-0.5 tracking-normal ${t.free ? "bg-[#e9efe6] text-[#3f5b3a]" : "bg-[#f1e6e9] text-burgundy"}`}>
                {t.free ? "무료 미리보기에 일부 포함" : "전체 구성에 포함"}
              </span>
            </p>
            <h3 className="font-display font-bold mt-4 text-[1.3rem] leading-[1.45] text-ivory md:text-[1.5rem]">{t.title}</h3>
            <div className="mt-3 flex max-w-[44rem] flex-col gap-3 text-[1rem] leading-[1.8] text-ivory">
              {t.body.map((b) => (
                <p key={b}>{b}</p>
              ))}
            </div>
            {t.list && (
              <dl className="mt-5 grid max-w-[44rem] gap-2">
                {t.list.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[5.2rem_1fr] gap-3 rounded-xl bg-ink px-4 py-3 text-[0.94rem] leading-[1.65]">
                    <dt className="font-semibold text-burgundy">{k}</dt>
                    <dd className="min-w-0 text-ivory">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-5 border-t border-gold-dim pt-4 text-[0.88rem] leading-[1.7] text-ivory-dim">
              <b className="font-semibold text-ivory">언제 쓰나요</b> · {t.when}
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
