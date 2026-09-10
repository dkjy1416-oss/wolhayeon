/**
 * CS 챗봇 본인확인 세션 토큰 + OTP 해시 (서버 전용).
 *
 * - CS 토큰: 이메일 OTP 인증을 통과한 주문에만 발급되는 30분 서명 토큰.
 *   도메인 분리("wolhayeon-cs-session-v1")로 관리자 세션·처리 토큰과
 *   상호 재사용 불가. 서명키(RITUAL_ADMIN_SECRET)는 클라이언트 미전달.
 * - OTP: 6자리, 평문 저장 금지 — 검증 레코드 id를 소금으로 한 HMAC 해시만
 *   저장하고 timingSafeEqual로 비교.
 */
import "server-only";
import {
  createHmac,
  createHash,
  timingSafeEqual,
  randomInt,
} from "crypto";

const DOMAIN = "wolhayeon-cs-session-v1";
const TTL_MS = 30 * 60 * 1000;

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

/** OTP 인증을 실제로 통과한 주문에 대해서만 호출할 것 */
export function createCsToken(orderNumber: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const exp = Date.now() + TTL_MS;
  return `${exp}.${sign(orderNumber, exp, secret)}`;
}

export function verifyCsToken(
  orderNumber: string,
  token: string | null | undefined
): boolean {
  const secret = getSecret();
  if (!secret || !token) return false; // fail-closed
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const exp = Number(token.slice(0, dot));
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  return safeEqual(token.slice(dot + 1), sign(orderNumber, exp, secret));
}

/* ---------------- OTP ---------------- */

export function generateOtp(): string {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}

export function hashOtp(verificationId: string, otp: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  return createHmac("sha256", secret)
    .update(`wolhayeon-cs-otp-v1|${verificationId}|${otp}`)
    .digest("hex");
}

export function verifyOtpHash(
  verificationId: string,
  otp: string,
  storedHash: string
): boolean {
  const h = hashOtp(verificationId, otp);
  if (!h) return false;
  return safeEqual(h, storedHash);
}
