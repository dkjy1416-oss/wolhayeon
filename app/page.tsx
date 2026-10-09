import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DisclaimerSection from "@/components/DisclaimerSection";
import { getHomeMedia } from "@/lib/home-media";
import { getPublicReviews } from "@/lib/reviews";

import HeroSection from "@/components/home/HeroSection";
import MomentsSection from "@/components/home/MomentsSection";
import FreeAnalysisSection from "@/components/home/FreeAnalysisSection";
import ProductsSection from "@/components/home/ProductsSection";
import RealReviewsSection from "@/components/home/RealReviewsSection";
import FinalCTASection from "@/components/home/FinalCTASection";
import StickyMobileCta from "@/components/home/StickyMobileCta";
import ResumeOrder from "@/components/book/ResumeOrder";

/* 가격·후기를 요청마다 새로 계산 — 저장본(캐시)이 특가 마감 뒤에도 옛 가격을 보여 주던 문제 방지 */
export const dynamic = "force-dynamic";

/** 첫 화면에서 교차 재생할 원본 영상 (자막 없음 · 무음) */
const HERO_CLIPS = [
  { src: "/book/v3/w-final.mp4", poster: "/book/v3/w-final.webp", position: "object-top" },
  { src: "/book/v3/stop.mp4", poster: "/book/v3/stop.webp" },
  { src: "/book/v3/cry.mp4", poster: "/book/v3/cry.webp" },
  { src: "/book/v3/night.mp4", poster: "/book/v3/night.webp" },
  { src: "/book/v3/alone.mp4", poster: "/book/v3/alone.webp" },
];

export default async function Home() {
  const media = getHomeMedia();
  const reviews = await getPublicReviews(8);

  return (
    /* MOBILE ONLY — 넓은 화면에서는 중앙 모바일 캔버스(≤500px)만 사용 */
    <div className="min-h-screen bg-[#080607]">
      <div className="relative mx-auto min-h-screen w-full max-w-[500px] bg-ink shadow-[0_0_80px_rgba(0,0,0,0.8)]">
        <Header />
        <main>
          <HeroSection video={media.heroVideo} poster={media.heroPoster} clips={HERO_CLIPS} />
          <ResumeOrder className="mx-4 mt-6" />
          {/* 10/9 개발지시서 12 — 첫 화면 → 고민 예시 → 무료로 확인할 것 → 결과 예시 → CTA → 후기·상세 */}
          <MomentsSection />
          <FreeAnalysisSection />
          <RealReviewsSection reviews={reviews} />
          <ProductsSection />
          <FinalCTASection />
          <DisclaimerSection />
        </main>
        <Footer />
        <StickyMobileCta />
      </div>
    </div>
  );
}
