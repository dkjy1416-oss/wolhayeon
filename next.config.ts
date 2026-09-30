import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* PDF 제작용 서버리스 Chromium은 번들하지 않고 그대로 사용 */
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  /* Chromium 실행 파일(bin/*.br)은 자동 추적되지 않으므로 책 제작 API에 직접 포함 */
  outputFileTracingIncludes: {
    "/api/books/process": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
