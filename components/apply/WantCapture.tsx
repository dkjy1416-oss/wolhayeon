"use client";

/** /apply?want=book|bundle 로 들어오면 고른 상품을 기억 (미리보기·결제에서 그 상품으로 이어짐) */
import { useEffect } from "react";
import { isWantProduct, saveWant } from "@/lib/purchase-intent";

export default function WantCapture() {
  useEffect(() => {
    try {
      const w = new URLSearchParams(window.location.search).get("want");
      if (isWantProduct(w)) saveWant(w);
    } catch {
      /* 무시 */
    }
  }, []);
  return null;
}
