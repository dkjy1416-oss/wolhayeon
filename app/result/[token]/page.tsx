import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { RESULT_TOKEN_RE, canShowResult } from "@/lib/result-access";
import { CONTENT_VIEW_LINE, formatViewWindow } from "@/lib/content-access-policy";
import { RitualResultSchema } from "@/lib/ritual-result-schema";
import type SummaryCard from "@/components/result/SummaryCard";
import ResultBody from "@/components/result/ResultBody";
import { PreviewSchema, NOW_STANCE_LABELS } from "@/lib/ritual-preview-schema";
import { reviewPath } from "@/lib/review-auth";

/** 항상 동적 서버 조회 — 정적 생성/공용 캐시 금지 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * 모든 실패 사유(토큰 오류/승인 전/미결제/검수 전/검증 실패)를
 * 완전히 동일한 화면으로 처리 — 내부 상태를 외부에 노출하지 않음.
 */
function NotAvailable() {
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <p className="text-xs tracking-[0.35em] text-gold/80">월하연 月下緣</p>
      <h1 className="font-display mt-6 text-xl leading-relaxed text-ivory">
        결과를 찾을 수 없습니다.
      </h1>
      <p className="mt-4 text-[0.85rem] font-light leading-[1.9] text-ivory-dim">
        주소가 정확한지 다시 확인해주세요.
      </p>
      <Link
        href="/"
        className="mt-9 inline-flex h-12 items-center justify-center rounded-full border border-gold-dim/40 px-8 text-sm text-ivory"
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  /* 토큰 형식이 아니면 DB 조회 없이 동일 화면 */
  if (typeof token !== "string" || !RESULT_TOKEN_RE.test(token)) {
    return <NotAvailable />;
  }

  let name = "";
  let reviewHref: string | null = null;
  let viewWindow: string | null = null;
  let hasBook = false;
  let maskedEmail: string | null = null;
  let summary: React.ComponentProps<typeof SummaryCard> | null = null;
  let content: ReturnType<typeof RitualResultSchema.safeParse>["data"] | null =
    null;

  try {
    const supabase = getSupabaseAdmin();

    /* 조회만 수행 — 어떤 컬럼도 수정하지 않음 (delivery/approved/reviewed 불변) */
    const r = await supabase
      .from("ritual_results")
      .select("order_id, approved_at, reviewed_content")
      .eq("result_token", token)
      .maybeSingle();
    if (r.error || !r.data) return <NotAvailable />;

    const o = await supabase
      .from("ritual_orders")
      .select("applicant_name, payment_status, generation_status, review_status, paid_at, order_number, product, email, preview_content")
      .eq("id", r.data.order_id)
      .maybeSingle();
    if (o.error || !o.data) return <NotAvailable />;

    /* 공개 조건 판정 (하나라도 실패 시 동일 화면) */
    if (!canShowResult(r.data, o.data)) return <NotAvailable />;

    /* 고객 제공본은 reviewed_content 하나뿐 — generated_content 폴백 금지 */
    const parsed = RitualResultSchema.safeParse(r.data.reviewed_content);
    if (!parsed.success) {
      // 승인본 파손: 사유는 로그 코드로만 (토큰/콘텐츠 미기록)
      console.error("[result] approved_content_invalid");
      return <NotAvailable />;
    }

    name = o.data.applicant_name;
    reviewHref = o.data.order_number ? reviewPath(o.data.order_number as string) : null;
    content = parsed.data;
    viewWindow = formatViewWindow(o.data.paid_at);
    hasBook = o.data.product === "bundle" || o.data.product === "book";
    const em = typeof o.data.email === "string" ? o.data.email : "";
    const at = em.indexOf("@");
    if (at > 0) maskedEmail = `${em.slice(0, Math.min(3, at))}***${em.slice(at)}`;
    const pv = PreviewSchema.safeParse(o.data.preview_content);
    if (pv.success) {
      summary = {
        name: o.data.applicant_name,
        stateLabel: pv.data.relationship_state.label,
        modes: pv.data.partner_reading.modes,
        stanceLabel: NOW_STANCE_LABELS[pv.data.now_plan.stance],
        period: pv.data.now_plan.period,
        decideRule: pv.data.now_plan.decide_rule,
        cautions: pv.data.cautions.map((x) => x.action).slice(0, 3),
      };
    }
  } catch {
    console.error("[result] lookup_failed");
    return <NotAvailable />;
  }

  if (!content) return <NotAvailable />;
  const c = content;
  const viewPeriodLine = viewWindow
    ? `열람 가능 기간: ${viewWindow}`
    : CONTENT_VIEW_LINE;

  return (
    <ResultBody
      token={token}
      name={name}
      viewPeriodLine={viewPeriodLine}
      c={c}
      hasBook={hasBook}
      maskedEmail={maskedEmail}
      summary={summary}
      reviewHref={reviewHref}
    />
  );
}
