/**
 * 고객용 자동 처리 권한 토큰 (서버 전용).
 *
 * - /payment/success 에서 결제가 서버 검증으로 확인된 주문에 한해 발급.
 * - 서명키는 RITUAL_ADMIN_SECRET을 재사용하되, 관리자 세션과 완전히 다른
 *   도메인 분리 문자열("wolhayeon-customer-process-v1|주문번호|만료")을
 *   HMAC 입력에 사용 → 이 토큰으로 관리자 인증을 통과할 수 없고,
 *   관리자 세션 토큰으로 이 검증을 통과할 수도 없음.
 * - 토큰 = "만료시각.서명(hex)". 주문번호는 요청 body로 함께 와야 하며
 *   서명에 묶여 있어 다른 주문번호에 재사용 불가.
 * - 유효시간 30분. timingSafeEqual 비교. 비밀키 미설정 시 fail-closed.
 * - 비밀키 자체는 절대 클라이언트로 전달하지 않음(서명 결과만 전달).
 */
import "server-only";
import { createHmac, createHash, timingSafeEqual } from "crypto";

const DOMAIN = "wolhayeon-customer-process-v1";
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

/** 결제 확인된 주문에 대해서만 호출할 것 */
export function createProcessToken(orderNumber: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const exp = Date.now() + TTL_MS;
  return `${exp}.${sign(orderNumber, exp, secret)}`;
}

export function verifyProcessToken(
  orderNumber: string,
  token: unknown
): boolean {
  const secret = getSecret();
  if (!secret || typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const exp = Number(token.slice(0, dot));
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  if (sig.length !== 64) return false;
  return safeEqual(sig, sign(orderNumber, exp, secret));
}
