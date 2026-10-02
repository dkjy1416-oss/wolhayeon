import "server-only";
/**
 * 결과 페이지(result_token)에서 쓰는 책 관련 동작 — /api/books/process 의 action 으로 호출
 *  - action "status": 내 책 상태 확인·이어서 제작
 *  - action "addon": 메시지만 받은 손님이 같은 사연으로 책만 추가 구매 (새 대기 주문 복제)
 */
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { RESULT_TOKEN_RE } from "@/lib/result-access";
import { processBookOrder, productHasBook } from "@/lib/book/book-service";
import { cloneOrderForBook } from "@/lib/book/clone-order";
import { BOOK_PRICE_KRW } from "@/lib/ritual-types";

/** 상태 확인
 * POST /api/books/by-result — 결과 페이지에서 내 책 상태 확인·이어서 제작
 * body: { token }  (결과 페이지 주소의 result_token — 결과를 볼 수 있는 사람만 앎)
 * 응답: ready(+downloadPath) / processing / failed / none(책 미포함 주문)
 * 제작은 processBookOrder의 잠금으로 1회만 실행 (이미 완성이면 바로 ready).
 */
export async function bookByResult(b: Record<string, unknown>) {
  const token = b.token;
  if (typeof token !== "string" || !RESULT_TOKEN_RE.test(token)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const r = await supabase
    .from("ritual_results")
    .select("order_id, approved_at")
    .eq("result_token", token)
    .maybeSingle();
  if (!r.data?.approved_at) return NextResponse.json({ ok: false }, { status: 401 });
  const o = await supabase
    .from("ritual_orders")
    .select("order_number, product, payment_status")
    .eq("id", r.data.order_id)
    .maybeSingle();
  if (!o.data || o.data.payment_status !== "paid") return NextResponse.json({ ok: false }, { status: 401 });
  if (!productHasBook(o.data.product as string | null)) return NextResponse.json({ ok: true, status: "none" });

  const out = await processBookOrder(o.data.order_number as string);
  if (out.status === "ready") return NextResponse.json({ ok: true, status: "ready", downloadPath: out.downloadPath });
  return NextResponse.json({ ok: true, status: out.status === "processing" ? "processing" : "failed" });
}

/**
 * POST /api/books/addon — 메시지를 이미 받은 손님이 '같은 사연 그대로' 책만 추가 구매
 * body: { token }  (결과 페이지의 result_token)
 *
 * 결제 완료된 원 주문의 신청 내용을 화이트리스트 정제·재검증한 뒤 새 주문으로 복제한다.
 * (가격·상태·주문번호는 DB 기본값 — 결제 화면에서 product=book 으로 금액이 정해짐)
 * 같은 결과에서 여러 번 눌러도 30분 안에 만든 대기 주문이 있으면 그것을 다시 쓴다.
 */
export async function bookAddon(b: Record<string, unknown>) {
  const token = b.token;
  if (typeof token !== "string" || !RESULT_TOKEN_RE.test(token)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const r = await supabase
    .from("ritual_results")
    .select("order_id, approved_at")
    .eq("result_token", token)
    .maybeSingle();
  if (!r.data?.approved_at) return NextResponse.json({ ok: false }, { status: 401 });
  const o = await supabase.from("ritual_orders").select("*").eq("id", r.data.order_id).maybeSingle();
  if (!o.data || o.data.payment_status !== "paid") return NextResponse.json({ ok: false }, { status: 401 });

  /* 같은 사연으로 책 주문을 만든다 (이미 책을 결제했으면 안내, 결제 대기 책 주문이 있으면 재사용) */
  const cl = await cloneOrderForBook(o.data.id as string, BOOK_PRICE_KRW, true);
  if (!cl.ok) {
    if (cl.reason === "already_bought") {
      return NextResponse.json({ ok: false, error: "already_bought" }, { status: 409 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, order: cl.orderNumber });
}
