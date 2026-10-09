/**
 * POST /api/track — 방문·퍼널 이벤트 기록 (마케팅 대시보드용)
 * 개인정보 없음. 테이블이 없거나 실패해도 항상 204.
 */
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const EVENTS = new Set([
  "view",
  "home_cta_click",
  "apply_start",
  "apply_complete",
  "apply_step",
  "order_created",
  "preview_view",
  "payment_cta_click",
]);
const ORDER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;
const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|kakaotalk-scrap|headless|lighthouse/i;

function clip(v: unknown, n: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, n);
  return s ? s : null;
}

export async function POST(request: Request) {
  try {
    if (BOT_RE.test(request.headers.get("user-agent") ?? "")) {
      return new Response(null, { status: 204 });
    }
    const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const ev = clip(b?.ev, 40);
    const vid = clip(b?.vid, 64);
    if (!b || !ev || !EVENTS.has(ev) || !vid || !/^[\w-]+$/.test(vid)) {
      return new Response(null, { status: 204 });
    }
    const order = clip(b.order, 20);
    const host = (v: unknown) => {
      const h = clip(v, 100);
      return h && /^[a-z0-9.\-]+$/i.test(h) ? h.toLowerCase() : null;
    };
    const row: Record<string, string | null> = {
        visitor_id: vid,
        event: ev,
        path: clip(b.path, 120),
        ref_host: host(b.ref),
        utm_source: clip(b.us, 60),
        utm_medium: clip(b.um, 60),
        utm_campaign: clip(b.uc, 80),
        first_ref_host: host(b.fr),
        device: b.dev === "mobile" ? "mobile" : b.dev === "desktop" ? "desktop" : null,
        order_number: order && ORDER_RE.test(order) ? order : null,
    };
    const ux = clip(b.ux, 80);
    const res = await getSupabaseAdmin()
      .from("site_events")
      .insert(ux ? { ...row, utm_content: ux } : row);
    /* utm_content 열이 아직 없으면(마이그레이션 전) 열 없이 다시 저장 — 방문 기록을 잃지 않게 */
    if (res.error && ux) await getSupabaseAdmin().from("site_events").insert(row);
  } catch {
    /* noop */
  }
  return new Response(null, { status: 204 });
}
