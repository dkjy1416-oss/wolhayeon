"use client";

/** 페이지 방문 기록 (관리자 마케팅 대시보드용) — 화면에는 아무것도 그리지 않음 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { sendSiteEvent } from "@/lib/site-track";

export default function SiteTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    sendSiteEvent("view");
  }, [pathname]);
  return null;
}
