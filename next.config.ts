import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* PDF 제작용 서버리스 Chromium은 번들하지 않고 그대로 사용 */
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  /* Chromium 실행 파일(bin/*.br)은 자동 추적되지 않으므로 책 제작 API에 직접 포함 */
  outputFileTracingIncludes: Object.fromEntries(
    [
      "/api/books/process",
      /* 결제 완료 직후 서버 처리·상담창 재시도·멈춘 주문 자동 재처리도 책을 만들 수 있어야 함 */
      "/payment/success",
      "/api/cs/action/retry-generation",
      "/api/internal/sweep",
    ].map((route) => [
      route,
      ["./node_modules/@sparticuz/chromium/bin/**", "./public/book/cover-print.webp"],
    ])
  ),
};

export default nextConfig;
