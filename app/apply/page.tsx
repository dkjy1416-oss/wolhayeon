import type { Metadata } from "next";
import ApplyWizard from "@/components/apply/ApplyWizard";

export const metadata: Metadata = {
  title: "이야기 들려주기 | 월하연 月下緣",
};

export default function ApplyPage() {
  return (
    <main>
      <ApplyWizard />
    </main>
  );
}
