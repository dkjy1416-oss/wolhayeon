import type { Metadata } from "next";
import { getPublicReviews } from "@/lib/reviews";
import { getSiteTotals } from "@/lib/site-totals";
import HomeV4 from "@/components/home4/HomeV4";
import Totals from "@/components/home3/Totals";

/* 11/26 운영자 요청: 새 홈 화면 시안 (/home) — 확인이 끝날 때까지 검색 노출 차단, 기존 페이지에서 링크하지 않음 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "월하연 月下緣",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default async function HomePage() {
  const [reviews, totals] = await Promise.all([getPublicReviews(10), getSiteTotals().catch(() => null)]);
  /* 후기·평점은 실제 공개 후기만. 없으면 칸을 숨김 */
  const rating = reviews.length ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10 : null;
  return (
    <HomeV4
      reviews={reviews.map((r) => ({ id: r.id, rating: r.rating, body: r.body, name: r.name, product: r.product, incentive: r.incentive }))}
      rating={rating}
      totalsNode={totals ? <Totals totals={totals} /> : null}
    />
  );
}
