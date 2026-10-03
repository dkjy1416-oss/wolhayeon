/**
 * 개인화 책 제작 전체 흐름 (서버 전용).
 * 결제 확인 → 개인화 부분 AI 작성 → HTML 조립 → PDF → 저장소 업로드 → 메일.
 * 같은 주문에 대해 여러 번 호출돼도 한 번만 만든다(상태값으로 잠금).
 */
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { RitualOrderRow } from "@/lib/supabase/types";
import { sanitizeSiteUrl } from "@/lib/delivery-rules";
import {
  BookPersonalSchema,
  generateBookPersonal,
  type BookPersonal,
} from "@/lib/book/book-personal";
import { renderBookHtml } from "@/lib/book/book-render";
import { renderBookPdf, loadCoverDataUrl } from "@/lib/book/book-pdf";
import { sendBookReadyEmail } from "@/lib/book/book-email";
import { createBookToken } from "@/lib/book/book-auth";
import { sendOpsAlert } from "@/lib/ops-alert";
import { reviewPath } from "@/lib/review-auth";

export const BOOK_BUCKET = "books";
const STALE_MS = 6 * 60 * 1000;

export type BookOutcome =
  | { status: "ready"; downloadPath: string }
  | { status: "processing" }
  | { status: "failed" }
  | { status: "not_paid" }
  | { status: "not_book" };

export function bookDownloadPath(orderNumber: string): string | null {
  const t = createBookToken(orderNumber);
  if (!t) return null;
  return `/api/books/download?order=${encodeURIComponent(orderNumber)}&t=${encodeURIComponent(t)}`;
}

export function productHasBook(product: string | null | undefined): boolean {
  return product === "book" || product === "bundle";
}

export async function processBookOrder(orderNumber: string): Promise<BookOutcome> {
  const supabase = getSupabaseAdmin();
  const res = await supabase
    .from("ritual_orders")
    .select("*")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (res.error || !res.data) return { status: "failed" };
  const order = res.data as RitualOrderRow;
  if (order.payment_status !== "paid") return { status: "not_paid" };
  if (!productHasBook(order.product)) return { status: "not_book" };

  const path = bookDownloadPath(orderNumber);
  if (!path) return { status: "failed" };

  if (order.book_status === "ready" && order.book_path) {
    return { status: "ready", downloadPath: path };
  }
  /* 실패로 끝난 주문은 제한 횟수 안에서 자동 재시도(스위퍼)가 다시 부른다 */
  const started = order.book_started_at ? Date.parse(order.book_started_at) : 0;
  if (order.book_status === "generating" && Date.now() - started < STALE_MS) {
    return { status: "processing" };
  }

  /* 잠금: 지금 상태 그대로일 때만 generating으로 전환 (동시 호출 1회만 통과) */
  const nowIso = new Date().toISOString();
  let lock = supabase
    .from("ritual_orders")
    .update({ book_status: "generating", book_started_at: nowIso })
    .eq("id", order.id);
  lock =
    order.book_status === null || order.book_status === undefined
      ? lock.is("book_status", null)
      : lock.eq("book_status", order.book_status);
  if (order.book_started_at) lock = lock.eq("book_started_at", order.book_started_at);
  const locked = await lock.select("id");
  if (locked.error || !locked.data || locked.data.length === 0) {
    return { status: "processing" };
  }

  try {
    let personal: BookPersonal | null = null;
    const cached = BookPersonalSchema.safeParse(order.book_personal);
    if (cached.success) personal = cached.data;
    if (!personal) {
      /* 서버 실행 한도(300초) 안에 PDF·저장·메일까지 끝나도록 AI 작성 시간을 제한 */
      const t0 = Date.now();
      personal = await generateBookPersonal(order, 120_000);
      const spent = Date.now() - t0;
      if (!personal && spent < 110_000) {
        personal = await generateBookPersonal(order, Math.min(100_000, 200_000 - spent));
      }
      if (!personal) throw new Error("personal_failed");
      await supabase.from("ritual_orders").update({ book_personal: personal }).eq("id", order.id);
    }

    const html = renderBookHtml({
      name: order.applicant_name,
      partner: order.partner_name,
      paidAt: order.paid_at ? new Date(order.paid_at) : new Date(),
      personal,
      coverSrc: await loadCoverDataUrl(),
    });
    const t0 = Date.now();
    const pdf = await renderBookPdf(html);
    console.error(`[book] pdf_ok bytes=${pdf.length} ms=${Date.now() - t0}`);

    const objectPath = `${orderNumber}.pdf`;
    const up = await supabase.storage
      .from(BOOK_BUCKET)
      .upload(objectPath, pdf, { contentType: "application/pdf", upsert: true });
    if (up.error) throw new Error(`upload_failed:${up.error.message}`);

    let saved = false;
    for (let i = 0; i < 3 && !saved; i++) {
      const done = await supabase
        .from("ritual_orders")
        .update({
          book_status: "ready",
          book_path: objectPath,
          book_generated_at: new Date().toISOString(),
        })
        .eq("id", order.id);
      saved = !done.error;
      if (!saved) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
    if (!saved) throw new Error("ready_update_failed");

    await sendBookEmailOnce(order, path, orderNumber);
    return { status: "ready", downloadPath: path };
  } catch (e) {
    console.error(`[book] failed ${e instanceof Error ? e.message.slice(0, 80) : "unknown"}`);
    await sendOpsAlert("book_failed", {
      orderNumber,
      code: e instanceof Error ? e.name : "unknown",
      detail: e instanceof Error ? e.message.slice(0, 120) : null,
    });
    await supabase.from("ritual_orders").update({ book_status: "failed" }).eq("id", order.id);
    return { status: "failed" };
  }
}

/** 책 완성 메일 — 보낸 기록(payment_events: book_email_sent)이 없을 때만 보낸다 */
export async function sendBookEmailOnce(
  order: Pick<RitualOrderRow, "email" | "applicant_name"> & { order_number?: string | null },
  downloadPath: string,
  orderNumberArg?: string
): Promise<boolean> {
  const orderNumber = orderNumberArg ?? order.order_number ?? "";
  if (!orderNumber) return false;
  const supabase = getSupabaseAdmin();
  const sent = await supabase
    .from("payment_events")
    .select("id")
    .eq("order_number", orderNumber)
    .eq("event", "book_email_sent")
    .limit(1);
  if (!sent.error && sent.data && sent.data.length > 0) return true;
  const site = sanitizeSiteUrl(process.env.SITE_URL);
  if (!site || !order.email) {
    await sendOpsAlert("book_failed", {
      orderNumber,
      code: "book_email_config",
      detail: "책은 완성됐지만 메일을 보낼 수 없었습니다(사이트 주소 또는 고객 이메일 없음).",
    });
    return false;
  }
  const ok = await sendBookReadyEmail({
    to: order.email,
    name: order.applicant_name,
    orderNumber,
    downloadUrl: `${site}${downloadPath}`,
    reviewUrl: (() => {
      const rp = reviewPath(orderNumber);
      return rp ? `${site}${rp}` : null;
    })(),
  });
  if (ok) {
    await supabase.from("payment_events").insert({ order_number: orderNumber, event: "book_email_sent" });
  } else {
    console.error("[book] email_failed");
  }
  return ok;
}
