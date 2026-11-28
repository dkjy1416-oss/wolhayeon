import type { Metadata } from "next";
import MyResults from "@/components/chat/MyResults";

export const metadata: Metadata = { title: "내 카톡 분석 결과 다시 보기 | 월하연", robots: { index: false } };

/** 11/28 결과 보관함 — 이메일로 결과 링크 다시 받기 */
export default function ChatMyPage() {
  return (
    <main className="fx-grain bg-[#0e0b0d] mx-auto min-h-[100svh] max-w-md px-6 pb-24 pt-24">
      <MyResults />
    </main>
  );
}
