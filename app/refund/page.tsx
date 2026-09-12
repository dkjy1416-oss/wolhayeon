import type { Metadata } from "next";
import LegalPage, { LegalSection } from "@/components/legal/LegalPage";
import { REFUND_POLICY_SECTIONS } from "@/lib/refund-policy";

export const metadata: Metadata = { title: "환불정책 | 월하연 月下緣" };

export default function RefundPolicyPage() {
  return (
    <LegalPage title="환불정책" updated="2026년 9월 13일">
      {REFUND_POLICY_SECTIONS.map((section) => (
        <LegalSection key={section.title} title={section.title}>
          <p className="whitespace-pre-line">{section.body}</p>
        </LegalSection>
      ))}
    </LegalPage>
  );
}
