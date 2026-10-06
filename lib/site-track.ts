"use client";

/**
 * 자체 방문·퍼널 기록 (관리자 마케팅 대시보드용)
 * - 쿠키·IP 없이 브라우저 무작위 ID(localStorage)만 사용
 * - 첫 유입(UTM·유입 사이트)을 기억해 이후 신청·결제와 연결
 * - 실패해도 화면 동작에 영향 없음
 */

const VID_KEY = "wh_vid";
const FT_KEY = "wh_ft";

interface FirstTouch {
  s?: string; // utm_source
  m?: string; // utm_medium
  c?: string; // utm_campaign
  r?: string; // first referrer host
}

function safeGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function safeSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* noop */
  }
}

function visitorId(): string {
  let v = safeGet(VID_KEY);
  if (!v) {
    v =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    safeSet(VID_KEY, v);
  }
  return v;
}

function refHost(): string | null {
  try {
    if (!document.referrer) return null;
    const h = new URL(document.referrer).hostname.replace(/^www\./, "");
    return h && h !== location.hostname.replace(/^www\./, "") ? h : null;
  } catch {
    return null;
  }
}

function firstTouch(): FirstTouch {
  const saved = safeGet(FT_KEY);
  const q = new URLSearchParams(location.search);
  const cur: FirstTouch = {
    s: q.get("utm_source") ?? undefined,
    m: q.get("utm_medium") ?? undefined,
    c: q.get("utm_campaign") ?? undefined,
    r: refHost() ?? undefined,
  };
  if (saved) {
    try {
      const ft = JSON.parse(saved) as FirstTouch;
      /* 새 캠페인 링크로 다시 들어오면 그 캠페인을 기준으로 갱신 */
      if (cur.s && cur.s !== ft.s) {
        safeSet(FT_KEY, JSON.stringify(cur));
        return cur;
      }
      return ft;
    } catch {
      /* fallthrough */
    }
  }
  safeSet(FT_KEY, JSON.stringify(cur));
  return cur;
}

export function sendSiteEvent(event: string, props?: Record<string, string>): void {
  try {
    if (typeof window === "undefined") return;
    if (location.pathname.startsWith("/admin")) return;
    const ft = firstTouch();
    const body = JSON.stringify({
      vid: visitorId(),
      ev: event,
      /* 질문 단계 기록은 경로 뒤에 단계 이름을 붙여 저장 (예: /apply#story) */
      path: props?.step ? `${location.pathname}#${props.step}` : location.pathname,
      ref: event === "view" ? refHost() : null,
      us: ft.s ?? null,
      um: ft.m ?? null,
      uc: ft.c ?? null,
      fr: ft.r ?? null,
      dev: window.innerWidth < 768 ? "mobile" : "desktop",
      order: props?.order ?? null,
    });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/track", blob)) {
      fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    }
  } catch {
    /* noop */
  }
}
