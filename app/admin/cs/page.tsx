import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  CS_ACTION_LABELS,
  CS_STATUS_LABELS,
  CS_TOPIC_LABELS,
  kstDate,
  kstDaysAgoStartIso,
  kstShort,
} from "@/lib/admin-util";

export const dynamic = "force-dynamic";

/**
 * /admin/cs — 고객센터 이용 현황 (최근 14일)
 * - 챗봇 문의(주제별), 주문 조회, 인증번호, 자동 처리(환불·이메일 변경·재발송), 장애 접수
 * - 대화 원문은 저장하지 않음(주제 분류만). 주문과 연결된 기록은 고객·주문으로 바로 이동.
 */

const DAYS = 14;

interface ChatRow {
  created_at: string;
  topic: string | null;
  authenticated: boolean;
}
interface VerifRow {
  created_at: string;
  order_id: string;
  purpose: string;
  verified_at: string | null;
}
interface ActionRow {
  created_at: string;
  order_id: string | null;
  action_type: string;
  status: string;
  detail: string | null;
}
interface IncidentRow {
  created_at: string;
  order_id: string | null;
  kind: string;
  status: string;
  detail: string | null;
  resolved_at: string | null;
}
interface OrderLite {
  id: string;
  order_number: string;
  applicant_name: string | null;
  payment_status: string;
}

const PAY_LABEL: Record<string, string> = {
  pending: "결제 전",
  paid: "결제 완료",
  refunded: "환불",
  failed: "결제 실패",
};

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gold-dim/25 bg-ink-soft/70 px-4 py-4">
      <p className="text-[0.7rem] text-ivory-dim">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-[0.68rem] text-ivory-dim/70">{sub}</p>}
    </div>
  );
}

export default async function AdminCsPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const supabase = getSupabaseAdmin();
  const since = kstDaysAgoStartIso(DAYS - 1);

  const [chatRes, verifRes, actRes, incRes] = await Promise.all([
    supabase
      .from("cs_chat_events")
      .select("created_at, topic, authenticated")
      .gt("created_at", since)
      .limit(10000),
    supabase
      .from("cs_verifications")
      .select("created_at, order_id, purpose, verified_at")
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(3000),
    supabase
      .from("cs_actions")
      .select("created_at, order_id, action_type, status, detail")
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(3000),
    supabase
      .from("cs_incidents")
      .select("created_at, order_id, kind, status, detail, resolved_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const chats = (chatRes.data ?? []) as ChatRow[];
  const verifs = (verifRes.data ?? []) as VerifRow[];
  const actions = (actRes.data ?? []) as ActionRow[];
  const incidents = (incRes.data ?? []) as IncidentRow[];

  /* 주문 연결 (이름·주문번호·결제상태) */
  const orderIds = [
    ...new Set(
      [
        ...verifs.map((v) => v.order_id),
        ...actions.map((a) => a.order_id),
        ...incidents.map((i) => i.order_id),
      ].filter((v): v is string => typeof v === "string")
    ),
  ];
  const orders = new Map<string, OrderLite>();
  if (orderIds.length > 0) {
    const or = await supabase
      .from("ritual_orders")
      .select("id, order_number, applicant_name, payment_status")
      .in("id", orderIds.slice(0, 1000));
    for (const o of (or.data ?? []) as OrderLite[]) orders.set(o.id, o);
  }

  /* 요약 */
  const lookups = actions.filter((a) => a.action_type === "LIGHT_LOOKUP");
  const otpVerified = verifs.filter((v) => v.verified_at).length;
  const handled = actions.filter(
    (a) => a.action_type !== "LIGHT_LOOKUP" && a.action_type !== "OTP_REQUEST"
  );
  const openIncidents = incidents.filter((i) => i.status === "open");
  const csCustomers = new Set(
    [...verifs.map((v) => v.order_id), ...lookups.map((a) => a.order_id)].filter(Boolean)
  ).size;

  /* 주제별 */
  const topicCount = new Map<string, number>();
  for (const c of chats) {
    const t = c.topic ?? "other";
    topicCount.set(t, (topicCount.get(t) ?? 0) + 1);
  }
  const topics = [...topicCount.entries()].sort((a, b) => b[1] - a[1]);
  const maxTopic = Math.max(1, ...topics.map(([, n]) => n));

  /* 처리 유형별 */
  const handledCount = new Map<string, number>();
  for (const a of handled) handledCount.set(a.action_type, (handledCount.get(a.action_type) ?? 0) + 1);

  /* 일별 */
  const days: string[] = [];
  for (let i = 0; i < DAYS; i++) days.push(kstDate(kstDaysAgoStartIso(i)));
  const perDay = (key: string) => ({
    chat: chats.filter((c) => kstDate(c.created_at) === key).length,
    lookup: lookups.filter((a) => kstDate(a.created_at) === key).length,
    otp: verifs.filter((v) => kstDate(v.created_at) === key).length,
    handled: handled.filter((a) => kstDate(a.created_at) === key).length,
  });

  /* 최근 활동 피드 (조회·인증·처리·장애) */
  type Feed = { at: string; label: string; status: string; orderId: string | null; warn?: boolean };
  const feed: Feed[] = [
    ...actions.map((a) => ({
      at: a.created_at,
      label: CS_ACTION_LABELS[a.action_type] ?? a.action_type,
      status: CS_STATUS_LABELS[a.status] ?? a.status,
      orderId: a.order_id,
      warn: a.status === "fail" || a.status === "failed",
    })),
    ...incidents.map((i) => ({
      at: i.created_at,
      label: `장애 접수 · ${i.kind}`,
      status: CS_STATUS_LABELS[i.status] ?? i.status,
      orderId: i.order_id,
      warn: i.status === "open",
    })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 40);

  const OrderCell = ({ id }: { id: string | null }) => {
    const o = id ? orders.get(id) : undefined;
    if (!o) return <span className="text-ivory-dim/60">-</span>;
    return (
      <Link href={`/admin/orders/${o.order_number}`} className="hover:text-gold">
        {(o.applicant_name ?? "").trim() || "(이름 없음)"}
        <span className="ml-1.5 text-[0.7rem] text-ivory-dim">
          {PAY_LABEL[o.payment_status] ?? o.payment_status}
        </span>
      </Link>
    );
  };

  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-5xl px-5 pb-20 pt-8 text-ivory">
      <h1 className="font-display text-xl font-semibold">고객센터 현황</h1>
      <p className="mt-2 text-[0.78rem] text-ivory-dim">
        최근 {DAYS}일 · 대화 원문은 저장하지 않고 주제만 분류해요
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Tile label="챗봇 문의" value={chatRes.error ? "–" : `${chats.length}건`} sub={`본인확인 후 ${chats.filter((c) => c.authenticated).length}건`} />
        <Tile label="CS 이용 고객" value={`${csCustomers}명`} sub="주문 조회·인증 기준" />
        <Tile label="인증번호 요청" value={`${verifs.length}건`} sub={`인증 성공 ${otpVerified}건`} />
        <Tile label="자동 처리" value={`${handled.length}건`} sub="환불·이메일·재발송 등" />
        <Tile label="장애 접수" value={`${openIncidents.length}건`} sub={openIncidents.length ? "미해결 있음" : "미해결 없음"} />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <section>
          <h2 className="font-display text-[1rem] font-semibold">문의 주제</h2>
          {topics.length === 0 ? (
            <p className="mt-3 text-[0.82rem] text-ivory-dim">기록 없음</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2 text-[0.82rem]">
              {topics.map(([t, n]) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-ivory-dim">{CS_TOPIC_LABELS[t] ?? t}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-sm bg-ink-soft">
                    <div className="h-full bg-gold-dim/60" style={{ width: `${(n / maxTopic) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="font-display text-[1rem] font-semibold">자동 처리 내역</h2>
          {handledCount.size === 0 ? (
            <p className="mt-3 text-[0.82rem] text-ivory-dim">기록 없음</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-1.5 text-[0.82rem]">
              {[...handledCount.entries()].map(([k, n]) => (
                <li key={k} className="flex justify-between border-b border-gold-dim/10 pb-1.5">
                  <span>{CS_ACTION_LABELS[k] ?? k}</span>
                  <b className="tabular-nums">{n}</b>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <h2 className="font-display mt-10 text-[1rem] font-semibold">일별</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-[0.8rem]">
          <thead>
            <tr className="text-left text-ivory-dim">
              <th className="py-1.5 font-normal">날짜</th>
              <th className="py-1.5 text-right font-normal">챗봇</th>
              <th className="py-1.5 text-right font-normal">주문 조회</th>
              <th className="py-1.5 text-right font-normal">인증번호</th>
              <th className="py-1.5 text-right font-normal">자동 처리</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const v = perDay(d);
              const empty = !v.chat && !v.lookup && !v.otp && !v.handled;
              return (
                <tr key={d} className={`border-t border-gold-dim/10 ${empty ? "text-ivory-dim/50" : ""}`}>
                  <td className="py-1.5">{d.slice(5)}</td>
                  <td className="py-1.5 text-right tabular-nums">{v.chat}</td>
                  <td className="py-1.5 text-right tabular-nums">{v.lookup}</td>
                  <td className="py-1.5 text-right tabular-nums">{v.otp}</td>
                  <td className="py-1.5 text-right tabular-nums">{v.handled}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="font-display mt-10 text-[1rem] font-semibold">최근 활동</h2>
      {feed.length === 0 ? (
        <p className="mt-3 text-[0.82rem] text-ivory-dim">기록 없음</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {feed.map((f, i) => (
            <li
              key={`${f.at}-${i}`}
              className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-[0.8rem] ${
                f.warn ? "border-thread/40 bg-thread/5" : "border-gold-dim/15 bg-ink-soft/40"
              }`}
            >
              <span className="w-24 shrink-0 text-ivory-dim tabular-nums">{kstShort(f.at)}</span>
              <span className="min-w-[7rem]">{f.label}</span>
              <span className={f.warn ? "text-thread" : "text-ivory-dim"}>{f.status}</span>
              <span className="ml-auto">
                <OrderCell id={f.orderId} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {incidents.length > 0 && (
        <>
          <h2 className="font-display mt-10 text-[1rem] font-semibold">장애 접수 기록</h2>
          <ul className="mt-3 flex flex-col gap-1.5">
            {incidents.slice(0, 20).map((i, idx) => (
              <li
                key={`${i.created_at}-${idx}`}
                className={`rounded-lg border px-3 py-2 text-[0.8rem] ${
                  i.status === "open" ? "border-thread/40 bg-thread/5" : "border-gold-dim/15 bg-ink-soft/40"
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-3">
                  <span className="text-ivory-dim tabular-nums">{kstShort(i.created_at)}</span>
                  <span>{i.kind}</span>
                  <span className={i.status === "open" ? "text-thread" : "text-ivory-dim"}>
                    {CS_STATUS_LABELS[i.status] ?? i.status}
                  </span>
                  <span className="ml-auto">
                    <OrderCell id={i.order_id} />
                  </span>
                </div>
                {i.detail && (
                  <p className="mt-1 text-[0.72rem] text-ivory-dim">{i.detail}</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
