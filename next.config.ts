import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* PDF 제작용 서버리스 Chromium은 번들하지 않고 그대로 사용 */
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default nextConfig;
