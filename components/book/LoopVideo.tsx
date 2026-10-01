"use client";

/** 화면에 보일 때만 재생하는 반복 영상 (데이터·배터리 절약). sound=true 면 눌러서 소리 켜기 */
import { useEffect, useId, useRef, useState } from "react";

const EVT = "wh-loopvideo-unmute";

export default function LoopVideo({
  src,
  poster,
  className,
  label,
  sound = false,
  soundTop = "top-3",
}: {
  src: string;
  poster?: string;
  className?: string;
  label?: string;
  sound?: boolean;
  /** 소리 버튼 세로 위치 (고정 헤더와 겹치지 않게) */
  soundTop?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const id = useId();
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (typeof IntersectionObserver === "undefined") {
      v.play().catch(() => undefined);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => undefined);
        else {
          v.pause();
          if (!v.muted) {
            v.muted = true;
            setMuted(true);
          }
        }
      },
      { threshold: 0.25 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  /* 다른 영상 소리를 켜면 이 영상은 음소거 */
  useEffect(() => {
    if (!sound) return;
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail === id) return;
      const v = ref.current;
      if (v && !v.muted) {
        v.muted = true;
        setMuted(true);
      }
    };
    window.addEventListener(EVT, onOther);
    return () => window.removeEventListener(EVT, onOther);
  }, [sound, id]);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    setMuted(next);
    if (!next) {
      window.dispatchEvent(new CustomEvent(EVT, { detail: id }));
      v.play().catch(() => undefined);
    }
  };

  const video = (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
      className={className}
      onClick={sound ? toggle : undefined}
    />
  );
  if (!sound) return video;
  return (
    <div className="relative">
      {video}
      <button
        type="button"
        onClick={toggle}
        aria-label={muted ? "소리 켜기" : "소리 끄기"}
        className={`absolute right-3 ${soundTop} z-10 flex h-9 items-center gap-1.5 rounded-full bg-ink/70 px-3 text-[0.74rem] text-ivory backdrop-blur`}
      >
        <span aria-hidden>{muted ? "🔇" : "🔊"}</span>
        {muted ? "소리 켜기" : "소리 끄기"}
      </button>
    </div>
  );
}
