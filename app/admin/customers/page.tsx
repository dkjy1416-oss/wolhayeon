import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isOperatorEmail, won } from "@/lib/admin-util";
import CsvButton from "@/components/admin/CsvButton";

export const dynamic = "force-dynamic";

/**
 * /admin/customers — 고객(이메일) 단위 보기
 * 같은 이메일의 주문을 묶어 결제 횟수·누적 결제액·산 상품·마지막 활동·마케팅 수신 동의를 보여 준다.
 */
interface OrderRow {
  order_number: string;
  applicant_name: string | null;
  email: string | null;
  payment_status: string;
  payment_amount: number | null;
  product: string | null;
  created_at: string;
  consent_marketing: boolean | null;
}
interface Customer {
  email: string;
  name: string;
  orders: number;
  paid: number;
  total: number;
  products: Set<string>;
  first: string;
  last: string;
  marketing: boolean;
  latestOrder: string;
}

const PRODUCT_LABEL: Record<string, string> = { message: "메시지", book: "책", bundle: "패키지" };
const kst = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "2-digit", month: "2-digit", day: "2-digit" });

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; f?: string }>;
}) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 60);
  const f = ["paid", "unpaid", "repeat", "marketing"].includes(sp.f ?? "") ? (sp.f as string) : "all";

  let rows: OrderRow[] = [];
  let loadError = false;
  try {
    const res = await getSupabaseAdmin()
      .from("ritual_orders")
      .select("order_number, applicant_name, email, payment_status, payment_amount, product, created_at, consent_marketing")
      .order("created_at", { ascending: false })
      .limit(3000);
    if (res.error || !res.data) throw new Error();
    rows = res.data as OrderRow[];
  } catch {
    loadError = true;
  }

  const map = new Map<string, Customer>();
  for (const r of rows) {
    const email = (r.email ?? "").trim().toLowerCase();
    if (!email || isOperatorEmail(email)) continue;
    const c =
      map.get(email) ??
      ({
        email,
        name: (r.applicant_name ?? "").trim(),
        orders: 0,
        paid: 0,
        total: 0,
        products: new Set<string>(),
        first: r.created_at,
        last: r.created_at,
        marketing: false,
        latestOrder: r.order_number,
      } as Customer);
    c.orders += 1;
    if (r.payment_status === "paid") {
      c.paid += 1;
      c.total += r.payment_amount ?? 0;
      c.products.add(PRODUCT_LABEL[r.product ?? "message"] ?? "메시지");
    }
    if (r.created_at < c.first) c.first = r.created_at;
    if (r.created_at > c.last) {
      c.last = r.created_at;
      c.latestOrder = r.order_number;
      if (r.applicant_name) c.name = r.applicant_name.trim();
    }
    if (r.consent_marketing) c.marketing = true;
    map.set(email, c);
  }
  let customers = [...map.values()].sort((a, b) => (a.last < b.last ? 1 : -1));
  const all = customers;
  if (q) customers = customers.filter((c) => c.email.includes(q) || c.name.toLowerCase().includes(q));
  if (f === "paid") customers = customers.filter((c) => c.paid > 0);
  if (f === "unpaid") customers = customers.filter((c) => c.paid === 0);
  if (f === "repeat") customers = customers.filter((c) => c.paid >= 2);
  if (f === "marketing") customers = customers.filter((c) => c.marketing);

  const FILTERS = [
    { key: "all", label: `전체 ${all.length}` },
    { key: "paid", label: `구매 고객 ${all.filter((c) => c.paid > 0).length}` },
    { key: "unpaid", label: `미구매 ${all.filter((c) => c.paid === 0).length}` },
    { key: "repeat", label: `재구매 ${all.filter((c) => c.paid >= 2).length}` },
    { key: "marketing", label: `마케팅 수신 동의 ${all.filter((c) => c.marketing).length}` },
  ];
  const revenue = all.reduce((a, c) => a + c.total, 0);

  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-5xl px-5 pb-20 pt-8 text-ivory">
      <h1 className="font-display text-xl font-semibold">고객</h1>
      <p className="mt-2 text-[0.75rem] text-ivory-dim">
        같은 이메일의 주문을 한 명으로 묶어 보여 줘요. 누적 결제 {won(revenue)} · 구매 고객 1인당 평균{" "}
        {won(Math.round(revenue / Math.max(1, all.filter((c) => c.paid > 0).length)))}
      </p>

      <form action="/admin/customers" className="mt-4 flex gap-2">
        <input type="hidden" name="f" value={f} />
        <input
          name="q"
          defaultValue={q}
          placeholder="이름 · 이메일 검색"
          className="h-11 min-w-0 flex-1 rounded-full border border-gold-dim/30 bg-ink-soft px-4 text-[0.88rem] text-ivory outline-none focus:border-gold/60"
        />
        <button type="submit" className="h-11 shrink-0 rounded-full border border-gold-dim/50 px-5 text-[0.85rem]">
          검색
        </button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            href={`/admin/customers${x.key === "all" ? "" : `?f=${x.key}`}${q ? `${x.key === "all" ? "?" : "&"}q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-full border px-3 py-1 text-[0.76rem] ${
              f === x.key ? "border-gold/60 bg-gold/10 text-gold" : "border-gold-dim/30 text-ivory-dim"
            }`}
          >
            {x.label}
          </Link>
        ))}
        <span className="ml-auto">
          <CsvButton
            filename={`월하연_고객_${f}_${new Date().toISOString().slice(0, 10)}.csv`}
            header={["이름", "이메일", "신청 수", "결제 수", "누적 결제액", "산 상품", "첫 신청", "마지막 활동", "마케팅 수신 동의"]}
            rows={customers.map((c) => [
              c.name,
              c.email,
              c.orders,
              c.paid,
              c.total,
              [...c.products].join("+"),
              kst(c.first),
              kst(c.last),
              c.marketing ? "동의" : "",
            ])}
          />
        </span>
      </div>

      {loadError ? (
        <p className="mt-16 text-center text-sm text-ivory-dim">목록을 불러오지 못했어요. 새로고침해 주세요.</p>
      ) : customers.length === 0 ? (
        <p className="mt-16 text-center text-sm text-ivory-dim">조건에 맞는 고객이 없어요.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-gold-dim/25">
          <table className="w-full min-w-[680px] text-left text-[0.8rem]">
            <thead className="bg-ink-soft text-[0.7rem] text-ivory-dim">
              <tr>
                <th className="px-3 py-2.5">고객</th>
                <th className="px-3 py-2.5">신청 / 결제</th>
                <th className="px-3 py-2.5">누적 결제</th>
                <th className="px-3 py-2.5">산 상품</th>
                <th className="px-3 py-2.5">마지막 활동</th>
                <th className="px-3 py-2.5">수신 동의</th>
              </tr>
            </thead>
            <tbody>
              {customers.slice(0, 500).map((c) => (
                <tr key={c.email} className="border-t border-gold-dim/10">
                  <td className="px-3 py-2.5">
                    <Link href={`/admin/orders?q=${encodeURIComponent(c.email)}`} className="text-ivory underline-offset-2 hover:underline">
                      {c.name || "(이름 없음)"}
                    </Link>
                    <p className="text-[0.7rem] text-ivory-dim">{c.email}</p>
                  </td>
                  <td className="px-3 py-2.5 text-ivory-dim">
                    {c.orders} / <b className={c.paid > 0 ? "text-gold" : ""}>{c.paid}</b>
                  </td>
                  <td className="px-3 py-2.5">{c.total > 0 ? won(c.total) : "-"}</td>
                  <td className="px-3 py-2.5 text-ivory-dim">{[...c.products].join(" · ") || "-"}</td>
                  <td className="px-3 py-2.5 text-ivory-dim">{kst(c.last)}</td>
                  <td className="px-3 py-2.5">{c.marketing ? <span className="text-gold">동의</span> : <span className="text-ivory-dim/50">-</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
