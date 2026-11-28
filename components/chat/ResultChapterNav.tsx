"use client";

/**
 * 11/28 (경쟁사 비교): 긴 리포트 위에 따라다니는 목차 칩 — 누르면 그 장으로 이동.
 * 각 장 제목(.fx-kicker)을 화면에서 찾아 자동으로 만든다.
 */
import { useEffect, useState } from "react";

const SHORT: [RegExp, string][] = [
  [/총평/, "총평"],
  [/온도$/, "온도"],
  [/균형/, "균형"],
  [/달라진/, "전환점"],
  [/마음/, "마음 가능성"],
  [/온도차/, "말과 행동"],
  [/신호/, "신호"],
  [/흘러갈/, "흐름"],
  [/잘하고/, "내 강점"],
  [/습관/, "말 습관"],
  [/안 되는/, "피할 말"],
  [/다음에 보낼/, "보낼 말"],
  [/반응별/, "반응별"],
  [/실천/, "계획"],
];

export default function ResultChapterNav() {
  const [items, setItems] = useState<{ id: string; label: string }[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const heads = Array.from(document.querySelectorAll<HTMLElement>("article[data-chat-result] .fx-kicker"));
    const list = heads.map((h, i) => {
      const id = `ch-${i}`;
      const box = (h.closest("section") as HTMLElement | null) ?? h;
      box.id = id;
      box.style.scrollMarginTop = "64px";
      const t = h.textContent?.trim() ?? "";
      return { id, label: SHORT.find(([r]) => r.test(t))?.[1] ?? t.slice(0, 6) };
    });
    setItems(list);
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (es) => {
        const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (v) setActive(v.target.id);
      },
      { rootMargin: "-70px 0px -60% 0px" }
    );
    list.forEach((x) => {
      const el = document.getElementById(x.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    document.getElementById(`chip-${active}`)?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [active]);

  if (items.length < 4) return null;
  return (
    <nav className="sticky top-0 z-30 -mx-5 mt-5 border-b border-white/5 bg-[#0e0b0d]/90 px-5 py-2.5 backdrop-blur" aria-label="리포트 목차">
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((x) => (
          <button
            key={x.id}
            id={`chip-${x.id}`}
            type="button"
            onClick={() => document.getElementById(x.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[0.76rem] ${active === x.id ? "border-[#e46b8a] bg-[#e46b8a]/15 text-ivory" : "border-white/15 text-ivory-dim"}`}
          >
            {x.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
