import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import LogoutButton from "@/components/admin/LogoutButton";

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
  payment_status: string;
  generation_status: string;
  review_status: string;
  delivery_status: string;
  created_at: string;
}

export default async function AdminOrdersPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  let rows: Row[] = [];
  let versions = new Map<string, number>();
  let loadError = false;
  try {
    const supabase = getSupabaseAdmin();
    const res = await supabase
      .from("ritual_orders")
      .select(
        "id, order_number, applicant_name, payment_status, generation_status, review_status, delivery_status, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(200);
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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[0.65rem] tracking-[0.3em] text-gold/80">
            月下緣 ADMIN
          </p>
          <h1 className="font-display mt-1 text-xl font-semibold text-ivory">
            주문 목록
          </h1>
        </div>
        <LogoutButton />
      </div>

      {loadError ? (
        <p className="mt-16 text-center text-sm text-ivory-dim">
          목록을 불러오지 못했습니다. 잠시 후 새로고침해주세요.
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-16 text-center text-sm text-ivory-dim">
          아직 주문이 없습니다.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
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
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-sm text-ivory">
                    {r.applicant_name}
                  </span>
                  <Badge kind="pay" value={r.payment_status} />
                  <Badge kind="gen" value={r.generation_status} />
                  <Badge kind="rv" value={r.review_status} />
                  <Badge kind="dl" value={r.delivery_status} />
                  <span className="ml-auto text-[0.68rem] text-ivory-dim/70">
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
