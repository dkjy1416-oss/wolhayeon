/**
 * 멈춘 주문 자동 재처리 (서버 전용) — 사람 손 없이 결제 고객이 결과·책·메일을 받게 하는 안전망.
 *
 * 대상 (결제 후 7일 이내 주문만):
 *  - 메시지/패키지: 결과 미생성(대기·실패), 생성 중 멈춤(6분 이상), 생성됐는데 승인 안 됨,
 *    승인됐는데 메일 미발송(대기·실패), 발송 중 멈춤(10분 이상)
 *  - 책/패키지: 책 미제작(없음·실패), 제작 중 멈춤(7분 이상), 완성됐는데 메일 기록 없음
 *
 * 규칙:
 *  - 한 번에 한 주문만 처리 (AI 작성이 길어서 서버 실행 한도 300초 안에 끝내기 위함)
 *  - 같은 주문은 6분에 한 번, 최대 3번까지만 자동 재시도 → 그래도 안 되면 운영자 알림 1회
 *  - 실제 처리는 기존 함수(processPaidOrder / processBookOrder)를 그대로 사용 — 잠금이 있어 중복 실행 안전
 *  - 기록은 payment_events 테이블에 남긴다 (개인정보 없음)
 */
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { processPaidOrder } from "@/lib/ritual-process";
import { processBookOrder, sendBookEmailOnce, bookDownloadPath } from "@/lib/book/book-service";
import { sendOpsAlert } from "@/lib/ops-alert";
import { reconcilePendingOrder } from "@/lib/payment-confirm";

const MIN = 60 * 1000;
const MAX_ATTEMPTS = 3;
const RETRY_GAP_MS = 6 * MIN;

export type SweepJob =
  | { kind: "reconcile"; orderNumber: string; why: string }
  | { kind: "message"; orderNumber: string; why: string }
  | { kind: "book"; orderNumber: string; why: string }
  | { kind: "book_email"; orderNumber: string; why: string };

const EVENT: Record<SweepJob["kind"], string> = {
  reconcile: "sweep_reconcile",
  message: "sweep_message",
  book: "sweep_book",
  book_email: "sweep_book_email",
};

interface OrderRow {
  order_number: string;
  product: string | null;
  paid_at: string | null;
  updated_at: string | null;
  generation_status: string | null;
  review_status: string | null;
  delivery_status: string | null;
  delivery_attempted_at: string | null;
  delivery_attempt_count: number | null;
  book_status: string | null;
  book_started_at: string | null;
  book_generated_at: string | null;
  book_path: string | null;
}

const ago = (iso: string | null | undefined) => {
  const t = Date.parse(iso ?? "");
  return Number.isFinite(t) ? Date.now() - t : Infinity;
};

function messageReason(o: OrderRow): string | null {
  if (o.product === "book") return null;
  if (o.review_status === "revision_required") return null; // 관리자가 직접 보기로 한 주문
  if (o.review_status !== "approved") {
    if (o.generation_status === "waiting" || o.generation_status === "failed") return `gen_${o.generation_status}`;
    if (o.generation_status === "generating" && ago(o.updated_at) > 6 * MIN) return "gen_stuck";
    if (o.generation_status === "generated" && ago(o.updated_at) > 3 * MIN) return "approve_pending";
    return null;
  }
  if ((o.delivery_status === "waiting" || o.delivery_status === "failed") && (o.delivery_attempt_count ?? 0) < 5)
    return `mail_${o.delivery_status}`;
  if (o.delivery_status === "sending" && ago(o.delivery_attempted_at) > 10 * MIN) return "mail_stuck";
  return null;
}

function bookReason(o: OrderRow): string | null {
  if (o.product !== "book" && o.product !== "bundle") return null;
  if (!o.book_status || o.book_status === "failed" || o.book_status === "waiting") return `book_${o.book_status ?? "none"}`;
  if (o.book_status === "generating" && ago(o.book_started_at) > 7 * MIN) return "book_stuck";
  return null;
}

/** 지금 처리할 주문 하나 고르기 (가장 오래 기다린 주문부터) */
export async function pickSweepJob(): Promise<SweepJob | null> {
  const supabase = getSupabaseAdmin();
  const res = await supabase
    .from("ritual_orders")
    .select(
      "order_number, product, paid_at, updated_at, generation_status, review_status, delivery_status, delivery_attempted_at, delivery_attempt_count, book_status, book_started_at, book_generated_at, book_path"
    )
    .eq("payment_status", "paid")
    .gte("paid_at", new Date(Date.now() - 7 * 24 * 60 * MIN).toISOString())
    .lte("paid_at", new Date(Date.now() - 3 * MIN).toISOString())
    .order("paid_at", { ascending: false })
    .limit(500);
  if (res.error || !res.data) return null;
  const rows = res.data as OrderRow[];

  const candidates: SweepJob[] = [];
  const bookReadyNoMail: string[] = [];

  /* 결제 승인 응답을 못 받은 주문(최근 24시간) — 토스에 다시 확인 */
  const pend = await supabase
    .from("payment_events")
    .select("order_number")
    .eq("event", "confirm_pending")
    .gte("created_at", new Date(Date.now() - 24 * 60 * MIN).toISOString())
    .limit(50);
  if (pend.data?.length) {
    const nums = [...new Set(pend.data.map((e) => e.order_number as string))];
    const still = await supabase
      .from("ritual_orders")
      .select("order_number")
      .in("order_number", nums)
      .eq("payment_status", "pending");
    for (const r of still.data ?? [])
      candidates.push({ kind: "reconcile", orderNumber: r.order_number as string, why: "confirm_pending" });
  }

  /* 책 메일 기록 기능이 켜진 뒤(첫 기록 시각 이후) 완성된 책만 재발송 대상 */
  const firstMark = await supabase
    .from("payment_events")
    .select("created_at")
    .eq("event", "book_email_sent")
    .order("created_at", { ascending: true })
    .limit(1);
  const BOOK_EMAIL_TRACK_SINCE = firstMark.data?.[0]
    ? Date.parse(firstMark.data[0].created_at as string)
    : Infinity;
  for (const o of rows) {
    const m = messageReason(o);
    if (m) candidates.push({ kind: "message", orderNumber: o.order_number, why: m });
    const b = bookReason(o);
    if (b) candidates.push({ kind: "book", orderNumber: o.order_number, why: b });
    if (
      (o.product === "book" || o.product === "bundle") &&
      o.book_status === "ready" &&
      o.book_path &&
      Date.parse(o.book_generated_at ?? "") >= BOOK_EMAIL_TRACK_SINCE &&
      ago(o.book_generated_at) > 10 * MIN
    ) {
      bookReadyNoMail.push(o.order_number);
    }
  }

  /* 책 메일 기록 확인 */
  if (bookReadyNoMail.length) {
    const ev = await supabase
      .from("payment_events")
      .select("order_number")
      .in("order_number", bookReadyNoMail)
      .eq("event", "book_email_sent");
    const sent = new Set((ev.data ?? []).map((e) => e.order_number as string));
    for (const on of bookReadyNoMail)
      if (!sent.has(on)) candidates.push({ kind: "book_email", orderNumber: on, why: "book_mail_missing" });
  }
  if (!candidates.length) return null;

  /* 재시도 횟수·간격 확인 */
  const ev = await supabase
    .from("payment_events")
    .select("order_number, event, created_at, code")
    .in(
      "order_number",
      [...new Set(candidates.map((c) => c.orderNumber))]
    )
    .in("event", [...Object.values(EVENT), "sweep_gave_up"]);
  const events = ev.data ?? [];

  for (const c of candidates) {
    const mine = events.filter((e) => e.order_number === c.orderNumber && e.event === EVENT[c.kind]);
    const gaveUp = events.some(
      (e) => e.order_number === c.orderNumber && e.event === "sweep_gave_up" && e.code === c.kind
    );
    if (mine.length >= MAX_ATTEMPTS) {
      if (!gaveUp) {
        await supabase
          .from("payment_events")
          .insert({ order_number: c.orderNumber, event: "sweep_gave_up", code: c.kind });
        await sendOpsAlert("process_error", {
          orderNumber: c.orderNumber,
          code: `sweep_gave_up_${c.kind}`,
          detail: `자동 재처리를 ${MAX_ATTEMPTS}번 했는데도 ${
            c.kind === "message"
              ? "결과/메일"
              : c.kind === "book"
                ? "책 제작"
                : c.kind === "reconcile"
                  ? "결제 확인(토스 승인 응답 유실)"
                  : "책 메일"
          }이(가) 끝나지 않았습니다(${c.why}). 주문 화면에서 확인해 주세요.`,
        });
      }
      continue;
    }
    const last = Math.max(0, ...mine.map((e) => Date.parse(e.created_at as string) || 0));
    if (Date.now() - last < RETRY_GAP_MS) continue;
    return c;
  }
  return null;
}

/** 사이트 전체에서 약 1분에 한 번만 실행.
 *  1) 같은 서버 인스턴스는 50초에 한 번  2) 여러 인스턴스가 동시에 오면 기록(payment_events)을
 *  먼저 남긴 한 곳만 진행 (먼저 들어간 행 = 가장 작은 id) */
export const SWEEP_MARKER_ORDER = "WH-00000000-SWEEP";
let lastSweep = 0;
export async function claimSweepSlot(): Promise<boolean> {
  const now = Date.now();
  if (now - lastSweep < 50_000) return false;
  lastSweep = now;
  const supabase = getSupabaseAdmin();
  const mine = await supabase
    .from("payment_events")
    .insert({ order_number: SWEEP_MARKER_ORDER, event: "sweep_run" })
    .select("id")
    .single();
  if (mine.error || !mine.data) return false;
  const first = await supabase
    .from("payment_events")
    .select("id")
    .eq("order_number", SWEEP_MARKER_ORDER)
    .eq("event", "sweep_run")
    .gte("created_at", new Date(now - 55_000).toISOString())
    .order("id", { ascending: true })
    .limit(1);
  return !first.error && first.data?.[0]?.id === mine.data.id;
}

export async function recordSweepAttempt(job: SweepJob): Promise<void> {
  await getSupabaseAdmin()
    .from("payment_events")
    .insert({ order_number: job.orderNumber, event: EVENT[job.kind], code: job.why.slice(0, 60) });
}

export async function runSweepJob(job: SweepJob): Promise<string> {
  try {
    if (job.kind === "reconcile") {
      const r = await reconcilePendingOrder(job.orderNumber);
      if (r === "paid") {
        /* 결제 확인됨 → 결과·책 처리까지 이어서 */
        await Promise.allSettled([processPaidOrder(job.orderNumber), processBookOrder(job.orderNumber)]);
      }
      return `reconcile_${r}`;
    }
    if (job.kind === "message") {
      const r = await processPaidOrder(job.orderNumber);
      return r.status;
    }
    if (job.kind === "book") {
      const r = await processBookOrder(job.orderNumber);
      return r.status;
    }
    const supabase = getSupabaseAdmin();
    const o = await supabase
      .from("ritual_orders")
      .select("email, applicant_name")
      .eq("order_number", job.orderNumber)
      .maybeSingle();
    const path = bookDownloadPath(job.orderNumber);
    if (!o.data || !path) return "book_email_skip";
    const ok = await sendBookEmailOnce(o.data, path, job.orderNumber);
    return ok ? "book_email_sent" : "book_email_failed";
  } catch {
    return "error";
  }
}
