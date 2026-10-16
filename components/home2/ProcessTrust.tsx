/** 07. 이용 과정과 신뢰 — 실제 운영 방식대로 (AI 작성 · 자동 점검 · 실시간 상담 아님) */
import { STEPS } from "./content";
import { HOW_IT_WORKS } from "@/lib/service-facts";

export default function ProcessTrust() {
  return (
    <section className="px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1120px]">
        <p className="text-[0.8rem] tracking-[0.14em] text-gold">이용 과정</p>
        <h2 className="font-display font-bold mt-2 text-[1.55rem] leading-[1.45] text-ivory md:text-[2rem]">사연을 쓰고, 무료로 먼저 읽어요</h2>
        <ol className="mt-8 grid gap-3 md:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="rounded-2xl border border-gold-dim bg-ink-soft px-5 py-5">
              <p className="text-[0.8rem] font-semibold text-burgundy">0{i + 1}</p>
              <p className="font-display mt-1 text-[1.12rem] text-ivory">{t}</p>
              <p className="mt-2 text-[0.9rem] leading-[1.7] text-ivory-dim">{d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-5 rounded-2xl bg-[#efe7df] px-5 py-4">
          <p className="text-[0.84rem] font-semibold text-ivory">어떻게 만들어지나요</p>
          <ul className="mt-1.5 flex flex-col gap-1 text-[0.88rem] leading-[1.7] text-ivory-dim">
            {HOW_IT_WORKS.map((h) => (
              <li key={h}>· {h}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
