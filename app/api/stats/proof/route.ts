/**
 * GET /api/stats/proof — 결제 화면 근처에 보여줄 실제 숫자·후기 (11/3)
 * - paid: 실제 결제 완료 주문 수 (운영자·테스트 제외)
 * - reviews: 관리자 승인 + 공개 동의한 실제 후기 최대 3개
 * 지어낸 숫자 없음. 실패하면 빈 값.
 */
import { NextResponse } from "next/server";
import { getPaidCount } from "@/lib/paid-count";
import { getPublicReviews } from "@/lib/reviews";

export const revalidate = 600;

export async function GET() {
  const paid = await getPaidCount();
  const reviews = await getPublicReviews(3).catch(() => []);
  return NextResponse.json(
    { paid, reviews: reviews.map((r) => ({ rating: r.rating, body: r.body.slice(0, 120), name: r.name, month: r.month, incentive: r.incentive })) },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } }
  );
}
