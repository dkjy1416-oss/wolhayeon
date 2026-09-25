/**
 * 미결제 리마인드 메일 전용 접근 토큰 (서버 전용).
 *
 * - 메일 링크는 며칠 뒤에 열릴 수 있으므로 14일 유효.
 * - 이 토큰 자체로는 미리보기에 접근할 수 없고,
 *   /api/remind/open 에서 검증 후 30분짜리 continue 토큰으로
 *   교환되어 리다이렉트된다 (기존 미리보기 검증 로직 무변경).
 * - 다른 토큰들과 HMAC 도메인 분리, 개인정보 미포함.
 */
import "server-only";
import { createHmac, createHash, timingSafeEqual } from "crypto";

const DOMAIN = "wolhayeon-remind-v1";
const TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14일

function getSecret(): string | null {
  const s = process.env.RITUAL_ADMIN_SECRET?.trim();
  return s && s.length >= 16 ? s : null;
}

function sign(orderNumber: string, exp: number, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${DOMAIN}|${orderNumber}|${exp}`)
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function createRemindToken(orderNumber: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const exp = Date.now() + TTL_MS;
  return `${exp}.${sign(orderNumber, exp, secret)}`;
}

export function verifyRemindToken(
  orderNumber: string,
  token: unknown
): boolean {
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
