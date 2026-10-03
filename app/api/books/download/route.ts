/**
 * GET /api/books/download?order=...&t=... — 개인화 책 PDF 내려받기
 * 서명 토큰 확인 → 저장소의 10분짜리 서명 URL로 이동. 첫 다운로드 시각 기록(환불 기준).
 */
import { NextResponse } from "next/server";
import { verifyBookToken } from "@/lib/book/book-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { BOOK_BUCKET } from "@/lib/book/book-service";
import { safeRoute } from "@/lib/route-safe";

export const dynamic = "force-dynamic";

const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

async function handleGET(request: Request) {
  const url = new URL(request.url);
  const order = url.searchParams.get("order") ?? "";
  const token = url.searchParams.get("t");
  /* view=1 → 브라우저에서 바로 열기(저장 대화상자 없이) */
  const view = url.searchParams.get("view") === "1";
  if (!ORDER_NUMBER_RE.test(order) || !verifyBookToken(order, token)) {
    return new NextResponse("링크가 올바르지 않거나 만료되었어요. 고객센터로 문의해 주세요.", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const supabase = getSupabaseAdmin();
  const row = await supabase
    .from("ritual_orders")
    .select("id, book_status, book_path, book_downloaded_at, payment_status")
    .eq("order_number", order)
    .maybeSingle();
  if (!row.data || row.data.payment_status !== "paid" || row.data.book_status !== "ready" || !row.data.book_path) {
    return new NextResponse("책을 아직 만드는 중이에요. 잠시 후 다시 열어 주세요.", {
      status: 409,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const signed = await supabase.storage
    .from(BOOK_BUCKET)
    .createSignedUrl(
      row.data.book_path,
      600,
      view ? undefined : { download: `헤어진-뒤-연락하지-말아야-할-때-${order}.pdf` }
    );
  if (signed.error || !signed.data?.signedUrl) {
    return new NextResponse("잠시 후 다시 시도해 주세요.", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  /* 다운로드 기록(환불 기준)은 실제 사람이 브라우저로 연 경우에만 남긴다.
     메일 보안 검사·링크 미리보기 봇은 Sec-Fetch 헤더가 없거나 봇 이름을 쓴다 → 기록하지 않음 */
  const ua = (request.headers.get("user-agent") ?? "").toLowerCase();
  const isBot = /bot|crawl|spider|preview|scanner|safelinks|facebookexternalhit|kakaotalk-scrap|yeti|daumoa|slack|whatsapp|curl|wget|python|headless/.test(ua);
  const browserLike = /mozilla\//.test(ua) && /safari|applewebkit|gecko/.test(ua);
  const looksHuman = !isBot && (request.headers.has("sec-fetch-mode") || browserLike);
  if (!row.data.book_downloaded_at && looksHuman) {
    await supabase
      .from("ritual_orders")
      .update({ book_downloaded_at: new Date().toISOString() })
      .eq("id", row.data.id);
  }
  return NextResponse.redirect(signed.data.signedUrl, 302);
}

export const GET = safeRoute("book_download", handleGET);
