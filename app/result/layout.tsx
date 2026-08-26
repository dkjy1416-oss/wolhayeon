import type { Metadata } from "next";

/**
 * 고객 결과 페이지: 개인정보 포함 —
 * 검색엔진 색인/보관/스니펫 금지 + referrer 미전송.
 */
export const metadata: Metadata = {
  title: "월하연 月下緣 — 개인 리추얼",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
  referrer: "no-referrer",
};

export default function ResultLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
