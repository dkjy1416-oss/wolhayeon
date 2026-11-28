/**
 * 11/28 운영자 요청: 관리자 첫 화면 — 메타 광고 효율 · 어디서 들어왔나 · 상품 3개(재회/카톡/책)가 어느 단계까지 갔고
 * 결제를 누르고 취소했는지를 한 화면에서. (서버 전용 · 운영자 테스트 주문 제외)
 *
 * 데이터: site_events(방문·시작·단계), payment_events(결제 버튼·토스 결제창·취소/실패), ritual_orders(재회·책 주문), 카톡 주문(저장소 JSON)
 * 결제 완료·매출은 '기간 안에 결제된 것' 기준(신청일과 무관). 앞 단계는 기간 안의 방문자·주문 기준.
 */
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { isOperatorEmail, kstDaysAgoStartIso, kstTodayStartIso } from "@/lib/admin-util";
import { listChatOrders } from "@/lib/chat/store";

export type Step = { label: string; n: number; hint?: string };
export type ProductFunnel = {
  key: "ritual" | "chat" | "book";
  title: string;
  steps: Step[];
  paid: number;
  revenue: number;
  cancel: number;
  fail: number;
  note?: string;
};
export type SourceRow = {
  label: string;
  ad: boolean;
  visitors: number;
  ritualStart: number;
  chatStart: number;
  paid: number;
  revenue: number;
};
export type Overview = {
  days: number;
  since: string;
  products: ProductFunnel[];
  sales: { label: string; n: number; rev: number }[];
  sources: SourceRow[];
  ad: { visitors: number; starts: number; paid: number; revenue: number };
  total: { visitors: number; paid: number; revenue: number };
};

const CANCEL = new Set(["USER_CANCEL", "PAY_PROCESS_CANCELED", "PAY_PROCESS_ABORTED"]);
const HOSTS: Array<[RegExp, string]> = [
  [/instagram\.com$/i, "인스타그램 (링크)"],
  [/facebook\.com$|fb\.com$|fb\.me$/i, "페이스북 (링크)"],
  [/threads\.net$/i, "스레드"],
  [/google\./i, "구글 검색"],
  [/naver\.com$/i, "네이버"],
  [/daum\.net$|kakao\.com$/i, "다음·카카오"],
  [/t\.co$|x\.com$|twitter\.com$/i, "X(트위터)"],
  [/youtube\.com$|youtu\.be$/i, "유튜브"],
];

/** 메타(페북·인스타) 광고로 들어온 유입인가: 출처가 메타이고, 인스타 프로필 링크(link_in_bio)가 아니며 캠페인/광고 이름이 붙은 것 */
function isMetaAd(src?: string | null, campaign?: string | null, content?: string | null): boolean {
  if (!src || !/^(fb|facebook|ig|instagram|meta|an)$/i.test(src)) return false;
  if (content === "link_in_bio" || campaign === "link_in_bio") return false;
  return !!(campaign || content);
}
function label(src?: string | null, campaign?: string | null, content?: string | null, host?: string | null): string {
  if (src) {
    const s = /^(ig|instagram|insta)$/i.test(src) ? "인스타그램" : /^(fb|facebook)$/i.test(src) ? "페이스북" : src;
    if (content === "link_in_bio" || campaign === "link_in_bio") return `${s} · 프로필 링크`;
    return [isMetaAd(src, campaign, content) ? `메타 광고 (${s})` : s, campaign, content].filter(Boolean).join(" · ");
  }
  if (!host) return "직접 방문 (주소·북마크·앱 안 링크)";
  for (const [re, n] of HOSTS) if (re.test(host)) return n;
  return host;
}
const base = (p: string | null) => (p ?? "").split("#")[0].split("?")[0];

type Ev = {
  created_at: string;
  visitor_id: string;
  event: string;
  path: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_content?: string | null;
  first_ref_host: string | null;
  order_number: string | null;
};
type Pe = { order_number: string; event: string; code: string | null };
type Ro = {
  order_number: string;
  email: string | null;
  created_at: string;
  preview_generated_at: string | null;
  payment_status: string;
  payment_amount: number | null;
  paid_at: string | null;
  product: string | null;
  payment_method: string | null;
};

export async function getOverview(days: number): Promise<Overview> {
  const d = [1, 7, 30].includes(days) ? days : 7;
  const since = d === 1 ? kstTodayStartIso() : kstDaysAgoStartIso(d - 1);
  const sb = getSupabaseAdmin();
  const roCols = "order_number, email, created_at, preview_generated_at, payment_status, payment_amount, paid_at, product, payment_method";

  const [evRes, peRes, createdRes, paidRes, chatAll] = await Promise.all([
    fetchAll<Ev>((a, b) =>
      sb
        .from("site_events")
        .select("created_at, visitor_id, event, path, utm_source, utm_campaign, utm_content, first_ref_host, order_number")
        .gte("created_at", since)
        .order("id")
        .range(a, b)
    ),
    fetchAll<Pe>((a, b) =>
      sb.from("payment_events").select("order_number, event, code").gte("created_at", since).not("event", "like", "sweep%").order("id").range(a, b)
    ),
    fetchAll<Ro>((a, b) => sb.from("ritual_orders").select(roCols).gte("created_at", since).order("created_at").range(a, b)),
    fetchAll<Ro>((a, b) => sb.from("ritual_orders").select(roCols).gte("paid_at", since).order("paid_at").range(a, b)),
    listChatOrders(400).catch(() => []),
  ]);

  const opOrders = new Set<string>();
  const created = createdRes.data.filter((r) => {
    if (isOperatorEmail(r.email)) {
      opOrders.add(r.order_number);
      return false;
    }
    return true;
  });
  const paidRo = paidRes.data.filter((r) => {
    if (isOperatorEmail(r.email)) {
      opOrders.add(r.order_number);
      return false;
    }
    return r.payment_status === "paid";
  });
  const chats = chatAll.filter((c) => !isOperatorEmail(c.email));
  for (const c of chatAll) if (isOperatorEmail(c.email)) opOrders.add(c.order_number);

  const ev = evRes.data.filter((e) => !e.order_number || !opOrders.has(e.order_number));
  const pe = peRes.data.filter((p) => !opOrders.has(p.order_number));

  /* 방문자별 유입 출처 (이벤트에 실린 첫 유입 정보) */
  const vSrc = new Map<string, { label: string; ad: boolean }>();
  for (const e of ev) {
    if (vSrc.has(e.visitor_id) && !e.utm_source) continue;
    vSrc.set(e.visitor_id, {
      label: label(e.utm_source, e.utm_campaign, e.utm_content ?? null, e.first_ref_host),
      ad: isMetaAd(e.utm_source, e.utm_campaign, e.utm_content ?? null),
    });
  }
  const visitorsOn = (test: (p: string) => boolean) =>
    new Set(ev.filter((e) => e.event === "view" && test(base(e.path))).map((e) => e.visitor_id));
  const visitorsWith = (name: string, step?: string) =>
    new Set(ev.filter((e) => e.event === name && (!step || (e.path ?? "").split("#")[1] === step)).map((e) => e.visitor_id));
  const ordersWith = (names: string[], pool?: Set<string>) =>
    new Set(pe.filter((p) => names.includes(p.event) && (!pool || pool.has(p.order_number))).map((p) => p.order_number));
  const cancelOf = (pool: Set<string>) =>
    new Set(pe.filter((p) => pool.has(p.order_number) && (p.event === "pay_fail" || p.event === "pay_request_error") && p.code && CANCEL.has(p.code)).map((p) => p.order_number)).size;
  const failOf = (pool: Set<string>) =>
    new Set(
      pe
        .filter((p) => pool.has(p.order_number) && (p.event === "pay_fail" || p.event === "confirm_failed" || p.event === "amount_mismatch") && !(p.code && CANCEL.has(p.code)))
        .map((p) => p.order_number)
    ).size;

  /* ---------- 재회 분석 ---------- */
  const ritualCreated = created.filter((r) => r.product !== "book");
  const ritualPool = new Set(ritualCreated.map((r) => r.order_number));
  const previewViewed = new Set(ev.filter((e) => e.event === "preview_view" && e.order_number && ritualPool.has(e.order_number)).map((e) => e.order_number as string));
  const payClick = new Set([
    ...ordersWith(["preview_cta_click", "pay_sheet_ready"], ritualPool),
    ...ev.filter((e) => e.event === "payment_cta_click" && e.order_number && ritualPool.has(e.order_number)).map((e) => e.order_number as string),
  ]);
  const ritualPaidRows = paidRo.filter((r) => r.product !== "book" && r.payment_method !== "chat_bundle");
  const comboPaid = chats.filter((c) => c.combo_ritual_order && c.pay_status === "paid" && c.paid_at && c.paid_at >= since);
  const ritual: ProductFunnel = {
    key: "ritual",
    title: "재회 분석",
    steps: [
      { label: "첫 화면 방문", n: visitorsOn((p) => p === "/" || p === "/apply" || p === "/apply/v2").size },
      { label: "시작 누름", n: visitorsWith("apply_start").size },
      { label: "질문 절반 (사연 단계)", n: visitorsWith("apply_step", "story").size },
      { label: "정보 입력 끝 (신청)", n: ritualCreated.length },
      { label: "미리보기 열람", n: previewViewed.size },
      { label: "결제 버튼 누름", n: payClick.size },
      { label: "토스 결제창 열림", n: ordersWith(["pay_request"], ritualPool).size },
    ],
    paid: ritualPaidRows.length + comboPaid.length,
    revenue: ritualPaidRows.reduce((s, r) => s + (r.payment_amount ?? 0), 0) + comboPaid.reduce((s, c) => s + (c.amount ?? 0), 0),
    cancel: cancelOf(ritualPool),
    fail: failOf(ritualPool),
  };

  /* ---------- 카톡 분석 ---------- */
  const chatCreated = chats.filter((c) => !c.combo_ritual_order && c.created_at >= since);
  const chatPaid = chats.filter((c) => !c.combo_ritual_order && c.pay_status === "paid" && c.paid_at && c.paid_at >= since);
  const chatPool = new Set(chatCreated.map((c) => c.order_number));
  const chat: ProductFunnel = {
    key: "chat",
    title: "카톡 분석",
    steps: [
      { label: "첫 화면 방문", n: visitorsOn((p) => p === "/chat").size },
      { label: "무료 분석 시작", n: visitorsWith("chat_start").size, hint: "파일/캡처 고르기" },
      { label: "결제 정보 입력", n: visitorsWith("chat_form").size },
      { label: "주문 만듦 (결제 직전)", n: chatCreated.length },
      { label: "토스 결제창 열림", n: ordersWith(["pay_request"], chatPool).size },
    ],
    paid: chatPaid.length,
    revenue: chatPaid.reduce((s, c) => s + (c.amount ?? 0), 0),
    cancel: cancelOf(chatPool),
    fail: failOf(chatPool),
    note: `주문 만들고 결제 안 한 주문 ${chatCreated.filter((c) => c.pay_status !== "paid").length}건`,
  };

  /* ---------- 심층 리포트 (책) ---------- */
  const bookCreated = created.filter((r) => r.product === "book");
  const bookPool = new Set(bookCreated.map((r) => r.order_number));
  const bookPaidRows = paidRo.filter((r) => r.product === "book");
  const book: ProductFunnel = {
    key: "book",
    title: "심층 리포트 (책)",
    steps: [
      { label: "책 페이지 방문", n: visitorsOn((p) => p === "/book").size },
      { label: "주문 만듦", n: bookCreated.length },
      { label: "토스 결제창 열림", n: ordersWith(["pay_request"], bookPool).size },
    ],
    paid: bookPaidRows.length,
    revenue: bookPaidRows.reduce((s, r) => s + (r.payment_amount ?? 0), 0),
    cancel: cancelOf(bookPool),
    fail: failOf(bookPool),
    note: "재회 분석+책 묶음은 재회 분석 쪽 매출에 들어가요",
  };

  /* ---------- 상품별 매출 ---------- */
  const sale = (lbl: string, rows: { amount: number }[]) => ({ label: lbl, n: rows.length, rev: rows.reduce((s, r) => s + r.amount, 0) });
  const amt = (r: Ro) => ({ amount: r.payment_amount ?? 0 });
  const sales = [
    sale("재회 분석", ritualPaidRows.filter((r) => r.product !== "bundle").map(amt)),
    sale("재회 분석 + 책", ritualPaidRows.filter((r) => r.product === "bundle").map(amt)),
    sale("재회 분석 + 카톡 (재회 결제창)", comboPaid.map((c) => ({ amount: c.amount ?? 0 }))),
    sale("카톡 분석", chatPaid.filter((c) => c.product !== "chat_bundle").map((c) => ({ amount: c.amount ?? 0 }))),
    sale("카톡 + 재회 (카톡 결제창)", chatPaid.filter((c) => c.product === "chat_bundle").map((c) => ({ amount: c.amount ?? 0 }))),
    sale("심층 리포트 (책)", bookPaidRows.map(amt)),
    /* 11/28: 카톡 리포트 뒤 '월화에게 묻기' 추가 결제 (3번 4,900원) */
    sale("월화에게 묻기 (추가 질문)", chats.flatMap((c) => (c.ask_payments ?? []).filter((x) => x.at >= since && x.amount > 0).map((x) => ({ amount: x.amount })))),
  ];

  /* ---------- 유입 출처별 (결제까지) ---------- */
  const rows = new Map<string, SourceRow>();
  const row = (l: string, ad: boolean) => {
    let r = rows.get(l);
    if (!r) rows.set(l, (r = { label: l, ad, visitors: 0, ritualStart: 0, chatStart: 0, paid: 0, revenue: 0 }));
    return r;
  };
  const seen = new Set<string>();
  for (const e of ev) {
    const s = vSrc.get(e.visitor_id);
    if (!s) continue;
    const r = row(s.label, s.ad);
    const k = (t: string) => `${t}:${e.visitor_id}`;
    if (e.event === "view" && !seen.has(k("v"))) (seen.add(k("v")), r.visitors++);
    if (e.event === "apply_start" && !seen.has(k("a"))) (seen.add(k("a")), r.ritualStart++);
    if (e.event === "chat_start" && !seen.has(k("c"))) (seen.add(k("c")), r.chatStart++);
  }
  /* 재회·책 결제 → 그 주문을 만든 방문자의 출처 */
  const orderVisitor = new Map<string, string>();
  for (const e of ev) if (e.order_number && !orderVisitor.has(e.order_number)) orderVisitor.set(e.order_number, e.visitor_id);
  for (const r of paidRo.filter((x) => x.payment_method !== "chat_bundle")) {
    const v = orderVisitor.get(r.order_number);
    const s = v ? vSrc.get(v) : undefined;
    const t = row(s?.label ?? "알 수 없음 (기간 전 방문)", s?.ad ?? false);
    t.paid++;
    t.revenue += r.payment_amount ?? 0;
  }
  /* 카톡 결제 → 주문에 저장된 유입 정보 */
  for (const c of chats.filter((x) => x.pay_status === "paid" && x.paid_at && x.paid_at >= since)) {
    const u = (c.utm ?? {}) as Record<string, string>;
    if (c.combo_ritual_order) {
      const v = orderVisitor.get(c.combo_ritual_order);
      const s = v ? vSrc.get(v) : undefined;
      const t = row(s?.label ?? "알 수 없음 (기간 전 방문)", s?.ad ?? false);
      t.paid++;
      t.revenue += c.amount ?? 0;
      continue;
    }
    const t = row(label(u.s, u.c, u.x, null), isMetaAd(u.s, u.c, u.x));
    t.paid++;
    t.revenue += c.amount ?? 0;
  }
  const sources = [...rows.values()].filter((r) => r.visitors || r.paid).sort((a, b) => b.revenue - a.revenue || b.visitors - a.visitors);
  const adRows = sources.filter((r) => r.ad);
  const totalVisitors = new Set(ev.filter((e) => e.event === "view").map((e) => e.visitor_id)).size;
  const totalRev = sales.reduce((s, x) => s + x.rev, 0);
  return {
    days: d,
    since,
    products: [ritual, chat, book],
    sales,
    sources: sources.slice(0, 25),
    ad: {
      visitors: adRows.reduce((s, r) => s + r.visitors, 0),
      starts: adRows.reduce((s, r) => s + r.ritualStart + r.chatStart, 0),
      paid: adRows.reduce((s, r) => s + r.paid, 0),
      revenue: adRows.reduce((s, r) => s + r.revenue, 0),
    },
    total: { visitors: totalVisitors, paid: sales.reduce((s, x) => s + x.n, 0), revenue: totalRev },
  };
}
