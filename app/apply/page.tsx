import type { Metadata } from "next";
import ApplyWizard from "@/components/apply/ApplyWizard";

export const metadata: Metadata = {
  title: "리추얼 신청 | 월하연 月下緣",
};

export default function ApplyPage() {
  return (
    <main>
      <ApplyWizard />
    </main>
  );
}
