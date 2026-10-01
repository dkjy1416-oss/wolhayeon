import type { Metadata } from "next";
import ImmersiveApplyExperience from "@/components/apply/ImmersiveApplyExperience";
import WantCapture from "@/components/apply/WantCapture";

export const metadata: Metadata = {
  title: "이야기 들려주기 | 월하연 月下緣",
};

export default function ApplyPage() {
  return (
    <main>
      <WantCapture />
      <ImmersiveApplyExperience
        video="/wolhwa/wolhwa-reading-loop.mp4"
        poster="/wolhwa/reading-poster.webp"
      />
    </main>
  );
}
