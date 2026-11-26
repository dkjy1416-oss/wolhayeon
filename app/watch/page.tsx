import type { Metadata } from "next";
import SubShell from "@/components/home4/SubShell";
import WatchView from "@/components/home4/WatchView";

/** 11/26 운영자 요청: 하단 메뉴 '영상' — 월하연 유튜브 쇼츠 모아 보기. 새 홈 확인 전까지 검색 노출 차단. */
export const metadata: Metadata = {
  title: "월하연 영상 | 월하연 月下緣",
  description: "보낼까 말까 고민되는 밤, 월하연 쇼츠 모아 보기.",
  robots: { index: false, follow: false },
};

export default function WatchPage() {
  return (
    <SubShell title="영상" active="watch">
      <WatchView />
    </SubShell>
  );
}
