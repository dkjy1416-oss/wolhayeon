import type { Metadata } from "next";
import Link from "next/link";
import {
  REFUND_POLICY_SECTIONS,
} from "@/lib/refund-policy";

export const metadata: Metadata = {
  title: "환불정책 | 월하연 月下緣",
};

/** 공개 환불정책 — lib/refund-policy.ts 단일 소스를 그대로 렌더 (AI/엔진과 동일) */
export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#080607]">
      <main className="mx-auto min-h-screen w-full max-w-[500px] bg-ink px-6 py-14">
        <p className="text-xs tracking-[0.35em] text-gold/90">月下緣</p>
        <h1 className="font-display mt-4 text-xl font-semibold text-ivory">
          환불정책
        </h1>
        <div className="mt-8 flex flex-col gap-8">
          {REFUND_POLICY_SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-[0.95rem] font-medium text-gold">
                {s.title}
              </h2>
              <p className="mt-3 whitespace-pre-line text-[0.85rem] font-light leading-[2] text-ivory-dim">
                {s.body}
              </p>
            </section>
          ))}
        </div>
        <Link
          href="/"
          className="mt-12 inline-flex h-12 items-center justify-center rounded-full border border-gold-dim/40 px-8 text-sm text-ivory"
        >
          홈으로 돌아가기
        </Link>
      </main>
    </div>
  );
}
