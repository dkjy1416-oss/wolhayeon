"use client";

/**
 * 첫 터치/스크롤 때 한 번 알려 주는 신호.
 * 아이폰 저전력 모드·데이터 절약 모드에서는 자동재생이 막혀 정지 화면만 보이는데,
 * 손님이 화면을 한 번 만지면 그때 다시 재생을 시도할 수 있다.
 */
const subs = new Set<() => void>();
let armed = false;
let fired = false;

function fire() {
  if (fired) return;
  fired = true;
  ["touchstart", "pointerdown", "scroll", "keydown"].forEach((e) =>
    window.removeEventListener(e, fire, true)
  );
  subs.forEach((f) => f());
}

export function onFirstGesture(cb: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  if (fired) {
    cb();
    return () => undefined;
  }
  subs.add(cb);
  if (!armed) {
    armed = true;
    ["touchstart", "pointerdown", "scroll", "keydown"].forEach((e) =>
      window.addEventListener(e, fire, { capture: true, passive: true })
    );
  }
  return () => {
    subs.delete(cb);
  };
}

/** 재생 시도 — 막히면 조용히 넘어가고 false */
export async function tryPlay(v: HTMLVideoElement | null | undefined): Promise<boolean> {
  if (!v) return false;
  v.muted = true;
  try {
    await v.play();
    return true;
  } catch {
    return false;
  }
}
