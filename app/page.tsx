import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DisclaimerSection from "@/components/DisclaimerSection";
import { getHomeMedia } from "@/lib/home-media";

import HeroSection from "@/components/home/HeroSection";
import EmotionSection from "@/components/home/EmotionSection";
import WolhwaInsightSection from "@/components/home/WolhwaInsightSection";
import WolhwaReadingSection from "@/components/home/WolhwaReadingSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import ReviewsSection from "@/components/home/ReviewsSection";
import QuestionsSection from "@/components/home/QuestionsSection";
import ResultPreviewSection from "@/components/home/ResultPreviewSection";
import WolhwaShortsSection from "@/components/home/WolhwaShortsSection";
import BrandStatementSection from "@/components/home/BrandStatementSection";
import FinalCTASection from "@/components/home/FinalCTASection";
import StickyMobileCta from "@/components/home/StickyMobileCta";

export default function Home() {
  const media = getHomeMedia();

  return (
    /* MOBILE ONLY — 넓은 화면에서는 중앙 모바일 캔버스(≤500px)만 사용 */
    <div className="min-h-screen bg-[#080607]">
      <div className="relative mx-auto min-h-screen w-full max-w-[500px] bg-ink shadow-[0_0_80px_rgba(0,0,0,0.8)]">
        <Header />
        <main>
          <HeroSection video={media.heroVideo} poster={media.heroPoster} />
          <ReviewsSection />
          <EmotionSection emotionPhone={media.emotionPhone} />
          <WolhwaInsightSection gaze={media.wolhwaGaze} />
          <WolhwaReadingSection
            video={media.readingLoop}
            poster={media.readingPoster}
          />
          <HowItWorksSection ritualLetter={media.ritualLetter} />
          <QuestionsSection />
          <ResultPreviewSection resultCards={media.resultCards} />
          <WolhwaShortsSection shorts={media.shorts} />
          <BrandStatementSection bgLetter={media.ritualLetter} />
          <FinalCTASection />
          <DisclaimerSection />
        </main>
        <Footer />
        <StickyMobileCta />
      </div>
    </div>
  );
}
