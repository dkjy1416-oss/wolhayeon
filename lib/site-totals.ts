import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { isOperatorEmail } from "@/lib/admin-util";

/**
 * 11/17 운영자 요청: 홈에 "지금까지 이만큼 찾아왔다" 누적 숫자를 크게.
 * - 전부 실제 DB 집계. 지어낸 숫자·반올림 부풀리기 없음. 운영자·테스트 주문(isOperatorEmail)은 뺀다.
 * - stories: 사연을 남긴 분 (ritual_orders 행 수 — 신청 1건 = 1명으로 셈)
 * - previews: 무료 미리보기를 받아 본 분 (preview_generated_at 있음)
 * - views: 누적 페이지 방문 (site_events 'view' 행 수 = 조회 수, 같은 사람의 여러 번 방문 포함)
 * - visitors: 누적 방문자 (view 이벤트의 서로 다른 visitor_id 수 = 사람 수). 11/17: 홈 "누적 고객 N명" 말풍선
 * - 1시간 캐시 (모든 서버 인스턴스 공통)
 */
export interface SiteTotals {
  stories: number;
  previews: number;
  views: number;
  visitors: number;
  /** 집계 시각 ISO */
  at: string;
}

async function compute(): Promise<SiteTotals | null> {
  try {
    const sb = getSupabaseAdmin();
    const [orders, views, vis] = await Promise.all([
      fetchAll<{ email: string | null; preview_generated_at: string | null }>(
        (a, b) => sb.from("ritual_orders").select("email, preview_generated_at").order("id").range(a, b),
        200_000
      ),
      sb.from("site_events").select("id", { count: "exact", head: true }).eq("event", "view"),
      fetchAll<{ visitor_id: string | null }>(
        (a, b) => sb.from("site_events").select("visitor_id").eq("event", "view").order("id").range(a, b),
        500_000
      ),
    ]);
    if (orders.error && orders.data.length === 0) return null;
    const real = orders.data.filter((o) => !isOperatorEmail(o.email));
    return {
      stories: real.length,
      previews: real.filter((o) => o.preview_generated_at).length,
      views: views.error ? 0 : views.count ?? 0,
      visitors: new Set(vis.data.map((r) => r.visitor_id).filter(Boolean)).size,
      at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export const getSiteTotals = unstable_cache(compute, ["site-totals-v2"], { revalidate: 3600 });
