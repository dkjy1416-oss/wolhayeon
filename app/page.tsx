import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import EmpathySection from "@/components/EmpathySection";
import StorySection from "@/components/StorySection";
import WolhwaSection from "@/components/WolhwaSection";
import RitualSection from "@/components/RitualSection";
import DeliverablesSection from "@/components/DeliverablesSection";
import PreviewSection from "@/components/PreviewSection";
import AudienceSection from "@/components/AudienceSection";
import PricingSection from "@/components/PricingSection";
import DisclaimerSection from "@/components/DisclaimerSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <EmpathySection />
        <StorySection />
        <WolhwaSection />
        <RitualSection />
        <DeliverablesSection />
        <PreviewSection />
        <AudienceSection />
        <PricingSection />
        <DisclaimerSection />
      </main>
      <Footer />
    </>
  );
}
