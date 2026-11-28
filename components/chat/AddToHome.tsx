"use client";

/**
 * 11/28: 결과 화면 '홈 화면에 추가' 안내 — 30일 동안 다시 열어 보기 쉽게.
 * 앱 설치(매니페스트) 없이, 지금 이 결과 주소를 바로가기로 저장하게 안내한다.
 */
import { useEffect, useState } from "react";

type Env = "ios" | "android" | "inapp" | null;

function detect(): Env {
  const ua = navigator.userAgent;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
  if (standalone) return null;
  if (/KAKAOTALK|Instagram|FBAN|FBAV|NAVER\(inapp|Line\//i.test(ua)) return "inapp";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return null;
}

const KEY = "wolhayeon_a2hs_closed";

export default function AddToHome() {
  const [env, setEnv] = useState<Env>(null);
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {
      /* 저장소를 못 써도 안내는 보여 줌 */
    }
    setEnv(detect());
  }, []);
  if (!env) return null;
  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* 무시 */
    }
    setEnv(null);
  };
  const how =
    env === "ios"
      ? "아래 공유 버튼(□↑) → '홈 화면에 추가'"
      : env === "android"
        ? "오른쪽 위 ⋮ 메뉴 → '홈 화면에 추가'"
        : "오른쪽 위 메뉴에서 '다른 브라우저로 열기' 후 홈 화면에 추가";
  return (
    <div className="mx-auto mb-6 flex max-w-[620px] items-start gap-3 rounded-2xl border border-gold/25 bg-white/[0.04] px-4 py-3">
      <span className="mt-0.5 text-[1.1rem]">🌙</span>
      <div className="flex-1">
        <p className="text-[0.86rem] font-semibold text-ivory">홈 화면에 추가해 두면 30일 동안 바로 다시 열 수 있어요</p>
        <p className="mt-0.5 text-[0.78rem] leading-[1.6] text-ivory-dim">{how}</p>
      </div>
      <button type="button" onClick={close} aria-label="닫기" className="px-1 text-[1rem] text-ivory-dim">
        ✕
      </button>
    </div>
  );
}
