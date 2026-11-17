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
 * - 1시간 캐시 (모든 서버 인스턴스 공통)
 */
export interface SiteTotals {
  stories: number;
  previews: number;
  views: number;
  /** 집계 시각 ISO */
  at: string;
}

async function compute(): Promise<SiteTotals | null> {
  try {
    const sb = getSupabaseAdmin();
    const [orders, views] = await Promise.all([
      fetchAll<{ email: string | null; preview_generated_at: string | null }>(
        (a, b) => sb.from("ritual_orders").select("email, preview_generated_at").order("id").range(a, b),
        200_000
      ),
      sb.from("site_events").select("id", { count: "exact", head: true }).eq("event", "view"),
    ]);
    if (orders.error && orders.data.length === 0) return null;
    const real = orders.data.filter((o) => !isOperatorEmail(o.email));
    return {
      stories: real.length,
      previews: real.filter((o) => o.preview_generated_at).length,
      views: views.error ? 0 : views.count ?? 0,
      at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export const getSiteTotals = unstable_cache(compute, ["site-totals-v1"], { revalidate: 3600 });
