import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { APOLOGY_PRICE_KRW } from "@/lib/ritual-types";
import { isOperatorEmail, won } from "@/lib/admin-util";

export const dynamic = "force-dynamic";

/* 상태 → 라벨/색상 배지 */
const BADGE: Record<string, { label: string; cls: string }> = {
  // payment
  pending: { label: "결제 대기", cls: "border-gold-dim/40 text-ivory-dim" },
  paid: { label: "결제 완료", cls: "border-gold/60 text-gold" },
  failed: { label: "결제 실패", cls: "border-thread/60 text-thread" },
  refunded: { label: "환불", cls: "border-gold-dim/40 text-ivory-dim" },
  // generation
  waiting: { label: "대기", cls: "border-gold-dim/40 text-ivory-dim" },
  generating: { label: "생성 중", cls: "border-gold/50 text-gold" },
  generated: { label: "생성 완료", cls: "border-gold/60 text-gold" },
  gen_failed: { label: "생성 실패", cls: "border-thread/60 text-thread" },
  // review
  rv_waiting: { label: "검수 대기", cls: "border-gold/60 text-gold" },
  reviewing: { label: "검수 중", cls: "border-gold/50 text-ivory" },
  approved: { label: "승인 완료", cls: "border-emerald-500/60 text-emerald-400" },
  revision_required: { label: "수정 필요", cls: "border-thread/60 text-thread" },
  // delivery
  sent: { label: "발송 완료", cls: "border-gold/60 text-gold" },
};

function Badge({ kind, value }: { kind: "pay" | "gen" | "rv" | "dl"; value: string }) {
  const key =
    kind === "gen" && value === "failed"
      ? "gen_failed"
      : kind === "rv" && value === "waiting"
        ? "rv_waiting"
        : value;
  const b = BADGE[key] ?? { label: value, cls: "border-gold-dim/40 text-ivory-dim" };
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[0.68rem] whitespace-nowrap ${b.cls}`}
    >
      {b.label}
    </span>
  );
}

interface Row {
  order_number: string;
  applicant_name: string;
  email: string | null;
  payment_amount: number | null;
  payment_status: string;
  generation_status: string;
  review_status: string;
  delivery_status: string;
  created_at: string;
}

/* 목록 필터 — 대시보드 "지금 처리할 일"에서도 이 값으로 연결 */
const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "paid", label: "결제 완료" },
  { key: "pending", label: "결제 전" },
  { key: "coupon", label: "사과 쿠폰" },
  { key: "gen_failed", label: "생성 실패" },
  { key: "undelivered", label: "메일 미발송" },
  { key: "review", label: "검수 대기" },
  { key: "refunded", label: "환불" },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; f?: string }>;
}) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const sp = await searchParams;
  /* 검색어: 이름·이메일·주문번호 (PostgREST or-필터 문법 문자 제거) */
  const q = (sp.q ?? "").replace(/[,()*%\\]/g, " ").trim().slice(0, 60);
  const f = FILTERS.some((x) => x.key === sp.f) ? (sp.f as string) : "all";

  let rows: Row[] = [];
  let versions = new Map<string, number>();
  let loadError = false;
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("ritual_orders")
      .select(
        "id, order_number, applicant_name, email, payment_amount, payment_status, generation_status, review_status, delivery_status, created_at"
      );
    if (q) {
      query = query.or(
        `applicant_name.ilike.%${q}%,email.ilike.%${q}%,order_number.ilike.%${q}%`
      );
    }
    if (f === "paid") query = query.eq("payment_status", "paid");
    if (f === "pending") query = query.eq("payment_status", "pending");
    if (f === "refunded") query = query.eq("payment_status", "refunded");
    if (f === "coupon") query = query.eq("payment_amount", APOLOGY_PRICE_KRW);
    if (f === "gen_failed")
      query = query.eq("payment_status", "paid").eq("generation_status", "failed");
    if (f === "undelivered")
      query = query
        .eq("payment_status", "paid")
        .eq("generation_status", "generated")
        .neq("delivery_status", "sent");
    if (f === "review")
      query = query
        .eq("payment_status", "paid")
        .eq("generation_status", "generated")
        .eq("review_status", "waiting");
    const res = await query.order("created_at", { ascending: false }).limit(300);
    if (res.error || !res.data) throw new Error("load");
    rows = res.data;

    const ids = res.data.map((r: { id: string }) => r.id);
    if (ids.length > 0) {
      const vr = await supabase
        .from("ritual_results")
        .select("order_id, result_version")
        .in("order_id", ids);
      if (!vr.error && vr.data) {
        for (const v of vr.data) {
          const cur = versions.get(v.order_id) ?? 0;
          if (v.result_version > cur) versions.set(v.order_id, v.result_version);
        }
        // order_id → order_number 매핑으로 교체
        const byId = new Map(
          res.data.map((r: { id: string; order_number: string }) => [
            r.id,
            r.order_number,
          ])
        );
        const byNumber = new Map<string, number>();
        for (const [oid, ver] of versions) {
          const num = byId.get(oid);
          if (num) byNumber.set(num, ver);
        }
        versions = byNumber;
      }
    }
  } catch {
    loadError = true;
  }

  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-5xl px-5 pb-20 pt-8">
      <h1 className="font-display text-xl font-semibold text-ivory">주문</h1>

      {/* 검색 */}
      <form action="/admin/orders" className="mt-4 flex gap-2">
        <input type="hidden" name="f" value={f} />
        <input
          name="q"
          defaultValue={q}
          placeholder="이름 · 이메일 · 주문번호 검색"
          className="h-11 min-w-0 flex-1 rounded-full border border-gold-dim/30 bg-ink-soft px-4 text-[0.88rem] text-ivory outline-none focus:border-gold/60"
        />
        <button
          type="submit"
          className="h-11 shrink-0 rounded-full border border-gold-dim/50 px-5 text-[0.85rem] text-ivory"
        >
          검색
        </button>
      </form>

      {/* 필터 */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTERS.map((x) => {
          const params = new URLSearchParams();
          if (x.key !== "all") params.set("f", x.key);
          if (q) params.set("q", q);
          const href = `/admin/orders${params.toString() ? `?${params}` : ""}`;
          return (
            <Link
              key={x.key}
              href={href}
              className={`rounded-full border px-3 py-1 text-[0.76rem] ${
                f === x.key
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-gold-dim/30 text-ivory-dim hover:text-ivory"
              }`}
            >
              {x.label}
            </Link>
          );
        })}
      </div>
      {!loadError && (
        <p className="mt-3 text-[0.75rem] text-ivory-dim">
          {rows.length}건{rows.length >= 300 ? " (최근 300건까지 표시)" : ""}
          {q && ` · "${q}" 검색 결과`}
        </p>
      )}

      {loadError ? (
        <p className="mt-16 text-center text-sm text-ivory-dim">
          목록을 불러오지 못했습니다. 잠시 후 새로고침해주세요.
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-16 text-center text-sm text-ivory-dim">
          아직 주문이 없습니다.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.order_number}>
              <Link
                href={`/admin/orders/${r.order_number}`}
                className="block rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4 transition-colors hover:border-gold/50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-sm tracking-wider text-gold">
                    {r.order_number}
                  </span>
                  <span className="text-xs text-ivory-dim">
                    {new Date(r.created_at).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {r.email && (
                  <p className="mt-1 text-[0.72rem] text-ivory-dim/80">{r.email}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-sm text-ivory">
                    {r.applicant_name}
                  </span>
                  {isOperatorEmail(r.email) && (
                    <span className="rounded-full border border-ivory/20 px-2 py-0.5 text-[0.62rem] text-ivory-dim">
                      테스트
                    </span>
                  )}
                  {r.payment_amount === APOLOGY_PRICE_KRW && (
                    <span className="rounded-full border border-thread/50 px-2 py-0.5 text-[0.62rem] text-thread">
                      사과 쿠폰
                    </span>
                  )}
                  <Badge kind="pay" value={r.payment_status} />
                  <Badge kind="gen" value={r.generation_status} />
                  <Badge kind="rv" value={r.review_status} />
                  <Badge kind="dl" value={r.delivery_status} />
                  <span className="ml-auto text-[0.68rem] text-ivory-dim/70">
                    {typeof r.payment_amount === "number" && `${won(r.payment_amount)} · `}
                    {versions.get(r.order_number)
                      ? `v${versions.get(r.order_number)}`
                      : "결과 없음"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
