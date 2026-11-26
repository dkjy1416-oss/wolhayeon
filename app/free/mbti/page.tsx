import type { Metadata } from "next";
import SubShell from "@/components/home4/SubShell";
import { MbtiTest } from "@/components/free/FunTests";

/** 11/26 운영자 요청: 무료 테스트 — MBTI 애정 궁합 (새 홈 /home 확인이 끝날 때까지 검색 노출 차단) */
export const metadata: Metadata = {
  title: "MBTI 애정 궁합 · 무료 | 월하연 月下緣",
  description: "내 MBTI와 그 사람 MBTI로 보는 애정 궁합, 무료로 바로 확인해요.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <SubShell title="MBTI 애정 궁합" active="free" back="/home?cat=free">
      <MbtiTest />
    </SubShell>
  );
}
