"use client";

/**
 * 11/17 운영자 요청 — "최근 한 달간 N명" 숫자가 촤라락 굴러가며 눈에 띄게.
 * 자리마다 0~9 세로 띠를 굴려 실제 숫자에서 멈춘다 (숫자는 서버가 준 실제 방문자 수 그대로).
 * 움직임 줄이기 설정이면 바로 최종 숫자.
 */
import { useEffect, useRef, useState } from "react";

export default function RollingCount({ value, className = "" }: { value: number; className?: string }) {
  const text = value.toLocaleString();
  const ref = useRef<HTMLSpanElement>(null);
  const [go, setGo] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
    ) {
      setGo(true);
      return;
    }
    /* 11/27 운영자 요청: 화면에 들어온 순간 촤라락 보이게.
       이전엔 1.2초 뒤 무조건 멈춤 → 아래로 내려왔을 땐 이미 끝나 있었음.
       이제 관찰이 한 번이라도 응답하면 화면에 들어올 때까지 기다리고,
       관찰이 아예 응답하지 않는 앱 안 브라우저만 1.2초 뒤 실제 숫자로. */
    let answered = false;
    const io = new IntersectionObserver(
      ([e]) => {
        answered = true;
        if (e.isIntersecting) {
          window.setTimeout(() => setGo(true), 150);
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    const fb = window.setTimeout(() => {
      if (!answered) setGo(true);
    }, 1200);
    return () => {
      io.disconnect();
      window.clearTimeout(fb);
    };
  }, []);

  let digitIdx = 0;
  const digits = text.replace(/\D/g, "").length;

  return (
    <span ref={ref} className={`inline-flex items-baseline tabular-nums ${className}`} aria-label={text}>
      {text.split("").map((ch, i) => {
        if (!/\d/.test(ch)) {
          return (
            <span key={i} aria-hidden>
              {ch}
            </span>
          );
        }
        const n = Number(ch);
        /* 앞자리일수록 한 바퀴 더 돌고 늦게 멈춤 → 끝자리부터 차례로 착 */
        const pos = digitIdx++;
        const turns = 2 + (digits - pos);
        const steps = turns * 10 + n;
        const dur = 1.1 + (digits - pos) * 0.18;
        return (
          <span key={i} aria-hidden className="relative inline-block h-[1.15em] overflow-hidden align-bottom leading-[1.15em]">
            <span
              className="block"
              style={{
                transform: go ? `translateY(-${steps * 1.15}em)` : "translateY(0)",
                transition: go ? `transform ${dur}s cubic-bezier(0.16, 1, 0.3, 1)` : "none",
              }}
            >
              {Array.from({ length: steps + 1 }).map((_, k) => (
                <span key={k} className="block h-[1.15em]">
                  {k % 10}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
