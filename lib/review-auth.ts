/**
 * 후기 남기기 링크 전용 토큰 (서버 전용, 180일 유효, 다른 토큰과 HMAC 도메인 분리).
 */
import "server-only";
import { createHmac, createHash, timingSafeEqual } from "crypto";

const DOMAIN = "wolhayeon-review-v1";
const TTL_MS = 180 * 24 * 60 * 60 * 1000;

function getSecret(): string | null {
  const s = process.env.RITUAL_ADMIN_SECRET?.trim();
  return s && s.length >= 16 ? s : null;
}

function sign(orderNumber: string, exp: number, secret: string): string {
  return createHmac("sha256", secret).update(`${DOMAIN}|${orderNumber}|${exp}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function createReviewToken(orderNumber: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const exp = Date.now() + TTL_MS;
  return `${exp}.${sign(orderNumber, exp, secret)}`;
}

export function verifyReviewToken(orderNumber: string, token: unknown): boolean {
  const secret = getSecret();
  if (!secret || typeof token !== "string" || token.length > 96) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const exp = Number(token.slice(0, dot));
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  if (sig.length !== 64) return false;
  return safeEqual(sig, sign(orderNumber, exp, secret));
}

/** 후기 남기기 경로 (사이트 주소 없이) — 실패 시 null */
export function reviewPath(orderNumber: string): string | null {
  const t = createReviewToken(orderNumber);
  return t ? `/review?o=${encodeURIComponent(orderNumber)}&t=${encodeURIComponent(t)}` : null;
}
