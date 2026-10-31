/**
 * 카톡 분석 주문 서명 토큰 (서버 전용)
 * - order : 주문 화면(캡처 업로드·결제) 접근
 * - result: 결과 열람 (메일 링크)
 * - bundle: 패키지 손님의 재회 분석 무료 이용권
 * 서명키는 RITUAL_ADMIN_SECRET 재사용 + 용도별 도메인 문자열로 분리. 비밀키 없으면 fail-closed.
 */
import "server-only";
import { createHmac, createHash, timingSafeEqual } from "crypto";

type Kind = "order" | "result" | "bundle";

function secret(): string | null {
  const s = process.env.RITUAL_ADMIN_SECRET?.trim();
  return s && s.length >= 16 ? s : null;
}

export function chatToken(kind: Kind, orderNumber: string): string | null {
  const s = secret();
  if (!s) return null;
  return createHmac("sha256", s).update(`wolhayeon-chat-${kind}-v1|${orderNumber}`).digest("base64url").slice(0, 32);
}

export function verifyChatToken(kind: Kind, orderNumber: string, token: unknown): boolean {
  if (typeof token !== "string" || token.length < 16 || token.length > 64) return false;
  const want = chatToken(kind, orderNumber);
  if (!want) return false;
  const a = createHash("sha256").update(token).digest();
  const b = createHash("sha256").update(want).digest();
  return timingSafeEqual(a, b);
}
