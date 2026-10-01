"use client";

import { track } from "@vercel/analytics";
import { sendSiteEvent } from "@/lib/site-track";

export type FunnelEvent =
  | "home_cta_click"
  | "apply_start"
  | "apply_complete"
  | "preview_view"
  | "payment_cta_click"
  | "email_typo_fix_applied"
  | "order_created";

export function trackEvent(
  name: FunnelEvent,
  props?: Record<string, string>
): void {
  if (name !== "email_typo_fix_applied") sendSiteEvent(name, props);
  try {
    track(name, props);
  } catch {
    /* analytics 실패가 실제 서비스 흐름을 막으면 안 됨 */
  }
}
