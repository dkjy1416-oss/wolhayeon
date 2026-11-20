"use client";

/** 메타 픽셀 로더 + 페이지 이동마다 PageView (관리자·운영자 브라우저 제외) — 화면에는 아무것도 그리지 않음 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { PIXEL_ID, allowPixelThisSession, blockPixel, loadPixel, px } from "@/lib/meta-pixel";

export default function MetaPixel() {
  const pathname = usePathname();
  useEffect(() => {
    if (!PIXEL_ID || !pathname) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("px_test") === "1") allowPixelThisSession();
    if (pathname.startsWith("/admin") || q.get("utm_source") === "selftest") {
      blockPixel();
      return;
    }
    if (!loadPixel()) return;
    px("PageView");
  }, [pathname]);
  return null;
}
