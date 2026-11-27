import type { Metadata } from "next";
import EntryV2 from "@/components/apply/EntryV2";
import { getSiteTotals } from "@/lib/site-totals";

/* 누적 고객 수를 요청마다 새로 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "월하연 月下緣 | 월화의 관계 리추얼",
  description:
    "왜 헤어졌는지, 마지막 대화, 지금의 연락 상태. 두 사람의 사연으로 월화가 편지와 나만의 리추얼, 21일 실천 가이드를 써 드려요. 미리보기 무료.",
};

/**
 * 11/27 운영자 요청: 재회 분석 새 진입(웹툰 → 카톡 → 정보 입력 → 붉은 실)을 메인(/)으로.
 * 예전 상세페이지형 첫 화면의 1~4(대화창·그런데·붉은 실·궁금했던 이야기)는 미리보기 페이지로 옮김 (PreviewExtras).
 */
export default async function Home() {
  const totals = await getSiteTotals().catch(() => null);
  return (
    <main className="min-h-[100svh] bg-[#0b0809]">
      <EntryV2 visitors={totals?.visitors ?? 0} />
    </main>
  );
}
