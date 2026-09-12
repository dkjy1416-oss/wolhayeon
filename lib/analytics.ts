"use client";

import { track } from "@vercel/analytics";

export type FunnelEvent =
  | "home_cta_click"
  | "apply_start"
  | "apply_complete"
  | "preview_view"
  | "payment_cta_click";

export function trackEvent(
  name: FunnelEvent,
  props?: Record<string, string>
): void {
  try {
    track(name, props);
  } catch {
    /* analytics 실패가 실제 서비스 흐름을 막으면 안 됨 */
  }
}
