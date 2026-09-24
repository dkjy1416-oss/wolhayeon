import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import CsChatWidget from "@/components/cs/CsChatWidget";
import { Analytics } from "@vercel/analytics/next";

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
  metadataBase: new URL("https://thewolha.com"),
  title: "월하연 月下緣 | 헤어진 뒤, 아직 남아 있는 마음을 읽는 시간",
  description:
    "연락해야 할지, 기다려야 할지, 놓아야 할지 헷갈릴 때. 월화가 관계의 흐름과 지금의 마음을 함께 들여다봅니다.",
  openGraph: {
    title: "오늘 밤도 그 사람 생각이라면 | 월하연 月下緣",
    description:
      "연락해야 할까, 기다려야 할까. 그 마음이 사랑인지 미련인지 — 월화가 무료로 먼저 읽어줘요.",
    url: "https://thewolha.com",
    siteName: "월하연 月下緣",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "오늘 밤도 그 사람 생각이라면 | 월하연 月下緣",
    description:
      "연락해야 할까, 기다려야 할까. 그 마음이 사랑인지 미련인지 — 월화가 무료로 먼저 읽어줘요.",
    images: ["/og-image.png"],
  },
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
        <CsChatWidget />
        <Analytics />
      </body>
    </html>
  );
}
