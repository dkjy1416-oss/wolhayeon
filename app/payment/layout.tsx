import type { Metadata } from "next";

/** 결제 결과 페이지( /payment/success, /payment/fail )는 검색엔진 미노출 */
export const metadata: Metadata = {
  title: "결제 | 월하연 月下緣",
  robots: { index: false, follow: false },
};

export default function PaymentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
