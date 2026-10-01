"use client";

/** 책 소개 페이지 — 지금 내 상황을 고르면 책 속 그 장의 핵심이 바로 펼쳐짐 */
import Link from "next/link";
import { useRef, useState } from "react";
import type { BookSituation } from "@/lib/book/book-situations";

const TONE: Record<BookSituation["verdict"][number]["tone"], string> = {
  no: "bg-[#6d1f2c] text-[#fff7ee]",
  wait: "bg-[#e6d3ad] text-[#3d2f18]",
  ok: "border border-[#4d6b4f] bg-[#eef3ea] text-[#3e5c40]",
};

export default function SituationPicker({
  data,
  bookHref,
  bundleHref,
  bookPrice,
  bundlePrice,
}: {
  data: BookSituation[];
  bookHref: string;
  bundleHref: string;
  bookPrice: number;
  bundlePrice: number;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const s = data.find((x) => x.n === sel) ?? null;

  const pick = (n: number) => {
    setSel(n);
    requestAnimationFrame(() => {
      const el = cardRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    });
  };

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2">
        {data.map((x) => (
          <button
            key={x.n}
            type="button"
            onClick={() => pick(x.n)}
            aria-pressed={sel === x.n}
            className={`rounded-full px-3.5 py-2 text-[0.84rem] transition-colors ${
              sel === x.n ? "bg-gold text-ink" : "border border-gold-dim/40 bg-ink-soft/60 text-ivory"
            }`}
          >
            {x.pick}
          </button>
        ))}
      </div>

      <div ref={cardRef} className="scroll-mt-24">
        {s ? (
          <div key={s.n} className="fade-in mt-6 overflow-hidden rounded-2xl bg-[#f5efe3] text-[#2a1f1a]">
            <div className="border-b border-[#2a1f1a]/10 px-5 py-3">
              <p className="text-[0.7rem] tracking-[0.1em] text-[#8a6a33]">📖 당신이 먼저 펼칠 장 · PART 03 · {s.n}장</p>
              <p className="font-display mt-1 text-[1.12rem] leading-[1.5]">{s.title}</p>
            </div>
            <div className="space-y-3.5 px-5 py-4">
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[0.76rem] text-[#5a4a3c]">
                {s.verdict.map((v, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[0.72rem] ${TONE[v.tone]}`}>{v.label}</span>
                    {v.note && <span>{v.note}</span>}
                  </span>
                ))}
              </p>
              <p className="text-[0.9rem] leading-[1.85]">{s.lead}</p>
              {s.wait && (
                <div className="rounded-xl bg-[#ece3d2] px-4 py-3">
                  <p className="text-[0.68rem] tracking-[0.1em] text-[#6d1f2c]">얼마나, 무엇을</p>
                  <p className="mt-1 text-[0.84rem] leading-[1.8]">{s.wait}</p>
                </div>
              )}
              {s.bad && (
                <div>
                  <p className="text-[0.84rem] leading-[1.75] text-[#7a5a5a] line-through decoration-[#6d1f2c]/50">✕ {s.bad.text}</p>
                  <p className="mt-0.5 text-[0.76rem] leading-[1.7] text-[#6d1f2c]">{s.bad.why}</p>
                </div>
              )}
              {s.good && (
                <p className="rounded-xl bg-[#eef3ea] px-3.5 py-2.5 text-[0.86rem] leading-[1.75]">○ {s.good}</p>
              )}
              {s.dont.length > 0 && (
                <div>
                  <p className="text-[0.7rem] tracking-[0.1em] text-[#6d1f2c]">하지 말 것</p>
                  <ul className="mt-1 space-y-1">
                    {s.dont.slice(0, 3).map((d) => (
                      <li key={d} className="text-[0.82rem] leading-[1.7] text-[#5a4a3c]">
                        · {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="border-t border-[#2a1f1a]/10 pt-3 text-[0.76rem] leading-[1.8] text-[#5a4a3c]">
                당신 책에서는 이 장에 <b className="text-[#6d1f2c]">‘○○ 님의 상황이에요’</b> 표시와 함께, 들려준 이야기에 맞춘
                설명·기다릴 날짜·보낼 문장이 더해져요.
              </p>
            </div>
            <div className="space-y-2 bg-[#efe6d3] px-5 py-4">
              <Link
                href={bookHref}
                className="flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.9rem] text-ivory"
              >
                이 장이 들어간 내 책 받기 · {bookPrice.toLocaleString()}원
              </Link>
              <Link href={bundleHref} className="block text-center text-[0.78rem] text-[#6d1f2c] underline underline-offset-4">
                메시지와 함께 받기 · {bundlePrice.toLocaleString()}원
              </Link>
            </div>
          </div>
        ) : (
          <p className="mt-5 text-center text-[0.8rem] text-ivory-dim/80">위에서 하나를 누르면, 책 속 그 장이 바로 펼쳐져요.</p>
        )}
      </div>
    </div>
  );
}
