import type { Metadata } from "next";
import EntryV2 from "@/components/apply/EntryV2";

/* 11/27 운영자 요청: 재회 분석 새 진입 프로토타입 — 검색 노출 없음, 기존 /apply 는 그대로 */
export const metadata: Metadata = {
  title: "재회 분석 새 진입 (프로토타입) | 월하연 月下緣",
  robots: { index: false, follow: false },
};

export default function ApplyV2Page() {
  return (
    <main className="min-h-[100svh] bg-[#0b0809]">
      <EntryV2 />
    </main>
  );
}
