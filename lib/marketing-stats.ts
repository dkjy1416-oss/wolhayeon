/**
 * 마케팅 통계 집계 (서버 전용) — /admin/marketing 과 홍보 제안(AI)이 함께 사용
 *
 * 데이터 출처
 * - site_events: 방문·신청 시작·미리보기·결제 버튼 (2026-10-01부터 기록)
 * - ritual_orders: 신청(주문 생성)·미리보기 도달·결제 + 성별/나이/상황
 * - payment_events: 결제 페이지 진입·실패 코드
 * 운영자 테스트 주문은 제외.
 */
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isOperatorEmail, kstDate, kstDaysAgoStartIso } from "@/lib/admin-util";
import {
  APPLICANT_GENDER_OPTIONS,
  LIFE_STAGE_OPTIONS,
  MAIN_WISH_OPTIONS,
  PAIN_POINT_OPTIONS,
  RELATIONSHIP_TYPE_OPTIONS,
  BREAKUP_ELAPSED_OPTIONS,
  CURRENT_EMOTION_OPTIONS,
  optionLabel,
} from "@/lib/ritual-types";

export interface Funnel {
  visitors: number;
  applyStart: number;
  /** 질문 묶음 1~4 완료 (apply_step 도달 기준) */
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  applied: number;
  /** 미리보기 생성 완료 (신청일 기준) */
  preview: number;
  /** 미리보기 열람 (화면을 실제로 연 주문) */
  previewView: number;
  payClick: number;
  payPage: number;
  /** 토스 결제창 진입 */
  payWindow: number;
  paid: number;
  /** 결제 실패 (토스 실패·승인 실패) */
  payFail: number;
  /** 결제창에서 사용자 취소 */
  payCancel: number;
  revenue: number;
}

/** 질문 묶음 완료 지점 — 다음 묶음의 첫 질문에 도달하면 앞 묶음 완료로 본다 */
export const QUESTION_CHECKPOINTS: Array<{ key: "q1" | "q2" | "q3" | "q4"; step: string; label: string }> = [
  { key: "q1", step: "partner_name", label: "질문 1 완료 (내 정보)" },
  { key: "q2", step: "relationship_type", label: "질문 2 완료 (상대 정보)" },
  { key: "q3", step: "story", label: "질문 3 완료 (관계 상황)" },
  { key: "q4", step: "email", label: "질문 4 완료 (사연)" },
];
const CANCEL_CODES = new Set(["USER_CANCEL", "PAY_PROCESS_CANCELED", "PAY_PROCESS_ABORTED"]);

export interface SegRow {
  label: string;
  applied: number;
  preview: number;
  paid: number;
  conv: number; // 결제/신청 %
}

export interface MarketingStats {
  days: number;
  since: string;
  trackingSince: string | null; // site_events 첫 기록 시각
  total: Funnel;
  today: Funnel;
  byDay: { day: string; f: Funnel }[];
  segments: { key: string; title: string; rows: SegRow[] }[];
  sources: { label: string; visitors: number; applied: number; preview: number; paid: number; revenue: number }[];
  /** 결제창 진입 결제수단 */
  payMethods: { label: string; count: number }[];
  devices: { label: string; visitors: number; applied: number; paid: number }[];
  payFails: { label: string; count: number }[];
  dropoff: { stage: string; lost: number; rate: number }[];
  hours: number[];
  insights: string[];
}

const empty = (): Funnel => ({
  visitors: 0,
  applyStart: 0,
  q1: 0,
  q2: 0,
  q3: 0,
  q4: 0,
  applied: 0,
  preview: 0,
  previewView: 0,
  payClick: 0,
  payPage: 0,
  payWindow: 0,
  paid: 0,
  payFail: 0,
  payCancel: 0,
  revenue: 0,
});

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

function ageBand(birthYear: number | null): string {
  if (!birthYear) return "미입력";
  const age = new Date().getFullYear() - birthYear;
  if (age < 20) return "10대";
  if (age < 25) return "20대 초반";
  if (age < 30) return "20대 후반";
  if (age < 35) return "30대 초반";
  if (age < 40) return "30대 후반";
  if (age < 50) return "40대";
  return "50대 이상";
}

const AGE_ORDER = ["10대", "20대 초반", "20대 후반", "30대 초반", "30대 후반", "40대", "50대 이상", "미입력"];

const FAIL_LABELS: Record<string, string> = {
  widget_error: "결제수단 로드 실패",
  pay_request_error: "결제창에서 중단/취소",
  pay_fail: "결제 실패",
  confirm_failed: "승인 실패",
  amount_mismatch: "금액 불일치",
};

const KNOWN_HOSTS: [RegExp, string][] = [
  [/instagram|^l\.instagram/, "인스타그램"],
  [/facebook|fb\.com/, "페이스북"],
  [/threads/, "스레드"],
  [/tiktok/, "틱톡"],
  [/youtube|youtu\.be/, "유튜브"],
  [/naver/, "네이버"],
  [/daum|kakao/, "카카오/다음"],
  [/google/, "구글"],
  [/t\.co$|twitter|x\.com/, "X(트위터)"],
];

function sourceLabel(utm: string | null, host: string | null, campaign?: string | null, content?: string | null): string {
  if (utm) return [utm, campaign, content].filter(Boolean).join(" · ");
  if (!host) return "직접 방문 (주소 입력·북마크·앱 내 링크)";
  for (const [re, name] of KNOWN_HOSTS) if (re.test(host)) return name;
  return host;
}

interface OrderRow {
  order_number: string;
  created_at: string;
  paid_at: string | null;
  preview_generated_at: string | null;
  email: string | null;
  payment_amount: number | null;
  applicant_gender: string | null;
  applicant_birth_year: number | null;
  life_stage: string | null;
  main_wish: string | null;
  pain_points: string[] | null;
  relationship_type: string | null;
  breakup_elapsed: string | null;
  current_emotion: string | null;
}

interface EventRow {
  created_at: string;
  visitor_id: string;
  event: string;
  path: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_content?: string | null;
  first_ref_host: string | null;
  device: string | null;
  order_number: string | null;
}

export async function getMarketingStats(days: number): Promise<MarketingStats> {
  const supabase = getSupabaseAdmin();
  const since = kstDaysAgoStartIso(days - 1);
  const todayKey = kstDate(new Date().toISOString());

  const [oRes, eRes, pRes, firstRes] = await Promise.all([
    supabase
      .from("ritual_orders")
      .select(
        "order_number, created_at, paid_at, preview_generated_at, email, payment_amount, applicant_gender, applicant_birth_year, life_stage, main_wish, pain_points, relationship_type, breakup_elapsed, current_emotion"
      )
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("site_events")
      .select("created_at, visitor_id, event, path, utm_source, utm_campaign, utm_content, first_ref_host, device, order_number")
      .gt("created_at", since)
      .limit(50000),
    supabase
      .from("payment_events")
      .select("created_at, order_number, event, code")
      .gt("created_at", since)
      .not("event", "like", "sweep%") /* 자동 재처리 내부 기록 제외 */
      .limit(20000),
    supabase.from("site_events").select("created_at").order("created_at", { ascending: true }).limit(1),
  ]);

  const orders = ((oRes.data ?? []) as OrderRow[]).filter((o) => !isOperatorEmail(o.email));
  const realOrderSet = new Set(orders.map((o) => o.order_number));
  /* utm_content 열이 아직 없으면(마이그레이션 전) 열 없이 다시 읽는다 */
  let eData = eRes.data as EventRow[] | null;
  if (eRes.error) {
    const retry = await supabase
      .from("site_events")
      .select("created_at, visitor_id, event, path, utm_source, utm_campaign, first_ref_host, device, order_number")
      .gt("created_at", since)
      .limit(50000);
    eData = (retry.data ?? []) as EventRow[];
  }
  const events = (eData ?? []) as EventRow[];
  const payEvents = ((pRes.data ?? []) as { created_at: string; order_number: string; event: string; code: string | null }[])
    .filter((p) => realOrderSet.has(p.order_number));
  const trackingSince = (firstRes.data?.[0] as { created_at?: string } | undefined)?.created_at ?? null;

  /* 운영자 브라우저(테스트 주문을 만든 visitor)는 방문 집계에서 제외 */
  const operatorVisitors = new Set(
    events
      .filter((e) => e.order_number && !realOrderSet.has(e.order_number) && e.event === "order_created")
      .map((e) => e.visitor_id)
  );
  const ev = events.filter((e) => !operatorVisitors.has(e.visitor_id));

  /* visitor → 첫 유입·기기 */
  const visitorSource = new Map<string, string>();
  const visitorDevice = new Map<string, string>();
  for (const e of [...ev].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))) {
    if (!visitorSource.has(e.visitor_id))
      visitorSource.set(e.visitor_id, sourceLabel(e.utm_source, e.first_ref_host, e.utm_campaign, e.utm_content));
    if (!visitorDevice.has(e.visitor_id) && e.device) visitorDevice.set(e.visitor_id, e.device === "mobile" ? "모바일" : "PC");
  }
  const orderVisitor = new Map<string, string>();
  for (const e of ev) if (e.order_number && !orderVisitor.has(e.order_number)) orderVisitor.set(e.order_number, e.visitor_id);

  /* 일별 퍼널 */
  const dayMap = new Map<string, Funnel>();
  type DaySets = Record<"v" | "s" | "c" | "pp" | "pv" | "pw" | "pf" | "pc" | "q1" | "q2" | "q3" | "q4", Set<string>>;
  const newSets = (): DaySets => ({
    v: new Set(), s: new Set(), c: new Set(), pp: new Set(), pv: new Set(), pw: new Set(), pf: new Set(), pc: new Set(),
    q1: new Set(), q2: new Set(), q3: new Set(), q4: new Set(),
  });
  const sets = new Map<string, DaySets>();
  const getDay = (d: string) => {
    if (!dayMap.has(d)) {
      dayMap.set(d, empty());
      sets.set(d, newSets());
    }
    return { f: dayMap.get(d)!, s: sets.get(d)! };
  };
  for (let i = 0; i < days; i++) getDay(kstDate(new Date(Date.now() - i * 86400000).toISOString()));

  for (const e of ev) {
    const { s } = getDay(kstDate(e.created_at));
    if (e.event === "view") s.v.add(e.visitor_id);
    if (e.event === "apply_start") s.s.add(e.visitor_id);
    if (e.event === "payment_cta_click" && e.order_number) s.c.add(e.order_number);
    if (e.event === "preview_view" && e.order_number) s.pv.add(e.order_number);
    if (e.event === "apply_step" && e.path) {
      const step = e.path.split("#")[1];
      const cp = QUESTION_CHECKPOINTS.find((q) => q.step === step);
      if (cp) s[cp.key].add(e.visitor_id);
    }
  }
  for (const p of payEvents) {
    const { s } = getDay(kstDate(p.created_at));
    if (p.event === "preview_cta_click") s.c.add(p.order_number);
    if (p.event === "pay_page_view") s.pp.add(p.order_number);
    if (p.event === "pay_request") s.pw.add(p.order_number);
    const cancel = !!p.code && CANCEL_CODES.has(p.code);
    if ((p.event === "pay_request_error" || p.event === "pay_fail") && cancel) s.pc.add(p.order_number);
    else if (p.event === "pay_fail" || p.event === "confirm_failed" || p.event === "amount_mismatch") s.pf.add(p.order_number);
  }
  for (const o of orders) {
    const { f } = getDay(kstDate(o.created_at));
    f.applied += 1;
    if (o.preview_generated_at) f.preview += 1;
    if (o.paid_at) {
      const pf = getDay(kstDate(o.paid_at)).f;
      pf.paid += 1;
      pf.revenue += o.payment_amount ?? 0;
    }
  }
  for (const [d, f] of dayMap) {
    const s = sets.get(d)!;
    f.visitors = s.v.size;
    f.applyStart = s.s.size;
    f.payClick = s.c.size;
    f.payPage = s.pp.size;
    f.previewView = s.pv.size;
    f.payWindow = s.pw.size;
    f.payFail = s.pf.size;
    f.payCancel = s.pc.size;
    f.q1 = s.q1.size;
    f.q2 = s.q2.size;
    f.q3 = s.q3.size;
    f.q4 = s.q4.size;
  }
  const byDay = [...dayMap.entries()]
    .filter(([d]) => d >= kstDate(since))
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, f]) => ({ day, f }));

  const total = empty();
  total.visitors = new Set(ev.filter((e) => e.event === "view").map((e) => e.visitor_id)).size;
  total.applyStart = new Set(ev.filter((e) => e.event === "apply_start").map((e) => e.visitor_id)).size;
  total.applied = orders.length;
  total.preview = orders.filter((o) => o.preview_generated_at).length;
  total.payClick = new Set([
    ...payEvents.filter((p) => p.event === "preview_cta_click").map((p) => p.order_number),
    ...ev.filter((e) => e.event === "payment_cta_click" && e.order_number).map((e) => e.order_number as string),
  ]).size;
  total.payPage = new Set(payEvents.filter((p) => p.event === "pay_page_view").map((p) => p.order_number)).size;
  total.payWindow = new Set(payEvents.filter((p) => p.event === "pay_request").map((p) => p.order_number)).size;
  total.previewView = new Set(ev.filter((e) => e.event === "preview_view" && e.order_number).map((e) => e.order_number as string)).size;
  const isCancel = (p: { event: string; code: string | null }) =>
    (p.event === "pay_request_error" || p.event === "pay_fail") && !!p.code && CANCEL_CODES.has(p.code);
  total.payCancel = new Set(payEvents.filter(isCancel).map((p) => p.order_number)).size;
  total.payFail = new Set(
    payEvents
      .filter((p) => !isCancel(p) && (p.event === "pay_fail" || p.event === "confirm_failed" || p.event === "amount_mismatch"))
      .map((p) => p.order_number)
  ).size;
  for (const cp of QUESTION_CHECKPOINTS) {
    total[cp.key] = new Set(
      ev.filter((e) => e.event === "apply_step" && e.path?.split("#")[1] === cp.step).map((e) => e.visitor_id)
    ).size;
  }
  total.paid = orders.filter((o) => o.paid_at).length;
  total.revenue = orders.reduce((s, o) => s + (o.paid_at ? o.payment_amount ?? 0 : 0), 0);
  const today = dayMap.get(todayKey) ?? empty();

  /* 세그먼트 */
  const seg = (key: string, title: string, pick: (o: OrderRow) => string[], order?: string[]) => {
    const m = new Map<string, SegRow>();
    for (const o of orders) {
      for (const label of pick(o)) {
        const r = m.get(label) ?? { label, applied: 0, preview: 0, paid: 0, conv: 0 };
        r.applied += 1;
        if (o.preview_generated_at) r.preview += 1;
        if (o.paid_at) r.paid += 1;
        m.set(label, r);
      }
    }
    let rows = [...m.values()].map((r) => ({ ...r, conv: pct(r.paid, r.applied) }));
    rows = order
      ? rows.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label))
      : rows.sort((a, b) => b.applied - a.applied);
    return { key, title, rows };
  };
  const lab = (opts: Parameters<typeof optionLabel>[0], v: string | null) => (v ? optionLabel(opts, v) : "미입력");
  const segments = [
    seg("gender", "성별", (o) => [lab(APPLICANT_GENDER_OPTIONS, o.applicant_gender)]),
    seg("age", "나이대", (o) => [ageBand(o.applicant_birth_year)], AGE_ORDER),
    seg("life", "생활 단계", (o) => [lab(LIFE_STAGE_OPTIONS, o.life_stage)]),
    seg("wish", "가장 바라는 것 (찾아온 이유)", (o) => [lab(MAIN_WISH_OPTIONS, o.main_wish)]),
    seg("pain", "가장 힘든 것 (복수 선택)", (o) => (o.pain_points?.length ? o.pain_points.map((p) => optionLabel(PAIN_POINT_OPTIONS, p)) : ["미입력"])),
    seg("rel", "관계", (o) => [lab(RELATIONSHIP_TYPE_OPTIONS, o.relationship_type)]),
    seg("elapsed", "이별 후 경과", (o) => [o.breakup_elapsed ? optionLabel(BREAKUP_ELAPSED_OPTIONS, o.breakup_elapsed) : "해당 없음"]),
    seg("emotion", "지금 감정", (o) => [lab(CURRENT_EMOTION_OPTIONS, o.current_emotion)]),
  ];

  /* 유입 경로·기기 */
  const tally = (labelOf: (vid: string) => string | undefined) => {
    type Row = { label: string; visitors: number; applied: number; preview: number; paid: number; revenue: number };
    const m = new Map<string, Row>();
    const blank = (l: string): Row => ({ label: l, visitors: 0, applied: 0, preview: 0, paid: 0, revenue: 0 });
    const vis = new Set(ev.filter((e) => e.event === "view").map((e) => e.visitor_id));
    for (const vid of vis) {
      const l = labelOf(vid) ?? "알 수 없음";
      const r = m.get(l) ?? blank(l);
      r.visitors += 1;
      m.set(l, r);
    }
    for (const o of orders) {
      const vid = orderVisitor.get(o.order_number);
      const l = vid ? labelOf(vid) ?? "알 수 없음" : "기록 이전/추적 안 됨";
      const r = m.get(l) ?? blank(l);
      r.applied += 1;
      if (o.preview_generated_at) r.preview += 1;
      if (o.paid_at) {
        r.paid += 1;
        r.revenue += o.payment_amount ?? 0;
      }
      m.set(l, r);
    }
    return [...m.values()].sort((a, b) => b.visitors + b.applied - (a.visitors + a.applied));
  };
  const sources = tally((v) => visitorSource.get(v));
  const devices = tally((v) => visitorDevice.get(v));

  /* 결제 실패 이유 */
  const failMap = new Map<string, Set<string>>();
  for (const p of payEvents) {
    if (!FAIL_LABELS[p.event]) continue;
    const base = isCancel(p) ? "사용자 취소" : FAIL_LABELS[p.event];
    const l = `${base}${p.code ? ` (${p.code})` : ""}`;
    if (!failMap.has(l)) failMap.set(l, new Set());
    failMap.get(l)!.add(p.order_number);
  }
  const payFails = [...failMap.entries()]
    .map(([label, s]) => ({ label, count: s.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  /* 결제창 진입 결제수단 (pay_request 코드 = 결제수단) */
  const methodMap = new Map<string, Set<string>>();
  const METHOD_LABELS: Record<string, string> = { CARD: "카드", TRANSFER: "계좌이체", VIRTUAL_ACCOUNT: "가상계좌", MOBILE_PHONE: "휴대폰", EASY_PAY: "간편결제", FOREIGN_EASY_PAY: "해외 간편결제" };
  for (const p of payEvents) {
    if (p.event !== "pay_request") continue;
    const l = p.code ? METHOD_LABELS[p.code] ?? p.code : "결제위젯 (수단 미기록)";
    if (!methodMap.has(l)) methodMap.set(l, new Set());
    methodMap.get(l)!.add(p.order_number);
  }
  const payMethods = [...methodMap.entries()].map(([label, s]) => ({ label, count: s.size })).sort((a, b) => b.count - a.count);

  /* 단계별 이탈 */
  const stages: [string, number, number][] = [
    ["방문 → 신청 시작", total.visitors, total.applyStart],
    ["신청 시작 → 신청 완료", total.applyStart, total.applied],
    ["신청 완료 → 미리보기 도달", total.applied, total.preview],
    ["미리보기 → 결제 버튼", total.preview, total.payClick],
    ["결제 버튼 → 결제 완료", total.payClick, total.paid],
  ];
  const dropoff = stages
    .filter(([, from]) => from > 0)
    .map(([stage, from, to]) => ({ stage, lost: Math.max(0, from - to), rate: pct(Math.max(0, from - to), from) }));

  /* 시간대 (신청 기준) */
  const hours = new Array<number>(24).fill(0);
  for (const o of orders) {
    const h = Number(new Date(o.created_at).toLocaleString("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", hour12: false }));
    hours[h % 24] += 1;
  }

  /* 자동 인사이트 */
  const insights: string[] = [];
  const worst = [...dropoff].sort((a, b) => b.rate - a.rate)[0];
  if (worst) insights.push(`가장 많이 빠지는 구간은 '${worst.stage}' — ${worst.rate}% (${worst.lost}명)가 다음 단계로 가지 않았어요.`);
  const topGender = segments[0].rows[0];
  if (topGender) insights.push(`신청자 중 ${topGender.label}이(가) ${pct(topGender.applied, total.applied)}%로 가장 많아요.`);
  const ages = segments[1].rows.filter((r) => r.label !== "미입력").sort((a, b) => b.applied - a.applied);
  if (ages[0]) insights.push(`가장 많이 오는 나이대는 ${ages[0].label} (${ages[0].applied}명).`);
  const convSeg = segments
    .flatMap((s) => s.rows.filter((r) => r.applied >= 5).map((r) => ({ ...r, title: s.title })))
    .sort((a, b) => b.conv - a.conv)[0];
  if (convSeg && convSeg.paid > 0) insights.push(`결제율이 가장 높은 그룹: ${convSeg.title} '${convSeg.label}' — ${convSeg.conv}% (${convSeg.paid}/${convSeg.applied}).`);
  const topWish = segments[3].rows[0];
  if (topWish) insights.push(`찾아오는 이유 1위: '${topWish.label}' (${topWish.applied}명).`);
  const peakH = hours.indexOf(Math.max(...hours));
  if (Math.max(...hours) > 0) insights.push(`신청이 가장 많은 시간대는 ${peakH}시 무렵이에요 — 홍보 게시물은 그 1~2시간 전에 올리는 게 좋아요.`);

  return {
    days,
    since,
    trackingSince,
    total,
    today,
    byDay,
    segments,
    sources,
    payMethods,
    devices,
    payFails,
    dropoff,
    hours,
    insights,
  };
}
