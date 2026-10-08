"use client";

/**
 * 첫 화면 배경 — 운영자 원본 영상 여러 개를 천천히 교차 재생 (무음).
 * - 다음 영상은 지금 영상이 재생되기 시작한 뒤에만 미리 받아 둔다 (첫 영상 로딩을 방해하지 않게)
 * - 다음 영상이 실제로 재생 가능해졌을 때만 넘어간다 → 느린 폰에서 정지 화면으로 바뀌는 일 없음
 * - 자동재생이 막힌 폰(저전력 모드 등)은 첫 터치 때 다시 재생
 */
import { useEffect, useRef, useState } from "react";
import { onFirstGesture, tryPlay } from "@/lib/video-unlock";

export type MontageClip = { src: string; poster: string; position?: string };

export default function HeroMontage({ clips, interval = 4600 }: { clips: MontageClip[]; interval?: number }) {
  const [idx, setIdx] = useState(0);
  const idxRef = useRef(0);
  const refs = useRef<Array<HTMLVideoElement | null>>([]);
  const [playing, setPlaying] = useState(false);

  /* 첫 영상 재생 (막히면 첫 터치 때 재시도) */
  useEffect(() => {
    let off: () => void = () => undefined;
    let alive = true;
    tryPlay(refs.current[0]).then((ok) => {
      if (!alive) return;
      if (ok) setPlaying(true);
      else
        off = onFirstGesture(() => {
          void tryPlay(refs.current[idxRef.current]).then((p) => p && setPlaying(true));
        });
    });
    return () => {
      alive = false;
      off();
    };
  }, []);

  /* 지금 영상이 실제로 돌기 시작하면 → 다음 영상을 숨긴 채 미리 재생해 둔다 (아이폰은 재생해야만 받아 둠) */
  useEffect(() => {
    if (!playing || clips.length < 2) return;
    const next = refs.current[(idx + 1) % clips.length];
    if (!next) return;
    const t = window.setTimeout(() => {
      next.preload = "auto";
      void tryPlay(next);
    }, 900);
    return () => window.clearTimeout(t);
  }, [idx, playing, clips.length]);

  /* 넘기기: 다음 영상이 준비됐을 때만 */
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || clips.length < 2) return;
    let last = Date.now();
    const t = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - last < interval) return;
      const cur = idxRef.current;
      const ni = (cur + 1) % clips.length;
      const next = refs.current[ni];
      if (!next || next.readyState < 3 || next.paused) return; // 아직 준비 안 됨 → 지금 영상 계속
      last = Date.now();
      idxRef.current = ni;
      setIdx(ni);
      const prev = refs.current[cur];
      /* 화면이 다 바뀐 뒤 이전 영상은 멈춤 (데이터·배터리 절약) */
      window.setTimeout(() => {
        if (idxRef.current !== cur && prev) prev.pause();
      }, 1600);
    }, 400);
    return () => window.clearInterval(t);
  }, [clips.length, interval]);

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
          poster={i === 0 ? c.poster : undefined}
          muted
          loop
          playsInline
          autoPlay={i === 0}
          preload={i === 0 ? "auto" : "none"}
          onPlaying={i === 0 ? () => setPlaying(true) : undefined}
        />
      ))}
    </>
  );
}
