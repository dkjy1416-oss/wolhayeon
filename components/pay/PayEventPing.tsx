"use client";

import { useEffect, useRef } from "react";
import { logPayEvent, type ClientPayEvent } from "@/lib/pay-events";

/** 서버 컴포넌트 페이지에서 "진입" 이벤트를 1회 기록하기 위한 빈 컴포넌트 */
export default function PayEventPing({
  orderNumber,
  event,
  code,
}: {
  orderNumber: string;
  event: ClientPayEvent;
  code?: string;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    logPayEvent(orderNumber, event, code);
  }, [orderNumber, event, code]);
  return null;
}
