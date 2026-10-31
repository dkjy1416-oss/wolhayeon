/**
 * 주문 유입 경로 (첫 유입 · 마지막 유입) — 10/30 요청 3
 *
 * DB 변경 없이 site_events 로 계산한다.
 *   주문번호 → 그 주문을 남긴 방문자(visitor_id) → 그 방문자의 모든 방문 기록
 *   - 첫 유입: 가장 처음 기록된 방문의 utm·유입 사이트
 *   - 마지막 유입: 결제(없으면 지금) 이전 마지막으로 utm 이나 외부 유입 사이트가 붙은 방문
 * site_events 의 utm 값은 그 방문의 캠페인 링크 기준이라(새 링크로 오면 갱신) 마지막 유입 계산에 쓸 수 있다.
 */
import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface Touch {
  at: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  referrer: string | null;
}

export interface OrderAttribution {
  first: Touch | null;
  last: Touch | null;
  visits: number;
}

interface EvRow {
  visitor_id: string;
  created_at: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content?: string | null;
  ref_host: string | null;
  first_ref_host: string | null;
}

const toTouch = (e: EvRow): Touch => ({
  at: e.created_at,
  source: e.utm_source,
  medium: e.utm_medium,
  campaign: e.utm_campaign,
  content: e.utm_content ?? null,
  referrer: e.ref_host ?? e.first_ref_host,
});

/** 화면 표시용 한 줄: "instagram / profile / 1030_01" 또는 "유입 사이트 google.com" 또는 "직접 방문" */
export function touchLabel(t: Touch | null): string {
  if (!t) return "기록 없음";
  const utm = [t.source, t.medium, t.campaign, t.content].filter(Boolean).join(" / ");
  if (utm) return utm;
  if (t.referrer) return `유입 사이트 ${t.referrer}`;
  return "직접 방문";
}

const COLS_WITH_CONTENT =
  "visitor_id, created_at, utm_source, utm_medium, utm_campaign, utm_content, ref_host, first_ref_host";
const COLS = "visitor_id, created_at, utm_source, utm_medium, utm_campaign, ref_host, first_ref_host";

/** 여러 주문을 한 번에 계산 (주문 목록용). 실패하면 빈 Map. */
export async function getOrderAttributions(
  orders: { order_number: string; paid_at?: string | null }[]
): Promise<Map<string, OrderAttribution>> {
  const out = new Map<string, OrderAttribution>();
  if (orders.length === 0) return out;
  try {
    const sb = getSupabaseAdmin();
    const nums = orders.map((o) => o.order_number);
    /* Supabase 는 한 번에 최대 1,000행만 돌려준다 → 주문 20개씩 나눠서 조회 (10/31 수정: 최근 주문이 잘려 '유입 없음'으로 보이던 문제) */
    const chunks = <T,>(arr: T[], n: number) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
    const vidByOrder = new Map<string, string>();
    const linkRes = await Promise.all(
      chunks(nums, 20).map((c) =>
        sb.from("site_events").select("visitor_id, order_number, created_at").in("order_number", c).order("created_at", { ascending: true }).limit(1000)
      )
    );
    for (const link of linkRes) {
      for (const r of (link.data ?? []) as { visitor_id: string; order_number: string }[]) {
        if (!vidByOrder.has(r.order_number)) vidByOrder.set(r.order_number, r.visitor_id);
      }
    }
    const vids = [...new Set(vidByOrder.values())];
    if (vids.length === 0) return out;

    const evByVid = new Map<string, EvRow[]>();
    const evRes = await Promise.all(
      chunks(vids, 10).map(async (chunk) => {
        let res = await sb.from("site_events").select(COLS_WITH_CONTENT).in("visitor_id", chunk).order("created_at", { ascending: true }).limit(1000);
        /* utm_content 열이 아직 없으면 열 없이 다시 */
        if (res.error) {
          res = (await sb.from("site_events").select(COLS).in("visitor_id", chunk).order("created_at", { ascending: true }).limit(1000)) as typeof res;
        }
        return res;
      })
    );
    for (const res of evRes) {
      for (const e of (res.data ?? []) as EvRow[]) {
        const arr = evByVid.get(e.visitor_id) ?? [];
        arr.push(e);
        evByVid.set(e.visitor_id, arr);
      }
    }

    for (const o of orders) {
      const vid = vidByOrder.get(o.order_number);
      const evs = vid ? evByVid.get(vid) : undefined;
      if (!evs || evs.length === 0) continue;
      const until = o.paid_at ? new Date(o.paid_at).getTime() : Date.now();
      const before = evs.filter((e) => new Date(e.created_at).getTime() <= until);
      const pool = before.length > 0 ? before : evs;
      const tagged = pool.filter((e) => e.utm_source || e.ref_host);
      out.set(o.order_number, {
        first: toTouch(pool[0]),
        last: tagged.length > 0 ? toTouch(tagged[tagged.length - 1]) : toTouch(pool[pool.length - 1]),
        visits: pool.length,
      });
    }
  } catch {
    /* 유입 기록은 보조 정보 — 실패해도 주문 화면은 그대로 */
  }
  return out;
}

export async function getOrderAttribution(
  orderNumber: string,
  paidAt?: string | null
): Promise<OrderAttribution | null> {
  const m = await getOrderAttributions([{ order_number: orderNumber, paid_at: paidAt }]);
  return m.get(orderNumber) ?? null;
}
