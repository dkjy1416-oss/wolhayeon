import type { Metadata } from "next";
import SubShell from "@/components/home4/SubShell";
import { LoveScoreTest } from "@/components/free/FunTests";

/** 11/26 운영자 요청: 무료 테스트 — 생년월일 애정 점수 (새 홈 /home 확인이 끝날 때까지 검색 노출 차단) */
export const metadata: Metadata = {
  title: "생년월일 애정 점수 · 무료 | 월하연 月下緣",
  description: "두 사람의 생년월일로 보는 애정 온도, 무료로 바로 확인해요.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <SubShell title="생년월일 애정 점수" active="free" back="/home?cat=free">
      <LoveScoreTest />
    </SubShell>
  );
}
