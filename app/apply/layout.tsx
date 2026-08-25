import type { Metadata } from "next";

/**
 * /apply 이하 모든 페이지( /apply, /apply/confirm, /apply/ready )에 적용.
 * 신청 과정은 검색엔진에 노출되지 않도록 noindex, nofollow를 설정합니다.
 */
export const metadata: Metadata = {
  title: "리추얼 신청 | 월하연 月下緣",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ApplyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
