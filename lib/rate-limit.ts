/**
 * 아주 가벼운 요청 횟수 제한 (서버 인스턴스 메모리 기준).
 * 상담 AI 비용 남용·인증번호 메일 폭탄·주문 조회 대입을 막는 1차 방어선.
 */
import "server-only";

const buckets = new Map<string, number[]>();

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for") ?? "";
  return (xf.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}

/** true = 허용, false = 너무 많음 */
export function allowRequest(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > windowMs) buckets.delete(k);
  }
  return true;
}
