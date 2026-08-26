/**
 * 관리자 인증 (서버 전용).
 *
 * - RITUAL_ADMIN_SECRET은 서버에서만 사용. 브라우저 JS·쿠키·
 *   localStorage·URL 어디에도 비밀키 자체를 넣지 않습니다.
 * - 로그인 성공 시 비밀키 대신 "서버가 서명한 세션 토큰"을
 *   HttpOnly 쿠키로 발급합니다.
 *   토큰 = 만료시각 + HMAC-SHA256(비밀키, "wh-admin:" + 만료시각)
 *   → 비밀키를 모르면 위조 불가, 만료시각 변조 시 서명 불일치.
 * - 모든 비교는 timing-safe.
 * - 비밀키가 없거나 16자 미만이면 로그인·검증 모두 거부(fail-closed).
 */
import "server-only";
import { createHmac, createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "wh_admin_session";
const SESSION_HOURS = 12;
const TOKEN_PREFIX = "wh-admin:";

function getSecret(): string | null {
  const s = process.env.RITUAL_ADMIN_SECRET?.trim();
  return s && s.length >= 16 ? s : null;
}

function sign(exp: number, secret: string): string {
  return createHmac("sha256", secret)
    .update(TOKEN_PREFIX + String(exp))
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** 로그인 시 입력한 비밀번호가 RITUAL_ADMIN_SECRET과 일치하는지 */
export function verifyAdminSecret(input: unknown): boolean {
  const secret = getSecret();
  if (!secret || typeof input !== "string" || input.length === 0) return false;
  return safeEqual(input, secret);
}

/** 세션 토큰 생성 ("만료시각.서명") */
export function createSessionToken(): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  return `${exp}.${sign(exp, secret)}`;
}

/** 세션 토큰 검증 */
export function verifySessionToken(token: unknown): boolean {
  const secret = getSecret();
  if (!secret || typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return safeEqual(sig, sign(exp, secret));
}

/** 쿠키 옵션 (HttpOnly / SameSite=Strict / production Secure / 12시간) */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  };
}

/** 서버 컴포넌트/라우트에서 현재 요청이 관리자 세션인지 확인 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE_NAME)?.value);
}
