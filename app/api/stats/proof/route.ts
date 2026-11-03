/**
 * GET /api/stats/proof — 결제 화면 근처에 보여줄 실제 숫자·후기 (11/3)
 * - paid: 실제 결제 완료 주문 수 (운영자·테스트 제외)
 * - reviews: 관리자 승인 + 공개 동의한 실제 후기 최대 3개
 * 지어낸 숫자 없음. 실패하면 빈 값.
 */
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isOperatorEmail } from "@/lib/admin-util";
import { getPublicReviews } from "@/lib/reviews";

export const revalidate = 600;

export async function GET() {
  let paid = 0;
  try {
    const { data } = await getSupabaseAdmin()
      .from("ritual_orders")
      .select("email")
      .eq("payment_status", "paid")
      .limit(5000);
    paid = (data ?? []).filter(
      (r: { email: string | null }) => !isOperatorEmail(r.email) && !/@example\.com$/i.test(r.email ?? "")
    ).length;
  } catch {
    paid = 0;
  }
  const reviews = await getPublicReviews(3).catch(() => []);
  return NextResponse.json(
    { paid, reviews: reviews.map((r) => ({ rating: r.rating, body: r.body.slice(0, 120), name: r.name, month: r.month, incentive: r.incentive })) },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } }
  );
}
