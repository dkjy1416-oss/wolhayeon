/**
 * 카톡 분석 퍼널 (관리자용, 11/3)
 * site_events 중 /chat 경로 기록만 모아 단계별 방문자 수(중복 없음)를 센다.
 *   방문(view) → 시작(chat_start) → 무료 숫자 결과(preview_view) → 신청서(chat_form)
 *   → 주문 생성(apply_complete) → 결제 화면(/chat/order 방문)
 */
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

interface Row {
  visitor_id: string;
  event: string;
  path: string | null;
  utm_medium: string | null;
  utm_content?: string | null;
}

export interface ChatFunnel {
  days: number;
  steps: { label: string; n: number }[];
  bySource: { source: string; visit: number; start: number; free: number; order: number }[];
  startMode: { file: number; quiz: number };
}

export async function getChatFunnel(days = 7): Promise<ChatFunnel | null> {
  try {
    const sb = getSupabaseAdmin();
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const rows: Row[] = [];
    for (let from = 0; from < 20000; from += 1000) {
      let res = await sb
        .from("site_events")
        .select("visitor_id,event,path,utm_medium,utm_content")
        .like("path", "/chat%")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .range(from, from + 999);
      if (res.error) {
        res = (await sb
          .from("site_events")
          .select("visitor_id,event,path,utm_medium")
          .like("path", "/chat%")
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .range(from, from + 999)) as typeof res;
      }
      const d = (res.data ?? []) as Row[];
      rows.push(...d);
      if (d.length < 1000) break;
    }
    const set = (f: (r: Row) => boolean) => new Set(rows.filter(f).map((r) => r.visitor_id));
    const isLanding = (r: Row) => r.path === "/chat" || (r.path ?? "").startsWith("/chat#");
    const visit = set((r) => r.event === "view" && r.path === "/chat");
    const start = set((r) => r.event === "chat_start" && isLanding(r));
    const free = set((r) => r.event === "preview_view" && isLanding(r));
    const form = set((r) => r.event === "chat_form" && isLanding(r));
    const order = set((r) => r.event === "apply_complete" && isLanding(r));
    const orderPage = set((r) => r.event === "view" && (r.path ?? "").startsWith("/chat/order"));
    const fileStart = set((r) => r.event === "chat_start" && r.path === "/chat#file");
    const quizStart = set((r) => r.event === "chat_start" && r.path === "/chat#quiz");

    /* 방문자별 첫 유입 이름 (utm_content 우선, 없으면 medium, 없으면 직접) */
    const src = new Map<string, string>();
    for (const r of rows) {
      if (src.has(r.visitor_id)) continue;
      src.set(r.visitor_id, r.utm_content || r.utm_medium || "직접·기타");
    }
    const agg = new Map<string, { visit: number; start: number; free: number; order: number }>();
    for (const v of visit) {
      const k = src.get(v) ?? "직접·기타";
      const a = agg.get(k) ?? { visit: 0, start: 0, free: 0, order: 0 };
      a.visit++;
      if (start.has(v)) a.start++;
      if (free.has(v)) a.free++;
      if (order.has(v)) a.order++;
      agg.set(k, a);
    }
    return {
      days,
      steps: [
        { label: "카톡 분석 페이지 방문", n: visit.size },
        { label: "분석 시작 (파일/질문)", n: start.size },
        { label: "무료 결과 확인", n: free.size },
        { label: "리포트 받기 → 신청서", n: form.size },
        { label: "주문 생성", n: order.size },
        { label: "결제 화면 도착", n: orderPage.size },
      ],
      bySource: [...agg.entries()].map(([source, a]) => ({ source, ...a })).sort((x, y) => y.visit - x.visit),
      startMode: { file: fileStart.size, quiz: quizStart.size },
    };
  } catch {
    return null;
  }
}
