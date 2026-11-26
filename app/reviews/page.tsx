import type { Metadata } from "next";
import SubShell from "@/components/home4/SubShell";
import ReviewList, { type ReviewItem } from "@/components/home4/ReviewList";
import { SAVED_REVIEWS } from "@/lib/home/reviews-saved";
import { getPublicReviews } from "@/lib/reviews";

/** 11/26 운영자 요청: 후기 더 보기 — DB 승인 후기 + 운영자가 저장해 둔 후기. 새 홈 확인 전까지 검색 노출 차단. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "후기 | 월하연 月下緣",
  robots: { index: false, follow: false },
};

const LABEL: Record<string, string> = { "관계 리추얼": "관계 리추얼", 책: "월화의 책", "메시지 + 책": "메시지 + 책", "카톡 대화 분석": "카톡 대화 분석" };

export default async function ReviewsPage() {
  const db = await getPublicReviews(60);
  const items: ReviewItem[] = [
    ...db.map((r) => ({ key: `d${r.id}`, product: LABEL[r.product] ?? r.product, who: r.name, body: r.body })),
    ...SAVED_REVIEWS.map((r) => ({ key: `s${r.id}`, product: r.product, who: r.age, body: r.body })),
  ];
  return (
    <SubShell title="후기" active="home">
      <ReviewList items={items} />
    </SubShell>
  );
}
