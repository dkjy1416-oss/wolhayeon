/**
 * 홍보 제안 생성 (서버 전용) — 최근 마케팅 통계를 Claude가 읽고 이번 주 홍보 계획을 제안
 * 결과는 promo_reports 테이블에 저장 (테이블이 없으면 저장만 생략)
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getMarketingStats, type MarketingStats } from "@/lib/marketing-stats";
import { getModelId } from "@/lib/ritual-generate";

export interface PromoReport {
  headline: string;
  who: string; // 지금 주 고객
  why: string; // 그들이 오는 이유
  problems: string[]; // 지금 가장 큰 문제(이탈 등)
  channels: { name: string; why: string; how: string; example: string }[];
  this_week: string[]; // 이번 주 바로 할 일
  copy_ideas: string[]; // 게시물/광고 문구 예시
  timing: string;
  avoid: string[]; // 하면 안 되는 것
}

export interface StoredPromo {
  id: number;
  created_at: string;
  period_days: number;
  report: PromoReport;
}

function compactStats(s: MarketingStats) {
  return {
    기간: `${s.days}일`,
    방문기록시작: s.trackingSince,
    전체: s.total,
    오늘: s.today,
    단계별이탈: s.dropoff,
    결제실패이유: s.payFails,
    세그먼트: s.segments.map((g) => ({
      항목: g.title,
      값: g.rows.slice(0, 8).map((r) => `${r.label}: 신청 ${r.applied}, 미리보기 ${r.preview}, 결제 ${r.paid}, 결제율 ${r.conv}%`),
    })),
    유입경로: s.sources.slice(0, 10),
    기기: s.devices,
    시간대별신청: s.hours,
    자동인사이트: s.insights,
  };
}

const SYSTEM = `당신은 작은 1인 온라인 서비스의 마케팅 코치입니다.
서비스: 월하연(thewolha.com) — 헤어진 사람·짝사랑·애매한 관계로 마음이 힘든 사람이 사연을 쓰면, '월화'라는 캐릭터가 무료 미리보기 후 유료로 개인 편지·마음 정리 리추얼·21일 플랜을 주는 서비스. 메시지 12,900원(10/4까지, 이후 16,900원), PDF 책 29,000원, 패키지 39,900원(10/4까지, 이후 42,900원).
운영자는 개발을 모르는 1인 사장님입니다. 쉬운 한국어로, 오늘 바로 실행할 수 있게 구체적으로 쓰세요.

원칙:
- 반드시 주어진 숫자에 근거하세요. 데이터가 적으면 적다고 말하고, 추측은 추측이라고 쓰세요.
- 재회를 보장하는 표현, 가짜 후기·조작된 사용자 수, 불안을 과도하게 자극하는 문구는 제안하지 마세요.
- 미성년자(중·고등학생)를 겨냥한 광고·타깃팅은 제안하지 마세요.
- 유료 광고는 소액 테스트(하루 1~2만원)부터, 무료 채널(인스타 릴스, 스레드, 네이버 블로그 등)을 우선 고려하세요.
- 홍보 링크에는 utm_source를 붙여 대시보드에서 어느 채널이 효과 있는지 볼 수 있게 안내하세요.

출력은 JSON 하나만 (설명·코드블록 없이). 각 문장은 짧게(한 항목 2문장 이내), channels는 3~4개:
{"headline": "한 줄 요약",
 "who": "지금 주로 오는 사람 (성별·나이대·상황, 숫자 포함)",
 "why": "그들이 찾아오는 이유와 결제하는 이유",
 "problems": ["지금 가장 큰 문제 1~3개 (이탈 구간 등, 숫자 포함)"],
 "channels": [{"name": "채널", "why": "이 채널인 이유", "how": "구체적으로 어떻게 (빈도·형식)", "example": "게시물/광고 예시 한 개"}],
 "this_week": ["이번 주 할 일 3~6개, 순서대로"],
 "copy_ideas": ["바로 쓸 수 있는 문구 4~6개"],
 "timing": "언제 올리면 좋은지 (시간대 데이터 근거)",
 "avoid": ["하지 말아야 할 것 2~4개"]}`;

export async function generatePromoReport(days = 14): Promise<StoredPromo | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return { error: "config_missing" };
  const stats = await getMarketingStats(days);
  const compact = compactStats(stats);

  let report: PromoReport | null = null;
  const client = new Anthropic({ apiKey });
  for (let attempt = 0; attempt < 2 && !report; attempt++) {
    try {
      const msg = await client.messages.create({
        model: getModelId(),
        max_tokens: 8000,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `오늘(${new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}) 기준 최근 ${days}일 데이터입니다:\n${JSON.stringify(compact)}`,
          },
        ],
      });
      const text = msg.content
        .filter((c) => c.type === "text")
        .map((c) => (c as { text: string }).text)
        .join("");
      const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
      const parsed = JSON.parse(json) as PromoReport;
      if (!parsed.headline || !Array.isArray(parsed.channels)) throw new Error("shape");
      parsed.problems ??= [];
      parsed.this_week ??= [];
      parsed.copy_ideas ??= [];
      parsed.avoid ??= [];
      report = parsed;
      if (msg.stop_reason === "max_tokens") console.error("[promo] truncated_but_parsed");
    } catch (e) {
      console.error(
        `[promo] ai_failed attempt=${attempt} ${e instanceof Anthropic.APIError ? `api_${e.status}` : e instanceof Error ? e.name + ":" + e.message.slice(0, 60) : "unknown"}`
      );
    }
  }
  if (!report) return { error: "ai_failed" };

  const created_at = new Date().toISOString();
  try {
    const ins = await getSupabaseAdmin()
      .from("promo_reports")
      .insert({ period_days: days, stats: compact, report: JSON.stringify(report) })
      .select("id, created_at")
      .single();
    if (!ins.error && ins.data) {
      return { id: ins.data.id as number, created_at: ins.data.created_at as string, period_days: days, report };
    }
  } catch {
    /* 저장 실패해도 결과는 반환 */
  }
  return { id: 0, created_at, period_days: days, report };
}

export async function getLatestPromo(): Promise<StoredPromo | null> {
  try {
    const r = await getSupabaseAdmin()
      .from("promo_reports")
      .select("id, created_at, period_days, report")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (r.error || !r.data) return null;
    return {
      id: r.data.id as number,
      created_at: r.data.created_at as string,
      period_days: r.data.period_days as number,
      report: JSON.parse(r.data.report as string) as PromoReport,
    };
  } catch {
    return null;
  }
}
