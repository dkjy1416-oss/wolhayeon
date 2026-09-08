/**
 * 결제 전 무료 미리보기 접근 토큰 (서버 전용).
 *
 * 모바일 Safari/인앱 브라우저에서 sessionStorage UUID가 유실/교체되어도
 * 방금 생성한 주문의 preview를 정상 조회할 수 있도록 주문번호에 묶인
 * 짧은 HMAC 토큰을 발급한다.
 *
 * - 관리자 비밀키 자체는 절대 브라우저로 보내지 않는다.
 * - 토큰은 주문번호 + 만료시각에만 묶이며 개인정보를 포함하지 않는다.
 * - 다른 주문번호에 재사용할 수 없다.
 */
import "server-only";
import { createHmac, createHash, timingSafeEqual } from "crypto";

const DOMAIN = "wolhayeon-preview-access-v1";
const TTL_MS = 2 * 60 * 60 * 1000; // 신청/미리보기 구간에 충분한 2시간

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

export function createPreviewToken(orderNumber: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const exp = Date.now() + TTL_MS;
  return `${exp}.${sign(orderNumber, exp, secret)}`;
}

export function verifyPreviewToken(
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
