"use client";

/**
 * 첫 화면 배경 — 운영자 원본 영상 여러 개를 천천히 교차 재생 (무음).
 * 지금 보이는 영상만 재생하고 나머지는 멈춰 둔다 (데이터·배터리 절약).
 */
import { useEffect, useRef, useState } from "react";

export type MontageClip = { src: string; poster: string; position?: string };

export default function HeroMontage({ clips, interval = 4600 }: { clips: MontageClip[]; interval?: number }) {
  const [idx, setIdx] = useState(0);
  const refs = useRef<Array<HTMLVideoElement | null>>([]);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || clips.length < 2) return;
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") setIdx((i) => (i + 1) % clips.length);
    }, interval);
    return () => window.clearInterval(t);
  }, [clips.length, interval]);

  useEffect(() => {
    refs.current.forEach((v, i) => {
      if (!v) return;
      if (i === idx) {
        v.currentTime = 0;
        v.play().catch(() => undefined);
      } else if (i === (idx + 1) % clips.length) {
        /* 다음 영상은 미리 조금 받아 둔다 */
        if (v.preload !== "auto") v.preload = "auto";
        window.setTimeout(() => v.pause(), 1200);
      } else {
        v.pause();
      }
    });
  }, [idx, clips.length]);

  return (
    <>
      {clips.map((c, i) => (
        <video
          key={c.src}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-out ${
            c.position ?? "object-[50%_20%]"
          } ${i === idx ? "opacity-100" : "opacity-0"}`}
          src={c.src}
          poster={c.poster}
          muted
          loop
          playsInline
          autoPlay={i === 0}
          preload={i === 0 ? "auto" : "none"}
        />
      ))}
    </>
  );
}
