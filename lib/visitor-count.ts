import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";

/**
 * 최근 30일 실제 방문자 수 (site_events 'view' 이벤트의 서로 다른 visitor_id 수).
 * 11/16 요청: 홈 첫 화면 "최근 한 달간 N명이 월화를 찾았어요".
 * - 지어낸 숫자 없음: 읽기 실패하면 0 → 화면에서 숨김
 * - 1시간 캐시 (홈은 매 요청 렌더라 매번 수천 행을 읽지 않도록)
 */
const TTL_MS = 60 * 60 * 1000;
let cache: { at: number; value: number } | null = null;

export async function getRecentVisitorCount(): Promise<number> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sb = getSupabaseAdmin();
    const { data, error } = await fetchAll<{ visitor_id: string | null }>((a, b) =>
      sb
        .from("site_events")
        .select("visitor_id")
        .eq("event", "view")
        .gt("created_at", since)
        .order("id")
        .range(a, b)
    );
    if (error && data.length === 0) return cache?.value ?? 0;
    const value = new Set(data.map((r) => r.visitor_id).filter(Boolean)).size;
    cache = { at: Date.now(), value };
    return value;
  } catch {
    return cache?.value ?? 0;
  }
}
