"use client";

/** 실제 책 페이지가 한 장씩 넘어가는 뷰어 (자동 넘김 + 탭/스와이프) */
import { useEffect, useRef, useState } from "react";

export default function PageFlipper({
  pages,
  intervalMs = 3400,
}: {
  pages: Array<{ src: string; caption: string }>;
  intervalMs?: number;
}) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const visible = useRef(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      if (!visible.current) return;
      setDir(1);
      setI((x) => (x + 1) % pages.length);
    }, intervalMs);
    return () => clearInterval(t);
  }, [paused, intervalMs, pages.length]);

  const go = (d: 1 | -1) => {
    setPaused(true);
    setDir(d);
    setI((x) => (x + d + pages.length) % pages.length);
  };

  const p = pages[i];
  return (
    <div>
      <div
        ref={boxRef}
        className="relative mx-auto aspect-[148/210] w-[84%] [perspective:1400px]"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
      >
        {/* 뒤에 쌓인 페이지 느낌 */}
        <div aria-hidden className="absolute inset-0 translate-x-2 translate-y-2 rounded-md bg-[#e9e0cf] shadow-[0_18px_50px_rgba(0,0,0,0.55)]" />
        <div aria-hidden className="absolute inset-0 translate-x-1 translate-y-1 rounded-md bg-[#efe7d8]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={i}
          src={p.src}
          alt={p.caption}
          className={`absolute inset-0 h-full w-full rounded-md object-cover shadow-[0_10px_30px_rgba(0,0,0,0.35)] ${
            dir === 1 ? "bk-turn-next" : "bk-turn-prev"
          }`}
        />
        <button
          type="button"
          aria-label="이전 페이지"
          onClick={() => go(-1)}
          className="absolute inset-y-0 left-0 w-1/3"
        />
        <button
          type="button"
          aria-label="다음 페이지"
          onClick={() => go(1)}
          className="absolute inset-y-0 right-0 w-1/3"
        />
      </div>
      <p className="mt-5 min-h-[1.5rem] text-center text-[0.84rem] text-ivory">{p.caption}</p>
      <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
        {pages.map((_, k) => (
          <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-4 bg-gold" : "w-1.5 bg-gold-dim/50"}`} />
        ))}
      </div>
      {/* 미리 불러오기 */}
      <div aria-hidden className="hidden">
        {pages.map((x) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={x.src} src={x.src} alt="" loading="lazy" />
        ))}
      </div>
    </div>
  );
}
