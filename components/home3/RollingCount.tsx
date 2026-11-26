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
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          /* 첫 화면이 그려진 뒤 굴리기 시작 */
          window.setTimeout(() => setGo(true), 250);
          io.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    /* 11/26: 앱 안 브라우저 등에서 관찰이 늦거나 안 되면 0,000 으로 비어 보임 → 1.2초 뒤에는 무조건 실제 숫자로 */
    const fb = window.setTimeout(() => setGo(true), 1200);
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
