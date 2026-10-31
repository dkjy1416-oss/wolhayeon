import type { Metadata } from "next";
import ImmersiveApplyExperience from "@/components/apply/ImmersiveApplyExperience";
import WantCapture from "@/components/apply/WantCapture";
import SitCapture from "@/components/apply/SitCapture";

export const metadata: Metadata = {
  title: "이야기 들려주기 | 월하연 月下緣",
  openGraph: {
    title: "연락할까, 기다려야 할까 | 월하연 재회 분석",
    description: "사연 3분 · 월화가 먼저 읽어 줘요 · 무료 미리보기",
    images: [{ url: "/og/apply.jpg", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "연락할까, 기다려야 할까 | 월하연 재회 분석", description: "사연 3분 · 월화가 먼저 읽어 줘요 · 무료 미리보기", images: ["/og/apply.jpg"] },
};

export default function ApplyPage() {
  return (
    <main>
      <WantCapture />
      <SitCapture />
      <ImmersiveApplyExperience
        video="/book/v3/w-reading.mp4"
        poster="/book/v3/w-reading.webp"
      />
    </main>
  );
}
