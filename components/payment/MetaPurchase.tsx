"use client";

/** 결제 성공 화면에서 메타 픽셀 Purchase 1회 (서버 전환 API 와 같은 event_id → 중복 제거) */
import { useEffect } from "react";
import { loadPixel, px } from "@/lib/meta-pixel";

export default function MetaPurchase({ orderNumber, amount }: { orderNumber: string; amount: number }) {
  useEffect(() => {
    if (!orderNumber || !(amount > 0)) return;
    loadPixel();
    px("Purchase", { value: amount, currency: "KRW", content_ids: [orderNumber], content_type: "product" }, { id: `${orderNumber}_Purchase`, once: `${orderNumber}_Purchase` });
  }, [orderNumber, amount]);
  return null;
}
