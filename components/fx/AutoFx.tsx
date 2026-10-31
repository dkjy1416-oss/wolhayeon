"use client";

/**
 * 10/31: 페이지 안의 제목·이미지·카드에 스크롤 등장 효과를 한 번에 입힌다.
 * 대상: data-fx-root 안의 h1·h2·h3·p.lead·img·video·[data-fx]
 * 이미 다른 효과(reveal·fx-split·fx-word·fx-pop)가 걸린 요소와 고정 위치 요소는 건너뛴다.
 */
import { useEffect } from "react";

export default function AutoFx({ root = "[data-fx-root]" }: { root?: string }) {
  useEffect(() => {
    const host = document.querySelector(root);
    if (!host || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(host.querySelectorAll<HTMLElement>("h1, h2, h3, img, video, [data-fx]")).filter((el) => {
      if (el.closest(".reveal, .fx-split, .fx-pop, header, [data-no-fx]")) return false;
      const pos = getComputedStyle(el).position;
      if (pos === "fixed" || pos === "absolute") return false;
      const r = el.getBoundingClientRect();
      return r.top > window.innerHeight * 0.6; // 첫 화면에 보이는 것은 그대로 둠 (깜빡임 방지)
    });
    els.forEach((el) => el.classList.add(el.tagName === "IMG" || el.tagName === "VIDEO" ? "fx-auto-media" : "fx-auto"));
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [root]);
  return null;
}
