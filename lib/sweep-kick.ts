/**
 * 사이트에 요청이 들어올 때 멈춘 주문 자동 재처리를 가볍게 깨운다 (서버 전용).
 * 같은 서버 인스턴스에서는 90초에 한 번만 호출하고, 실패해도 원래 요청에 영향 없음.
 */
import "server-only";
import { sanitizeSiteUrl } from "@/lib/delivery-rules";

let lastKick = 0;

export async function kickSweep(): Promise<void> {
  const now = Date.now();
  if (now - lastKick < 90_000) return;
  lastKick = now;
  const site = sanitizeSiteUrl(process.env.SITE_URL);
  if (!site) return;
  try {
    await fetch(`${site}/api/internal/sweep`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    /* 무시 — 다음 요청 때 다시 */
  }
}
