import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-noto-serif-kr",
  display: "swap",
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

export const metadata: Metadata = {
  title: "월하연 月下緣 | 붉은 인연의 실 리추얼",
  description:
    "달빛 아래, 두 사람의 마음을 돌아보는 개인화 리추얼. 월하연의 상징적 리추얼 콘텐츠로 당신의 인연을 조용히 되돌아보세요.",
};

export const viewport: Viewport = {
  themeColor: "#0a0908",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${notoSerifKr.variable} ${notoSansKr.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
