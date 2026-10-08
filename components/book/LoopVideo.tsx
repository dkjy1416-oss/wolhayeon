"use client";

/** 화면에 보일 때만 재생하는 반복 영상 (데이터·배터리 절약). sound=true 면 눌러서 소리 켜기 */
import { useEffect, useId, useRef, useState } from "react";
import { onFirstGesture } from "@/lib/video-unlock";

const EVT = "wh-loopvideo-unmute";

export default function LoopVideo({
  src,
  poster,
  className,
  label,
  sound = false,
  soundTop = "top-3",
  fit = "cover",
}: {
  src: string;
  poster?: string;
  className?: string;
  label?: string;
  sound?: boolean;
  /** 소리 버튼 세로 위치 (고정 헤더와 겹치지 않게) */
  soundTop?: string;
  /** contain: 9:16 원본을 자르지 않고 전체를 보여 줌 (빈 곳은 흐린 포스터로 채움) */
  fit?: "cover" | "contain";
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
    let visible = false;
    const play = () => {
      v.play().catch(() => undefined);
    };
    /* 화면에 들어오기 조금 전(약 한 화면 아래)부터 미리 받기 시작 → 스크롤해 오면 바로 움직임 */
    const near = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && v.preload !== "auto") {
          v.preload = "auto";
          if (v.readyState === 0) v.load();
          near.disconnect();
        }
      },
      { rootMargin: "100% 0px 100% 0px" }
    );
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) play();
        else {
          v.pause();
          if (!v.muted) {
            v.muted = true;
            setMuted(true);
          }
        }
      },
      { threshold: 0.2 }
    );
    near.observe(v);
    io.observe(v);
    /* 자동재생이 막힌 폰(저전력 모드 등): 첫 터치·스크롤 때 보이는 영상 다시 재생 */
    const off = onFirstGesture(() => {
      if (visible) play();
    });
    return () => {
      near.disconnect();
      io.disconnect();
      off();
    };
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
  if (fit === "contain") {
    return (
      <div className={`relative overflow-hidden bg-ink ${className ?? ""}`}>
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-125 object-cover opacity-55 blur-2xl"
          />
        )}
        <video
          ref={ref}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          preload="none"
          aria-label={label}
          className="relative block h-full w-full object-contain"
        />
      </div>
    );
  }
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
