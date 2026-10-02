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
        video="/book/v3/w-reading.mp4"
        poster="/book/v3/w-reading.webp"
      />
    </main>
  );
}
