import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import AutoFx from "@/components/fx/AutoFx";
import Footer from "@/components/Footer";
import { getPublicReviews } from "@/lib/reviews";
import RealReviewsSection from "@/components/home/RealReviewsSection";
import ResumeCard from "@/components/home2/ResumeCard";
import ShortsRow from "@/components/home2/ShortsRow";
import StickyCta from "@/components/home2/StickyCta";
import { FAQ } from "@/components/home2/content";
import { Hook, Turn, Mystery, MeetWolhwa, Webtoon, Checklist, Worries, Prepared } from "@/components/home3/Story";
import { Point1, Point2, Point3, Point4, Point5, BookAddon, Finale } from "@/components/home3/Points";

/* 가격·후기를 요청마다 새로 계산 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "월하연 月下緣 | 월화의 관계 리추얼",
  description:
    "왜 헤어졌는지, 마지막 대화, 지금의 연락 상태. 두 사람의 사연으로 월화가 편지와 나만의 리추얼, 21일 실천 가이드를 써 드려요. 미리보기 무료.",
};

/** 10/16 3차 — 한 줄로 길게 이어지는 상세페이지형 홈 (공감 → 월화 → 상품 POINT 1~5 → 마지막 버튼) */
export default async function Home() {
  const reviews = await getPublicReviews(8);
  return (
    <div className="min-h-screen bg-[#0a0809]">
      <div data-fx-root className="relative mx-auto min-h-screen w-full max-w-[480px] bg-[#120e10] shadow-[0_0_80px_rgba(0,0,0,0.8)]">
        <AutoFx />
        <Header ctaLabel="무료 미리보기" />
        <main>
          <Hook />
          <ResumeCard />
          <Turn />
          <Mystery />
          <MeetWolhwa />
          <Webtoon />
          <Checklist />
          {reviews.length > 0 && <RealReviewsSection reviews={reviews} />}
          <Worries />
          <Prepared />
          <div className="paper">
            <Point1 />
            <Point2 />
            <Point3 />
            <Point4 />
            <Point5 />
            <BookAddon />
          </div>
          <ShortsRow />
          <section className="px-5 pb-14">
            <p className="text-center text-[0.86rem] font-bold tracking-[0.1em] text-gold">자주 묻는 질문</p>
            <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-[#1d181b]">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[0.96rem] font-medium text-ivory">
                    <span>{q}</span>
                    <span aria-hidden className="text-ivory-dim transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-[0.9rem] leading-[1.75] text-ivory-dim">{a}</p>
                </details>
              ))}
            </div>
            <p className="mt-3 text-center text-[0.8rem] text-ivory-dim">
              <Link href="/guide" className="underline underline-offset-4">이용안내</Link> ·{" "}
              <Link href="/refund" className="underline underline-offset-4">환불정책</Link> ·{" "}
              <Link href="/privacy" className="underline underline-offset-4">개인정보처리방침</Link>
            </p>
          </section>
          <Finale />
        </main>
        <Footer />
        <StickyCta />
      </div>
    </div>
  );
}
