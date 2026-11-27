import type { Metadata } from "next";
import EntryV2 from "@/components/apply/EntryV2";
import { getSiteTotals } from "@/lib/site-totals";

/* 11/27 운영자 요청: 재회 분석 새 진입 프로토타입 — 검색 노출 없음, 기존 /apply 는 그대로 */
export const metadata: Metadata = {
  title: "재회 분석 새 진입 (프로토타입) | 월하연 月下緣",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ApplyV2Page() {
  /* 메인과 같은 누적 고객 수 (lib/site-totals, 테스트 주문 제외) */
  const totals = await getSiteTotals().catch(() => null);
  return (
    <main className="min-h-[100svh] bg-[#0b0809]">
      <EntryV2 visitors={totals?.visitors ?? 0} />
    </main>
  );
}
