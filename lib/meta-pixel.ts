"use client";
/**
 * 메타 픽셀 (브라우저) — 11/20 운영자 요청
 * - 픽셀 ID 는 NEXT_PUBLIC_META_PIXEL_ID (없으면 아무것도 하지 않음)
 *   (11/20 픽셀 '월하연 thewolha.com' 생성 · Vercel Production 환경변수에 등록)
 * - 관리자 화면을 연 브라우저 · ?utm_source=selftest 로 들어온 브라우저는 영구 제외(wh_noads)
 *   단, ?px_test=1 로 들어오면 이 탭(세션)에서만 다시 켠다 (이벤트 테스트용)
 * - 같은 주문의 같은 이벤트는 새로고침해도 1번만 (localStorage)
 * - 개인정보(이름·이메일·사연)는 브라우저 이벤트에 절대 넣지 않는다
 */
type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    __whpx?: unknown[][];
  }
}

export const PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID || "").trim();
const BLOCK = "wh_noads";
const TEST = "wh_pxtest";

export function pixelBlocked(): boolean {
  try {
    if (sessionStorage.getItem(TEST) === "1") return false;
    return localStorage.getItem(BLOCK) === "1";
  } catch {
    return false;
  }
}
export function blockPixel() {
  try {
    localStorage.setItem(BLOCK, "1");
  } catch {
    /* noop */
  }
}
export function allowPixelThisSession() {
  try {
    sessionStorage.setItem(TEST, "1");
  } catch {
    /* noop */
  }
}

/** 메타 공식 스니펫과 같은 동작 — 스크립트를 넣고 init. 이미 있으면 그대로 */
export function loadPixel(): boolean {
  if (!PIXEL_ID || typeof window === "undefined" || pixelBlocked()) return false;
  if (window.fbq) return true;
  const n = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue!.push(args);
  } as Fbq;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  window.fbq = n;
  if (!window._fbq) window._fbq = n;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  window.fbq("init", PIXEL_ID);
  /* init 전에 쌓인 이벤트 보내기 */
  for (const a of window.__whpx ?? []) window.fbq(...a);
  window.__whpx = [];
  return true;
}

/**
 * 이벤트 1건. once 를 주면 그 키로 1번만 (예: `${order}_Lead`).
 * id 는 서버 전환 API 와 같은 event_id (중복 제거용).
 */
export function px(
  name: string,
  params: Record<string, unknown> = {},
  opt: { id?: string; once?: string; custom?: boolean; session?: boolean } = {}
) {
  if (!PIXEL_ID || typeof window === "undefined" || pixelBlocked()) return;
  if (opt.once) {
    const k = `wh_px:${opt.once}`;
    try {
      const store = opt.session ? sessionStorage : localStorage;
      if (store.getItem(k)) return;
      store.setItem(k, "1");
    } catch {
      /* 저장소가 막힌 브라우저 — 그냥 보낸다 */
    }
  }
  const args: unknown[] = [opt.custom ? "trackCustom" : "track", name, params];
  if (opt.id) args.push({ eventID: opt.id });
  if (window.fbq) window.fbq(...args);
  else (window.__whpx ??= []).push(args);
}
