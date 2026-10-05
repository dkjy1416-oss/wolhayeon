import { after } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { PAYMENTS_OPEN } from "@/lib/payment-availability";
import { APOLOGY_PRICE_KRW, BOOK_COUPON_PRICE_KRW, isPromoActive } from "@/lib/ritual-types";
import {
  isOperatorEmail,
  kstDate,
  kstDaysAgoStartIso,
  kstShort,
  kstTodayStartIso,
  won,
} from "@/lib/admin-util";
import { kickSweep } from "@/lib/sweep-kick";

export const dynamic = "force-dynamic";

/**
 * /admin — 관리자 대시보드
 * 오늘 숫자 + "지금 처리할 일" + 바로가기. 운영자 테스트 주문은 제외.
 */

interface OrderRow {
  product?: string | null;
  order_number: string;
  applicant_name: string | null;
  email: string | null;
  created_at: string;
  paid_at: string | null;
  preview_generated_at: string | null;
  payment_status: string;
  payment_amount: number | null;
  generation_status: string;
  review_status: string;
  delivery_status: string;
}

function Tile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gold-dim/25 bg-ink-soft/70 px-4 py-4">
      <p className="text-[0.7rem] text-ivory-dim">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums ${accent ? "text-gold" : ""}`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[0.68rem] text-ivory-dim/70">{sub}</p>}
    </div>
  );
}

export default async function AdminDashboard() {
  /* 멈춘 주문 자동 재처리 깨우기 (응답 뒤, 실패해도 무관) */
  after(() => kickSweep());
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const supabase = getSupabaseAdmin();
  const todayStart = kstTodayStartIso();
  const yesterdayStart = kstDaysAgoStartIso(1);
  const weekStart = kstDaysAgoStartIso(7);
  const todayKey = kstDate(new Date().toISOString());
  const yesterdayKey = kstDate(yesterdayStart);

  /* 최근 7일 주문 + 처리 필요 주문(기간 무관) */
  const [recentRes, attentionRes, csChatRes, incidentRes, failRes, reviewRes] =
    await Promise.all([
      supabase
        .from("ritual_orders")
        .select(
          "order_number, applicant_name, email, created_at, paid_at, preview_generated_at, payment_status, payment_amount, generation_status, review_status, delivery_status, product"
        )
        .gt("created_at", weekStart)
        .order("created_at", { ascending: false })
        .limit(3000),
      supabase
        .from("ritual_orders")
        .select(
          "order_number, applicant_name, email, created_at, paid_at, preview_generated_at, payment_status, payment_amount, generation_status, review_status, delivery_status, product, book_status"
        )
        .eq("payment_status", "paid")
        .order("paid_at", { ascending: false })
        .limit(500),
      supabase
        .from("cs_chat_events")
        .select("created_at")
        .gt("created_at", todayStart)
        .limit(5000),
      supabase
        .from("cs_incidents")
        .select("id")
        .eq("status", "open")
        .limit(500),
      supabase
        .from("payment_events")
        .select("order_number, event")
        .gt("created_at", todayStart)
        .in("event", ["pay_fail", "confirm_failed", "amount_mismatch"])
        .limit(2000),
      supabase.from("reviews").select("id").eq("status", "pending").limit(500),
    ]);

  const recent = ((recentRes.data ?? []) as OrderRow[]).filter(
    (r) => !isOperatorEmail(r.email)
  );
  const paidAll = ((attentionRes.data ?? []) as OrderRow[]).filter(
    (r) => !isOperatorEmail(r.email)
  );

  const dayOf = (key: string) => {
    /* 책 쿠폰 메일로 자동 만든 주문(손님이 직접 낸 신청 아님)은 신청 수에서 제외 */
    const rows = recent.filter(
      (r) => kstDate(r.created_at) === key && !(r.product === "book" && r.payment_amount === BOOK_COUPON_PRICE_KRW)
    );
    const paid = recent.filter(
      (r) => r.paid_at && kstDate(r.paid_at) === key
    );
    return {
      applied: rows.length,
      preview: rows.filter((r) => r.preview_generated_at).length,
      paid: paid.length,
      revenue: paid.reduce((s, r) => s + (r.payment_amount ?? 0), 0),
    };
  };
  const today = dayOf(todayKey);
  const yesterday = dayOf(yesterdayKey);

  /* 최근 7일 "결제일" 기준 (예전엔 신청일 기준이라 예전에 신청하고 최근 결제한 주문이 빠졌음) */
  const weekPaid = paidAll.filter((r) => r.paid_at && r.paid_at > weekStart);
  const weekRevenue = weekPaid.reduce((s, r) => s + (r.payment_amount ?? 0), 0);

  /* 지금 처리할 일 */
  const genFailed = paidAll.filter((r) => r.generation_status === "failed");
  const undelivered = paidAll.filter(
    (r) => r.generation_status === "generated" && r.delivery_status !== "sent"
  );
  const reviewWaiting = paidAll.filter(
    (r) => r.review_status === "waiting" && r.generation_status === "generated"
  );
  const openIncidents = incidentRes.error ? null : (incidentRes.data ?? []).length;
  const csToday = csChatRes.error ? null : (csChatRes.data ?? []).length;
  const payFailToday = failRes.error
    ? null
    : new Set((failRes.data ?? []).map((e: { order_number: string }) => e.order_number)).size;

  /* 결제 10분이 지났는데 결과가 아직 안 만들어진 메시지·패키지 주문 (자동 처리 누락) */
  const tenMinAgo = Date.now() - 10 * 60 * 1000;
  type Paid = OrderRow & { product?: string | null; book_status?: string | null };
  const stuck = (paidAll as Paid[]).filter(
    (r) =>
      (r.product ?? "message") !== "book" &&
      (r.generation_status === "waiting" || r.generation_status === "generating") &&
      r.paid_at &&
      Date.parse(r.paid_at) < tenMinAgo
  );
  const bookPending = (paidAll as Paid[]).filter(
    (r) =>
      (r.product === "book" || r.product === "bundle") &&
      r.book_status !== "ready" &&
      r.paid_at &&
      Date.parse(r.paid_at) < tenMinAgo
  );
  const reviewPending = reviewRes.error ? 0 : (reviewRes.data ?? []).length;

  /* 사과 쿠폰은 10/4 마감 — 마감 뒤에는 대기 건수를 보여 주지 않음 */
  const couponPending = isPromoActive()
    ? recent.filter(
        (r) => r.payment_status === "pending" && r.payment_amount === APOLOGY_PRICE_KRW
      ).length
    : 0;

  const todos: { label: string; count: number; href: string; tone: "warn" | "info" }[] = [];
  if (stuck.length)
    todos.push({ label: "결제 10분이 지났는데 결과 미생성", count: stuck.length, href: "/admin/orders?f=stuck", tone: "warn" });
  if (bookPending.length)
    todos.push({ label: "결제 10분이 지났는데 책 미완성", count: bookPending.length, href: "/admin/orders?f=book_pending", tone: "warn" });
  if (reviewPending)
    todos.push({ label: "확인 전 고객 후기", count: reviewPending, href: "/admin/reviews", tone: "info" });
  if (genFailed.length)
    todos.push({ label: "결과 생성 실패 (결제 완료 주문)", count: genFailed.length, href: "/admin/orders?f=gen_failed", tone: "warn" });
  if (undelivered.length)
    todos.push({ label: "결과 생성됐지만 메일 미발송", count: undelivered.length, href: "/admin/orders?f=undelivered", tone: "warn" });
  if (reviewWaiting.length)
    todos.push({ label: "검수 대기 결과", count: reviewWaiting.length, href: "/admin/orders?f=review", tone: "info" });
  if (payFailToday)
    todos.push({ label: "오늘 결제 실패 주문", count: payFailToday, href: "/admin/stats", tone: "warn" });
  if (openIncidents)
    todos.push({ label: "고객센터 장애 접수 (미해결)", count: openIncidents, href: "/admin/cs", tone: "warn" });

  const recentPaid = paidAll.slice(0, 6);

  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-5xl px-5 pb-20 pt-8 text-ivory">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-xl font-semibold">대시보드</h1>
        <p className="text-[0.75rem] text-ivory-dim">
          {new Date().toLocaleString("ko-KR", {
            timeZone: "Asia/Seoul",
            month: "long",
            day: "numeric",
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          기준 · 테스트 주문 제외
        </p>
      </div>

      {/* 결제 상태 */}
      <div
        className={`mt-5 flex items-center gap-3 rounded-xl border px-4 py-3 text-[0.85rem] ${
          PAYMENTS_OPEN
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-thread/50 bg-thread/10"
        }`}
      >
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            PAYMENTS_OPEN ? "bg-emerald-400" : "bg-thread"
          }`}
          aria-hidden
        />
        {PAYMENTS_OPEN
          ? "결제 정상 운영 중 (토스 상점 vwolhagv36)"
          : "결제 닫힘 — 고객에게 '결제 오픈 준비 중' 안내가 표시되는 상태"}
      </div>

      {/* 오늘 */}
      <h2 className="font-display mt-8 text-[1rem] font-semibold">오늘</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Tile label="신청" value={`${today.applied}명`} sub={`어제 ${yesterday.applied}명`} />
        <Tile label="미리보기 도달" value={`${today.preview}명`} sub={`어제 ${yesterday.preview}명`} />
        <Tile label="결제" value={`${today.paid}건`} sub={`어제 ${yesterday.paid}건`} accent={today.paid > 0} />
        <Tile label="매출" value={won(today.revenue)} sub={`어제 ${won(yesterday.revenue)}`} accent={today.revenue > 0} />
        <Tile
          label="CS 문의"
          value={csToday === null ? "–" : `${csToday}건`}
          sub="챗봇 대화 기준"
        />
      </div>
      <p className="mt-2 text-[0.75rem] text-ivory-dim">
        최근 7일 결제 {weekPaid.length}건 · 매출 {won(weekRevenue)}
        {couponPending > 0 && ` · 사과 쿠폰 대기 주문 ${couponPending}건`}
      </p>

      {/* 지금 처리할 일 */}
      <h2 className="font-display mt-8 text-[1rem] font-semibold">지금 처리할 일</h2>
      {todos.length === 0 ? (
        <p className="mt-3 rounded-xl border border-gold-dim/20 bg-ink-soft/40 px-4 py-4 text-[0.85rem] text-ivory-dim">
          처리할 일이 없어요. 👍
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {todos.map((t) => (
            <li key={t.label}>
              <Link
                href={t.href}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-[0.88rem] transition-colors hover:border-gold/50 ${
                  t.tone === "warn"
                    ? "border-thread/40 bg-thread/5"
                    : "border-gold-dim/30 bg-ink-soft/50"
                }`}
              >
                <span>{t.label}</span>
                <span className="flex items-center gap-2">
                  <b className={t.tone === "warn" ? "text-thread" : "text-gold"}>
                    {t.count}
                  </b>
                  <span className="text-ivory-dim">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* 최근 결제 */}
      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="font-display text-[1rem] font-semibold">최근 결제</h2>
        <Link href="/admin/orders?f=paid" className="text-[0.78rem] text-gold underline">
          전체 보기
        </Link>
      </div>
      {recentPaid.length === 0 ? (
        <p className="mt-3 text-[0.85rem] text-ivory-dim">아직 결제가 없어요.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {recentPaid.map((r) => (
            <li key={r.order_number}>
              <Link
                href={`/admin/orders/${r.order_number}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold-dim/20 bg-ink-soft/50 px-4 py-3 text-[0.84rem] hover:border-gold/50"
              >
                <span>
                  {(r.applicant_name ?? "").trim() || "(이름 없음)"}님
                  <span className="ml-2 font-mono text-[0.72rem] text-ivory-dim/70">
                    {r.order_number}
                  </span>
                </span>
                <span className="text-ivory-dim">
                  {won(r.payment_amount ?? 0)}
                  {r.payment_amount === APOLOGY_PRICE_KRW && (
                    <span className="ml-1 text-thread">(쿠폰)</span>
                  )}{" "}
                  · {r.paid_at ? kstShort(r.paid_at) : "-"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* 바로가기 */}
      <h2 className="font-display mt-8 text-[1rem] font-semibold">바로가기</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          ["/admin/orders", "주문 검색·관리", "이름·이메일·주문번호로 찾기"],
          ["/admin/stats", "유입·전환 통계", "일별 추이·결제 퍼널"],
          ["/admin/cs", "고객센터 현황", "문의·조회·처리·장애"],
          ["/admin/remind", "리마인드 메일", "미결제 고객 이어보기 메일"],
          ["/admin/apology", "사과 쿠폰", "결제 오류 고객 안내"],
          ["https://dashboard.tosspayments.com", "토스 상점관리자", "결제 조회·취소·정산"],
        ].map(([href, title, desc]) => (
          <Link
            key={href}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            className="rounded-xl border border-gold-dim/25 bg-ink-soft/50 px-4 py-3 hover:border-gold/50"
          >
            <p className="text-[0.88rem]">{title}</p>
            <p className="mt-0.5 text-[0.7rem] text-ivory-dim">{desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
