/**
 * 책 소개 페이지(/book)에서 고른 상품을 신청서 → 미리보기 → 결제까지 기억 (클라이언트 전용).
 * 저장이 막힌 브라우저에서도 동작은 그대로(메시지 기본).
 */
export type WantProduct = "book" | "bundle";

const KEY = "wh_want_v1";
const TTL_MS = 3 * 24 * 60 * 60 * 1000;

export function isWantProduct(v: unknown): v is WantProduct {
  return v === "book" || v === "bundle";
}

export function saveWant(p: WantProduct): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ p, at: Date.now() }));
  } catch {
    /* 저장 불가 시 무시 */
  }
}

export function loadWant(): WantProduct | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { p?: unknown; at?: unknown };
    if (!isWantProduct(v.p) || typeof v.at !== "number" || Date.now() - v.at > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return v.p;
  } catch {
    return null;
  }
}

export function clearWant(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 무시 */
  }
}
