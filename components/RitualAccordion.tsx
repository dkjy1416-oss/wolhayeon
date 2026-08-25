"use client";

import { useState } from "react";
import { RITUAL_DELIVERABLES } from "@/lib/ritual-deliverables";

/**
 * 9가지 이야기 + BONUS 아코디언.
 * 한 번에 하나만 열리며, 250ms grid-rows transition으로 부드럽게 펼쳐집니다.
 * compact: /apply/ready처럼 좁은 카드 안에서 쓰는 축소 버전.
 */
export default function RitualAccordion({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [openNo, setOpenNo] = useState<string | null>(null);

  return (
    <ul className={compact ? "flex flex-col gap-2" : "flex flex-col gap-3"}>
      {RITUAL_DELIVERABLES.map((item) => {
        const open = openNo === item.no;
        return (
          <li key={item.no}>
            <div
              className={`rounded-xl border transition-colors ${
                item.bonus
                  ? open
                    ? "border-gold/60 bg-gold/[0.06]"
                    : "border-gold/40 bg-gold/[0.04]"
                  : open
                    ? "border-gold-dim/50 bg-ivory/[0.03]"
                    : "border-gold-dim/25 bg-transparent"
              }`}
            >
              {/* 항목 전체가 터치 영역 */}
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenNo(open ? null : item.no)}
                className={`flex w-full items-center gap-4 text-left ${
                  compact ? "px-4 py-3.5" : "px-5 py-4"
                }`}
              >
                <span
                  className={`font-display shrink-0 ${
                    item.bonus
                      ? "text-[0.62rem] tracking-[0.2em] text-gold"
                      : "text-sm text-gold/80"
                  }`}
                >
                  {item.no}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-ivory ${
                      compact ? "text-[0.88rem]" : "text-[0.95rem]"
                    }`}
                  >
                    {item.title}
                  </span>
                  <span
                    className={`mt-0.5 block font-light text-ivory-dim/80 ${
                      compact ? "text-[0.75rem]" : "text-[0.8rem]"
                    }`}
                  >
                    {item.short}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={`shrink-0 text-lg leading-none ${
                    item.bonus ? "text-gold" : "text-gold/70"
                  }`}
                >
                  {open ? "−" : "+"}
                </span>
              </button>

              {/* 펼침 영역 — grid-rows 0fr→1fr 250ms */}
              <div
                className={`grid transition-[grid-template-rows] duration-250 ease-out ${
                  open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div
                    className={
                      compact ? "px-4 pb-4 pt-0.5" : "px-5 pb-5 pt-0.5"
                    }
                  >
                    <p
                      className={`font-light leading-[1.9] text-ivory-dim ${
                        compact ? "text-[0.82rem]" : "text-[0.88rem]"
                      }`}
                    >
                      {item.detail}
                    </p>
                    {item.note && (
                      <p
                        className={`mt-3 text-gold/80 ${
                          compact ? "text-[0.72rem]" : "text-[0.75rem]"
                        }`}
                      >
                        {item.note}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
