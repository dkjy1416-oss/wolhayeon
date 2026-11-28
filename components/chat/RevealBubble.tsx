"use client";

/**
 * 11/28 (경쟁사 비교): 근거 대화를 카톡 말풍선으로 보여 주고, 누르면 해석이 펼쳐짐.
 * 해석은 '대화에서 보이는 가능성' — 단정하지 않는다.
 */
import { useState } from "react";

export default function RevealBubble({ quote, meaning, who }: { quote: string; meaning: string; who: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 rounded-2xl bg-[#b2c7da]/90 px-3.5 py-3.5">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-white/70 text-[0.72rem] font-bold text-[#3b4a5a]">{who.slice(0, 1)}</span>
        <div className="min-w-0">
          <p className="text-[0.72rem] text-[#3b4a5a]">{who}</p>
          <p className="mt-0.5 inline-block rounded-2xl rounded-tl-md bg-white px-3.5 py-2 text-[0.9rem] leading-[1.6] text-[#1a1215]">{quote}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`mt-3 w-full rounded-xl px-3.5 py-2.5 text-left text-[0.86rem] leading-[1.75] transition-colors ${open ? "bg-[#1a1215]/90 text-ivory" : "border border-dashed border-[#3b4a5a]/50 bg-white/40 text-[#3b4a5a]"}`}
      >
        {open ? (
          <>
            <span className="mb-1 block text-[0.72rem] text-[#e46b8a]">월화가 읽은 가능성</span>
            {meaning}
          </>
        ) : (
          "눌러서 월화의 해석 보기 ›"
        )}
      </button>
    </div>
  );
}
