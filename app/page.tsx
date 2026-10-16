import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getPublicReviews } from "@/lib/reviews";
import RealReviewsSection from "@/components/home/RealReviewsSection";
import HomeHero from "@/components/home2/HomeHero";
import ResumeCard from "@/components/home2/ResumeCard";
import ComposeTabs from "@/components/home2/ComposeTabs";
import WhyStory from "@/components/home2/WhyStory";
import SituationPick from "@/components/home2/SituationPick";
import RitualScene from "@/components/home2/RitualScene";
import ProcessTrust from "@/components/home2/ProcessTrust";
import PricingSection from "@/components/home2/PricingSection";
import FaqFinal from "@/components/home2/FaqFinal";
import StickyCta from "@/components/home2/StickyCta";

/* 가격·후기를 요청마다 새로 계산 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "월하연 月下緣 | 사연 기반 관계 리추얼",
  description:
    "왜 헤어졌는지, 마지막 대화, 지금의 연락 상태. 두 사람의 구체적인 사연을 바탕으로 월화의 편지와 나만의 리추얼, 단계별 실천 가이드를 작성하는 개인화 콘텐츠. 미리보기 무료.",
};

/** 10/16 리디자인 — 밤에 펼치는 편지와 리추얼 노트 (지시문 v2 5절 순서) */
export default async function Home() {
  const reviews = await getPublicReviews(8);
  return (
    <div className="paper min-h-screen">
      <div className="night">
        <Header ctaLabel="무료 미리보기" />
      </div>
      <main>
        <HomeHero />
        <ResumeCard />
        <ComposeTabs />
        <WhyStory />
        <SituationPick />
        <RitualScene />
        <ProcessTrust />
        {reviews.length > 0 && (
          <div className="mx-auto max-w-[1120px]">
            <RealReviewsSection reviews={reviews} />
          </div>
        )}
        <PricingSection />
        <FaqFinal />
      </main>
      <Footer />
      <StickyCta />
    </div>
  );
}
