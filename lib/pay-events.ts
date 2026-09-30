"use client";

/**
 * 결제 퍼널 이벤트 전송 (브라우저).
 * 페이지를 떠나는 순간(결제창 이동 등)에도 유실되지 않도록 sendBeacon 우선.
 * 실패해도 조용히 무시 — 결제 흐름에 영향 없음.
 */
export type ClientPayEvent =
  | "preview_cta_click"
  | "pay_page_view"
  | "widget_ready"
  | "widget_error"
  | "pay_request"
  | "pay_request_error";

export function logPayEvent(
  orderNumber: string,
  event: ClientPayEvent,
  code?: string | null
): void {
  try {
    const body = JSON.stringify({ orderNumber, event, code: code ?? null });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const ok = navigator.sendBeacon(
        "/api/events/pay",
        new Blob([body], { type: "application/json" })
      );
      if (ok) return;
    }
    fetch("/api/events/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* noop */
  }
}
