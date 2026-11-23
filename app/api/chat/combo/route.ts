/**
 * POST /api/chat/combo — 11/23 대표 결정: 재회 분석 결제 시트의 '재회 분석 + 카톡 분석 29,900원'
 * body: { order: "WH-..." }  · 결제 전 재회 주문의 이름·이메일·출생연도로 카톡 패키지 주문(WC-)을 만든다.
 * 결제는 WC 주문으로 받고, 승인되면 WH 주문을 함께 결제 완료로 (lib/chat/process confirmChatPayment).
 * 카톡 대화는 결제 뒤 메일·결과 화면의 링크에서 올린다.
 */
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { CHAT_PRODUCTS, type ChatOrder } from "@/lib/chat/types";
import { chatOrderNumber, saveChatOrder } from "@/lib/chat/store";
import { RITUAL_PRICE_KRW } from "@/lib/ritual-types";

export const dynamic = "force-dynamic";

const ORDER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as { order?: unknown } | null;
  const order = typeof b?.order === "string" ? b.order : "";
  if (!ORDER_RE.test(order)) return NextResponse.json({ ok: false }, { status: 400 });
  const { data: row } = await getSupabaseAdmin()
    .from("ritual_orders")
    .select("applicant_name, email, applicant_birth_year, payment_status")
    .eq("order_number", order)
    .maybeSingle();
  if (!row) return NextResponse.json({ ok: false }, { status: 404 });
  if (row.payment_status !== "pending") return NextResponse.json({ ok: false, message: "이미 결제가 끝난 주문이에요." }, { status: 409 });
  const p = CHAT_PRODUCTS.chat_bundle;
  const co: ChatOrder = {
    order_number: chatOrderNumber(),
    created_at: new Date().toISOString(),
    product: "chat_bundle",
    amount: p.price,
    name: String(row.applicant_name ?? "").slice(0, 20),
    email: String(row.email ?? "").toLowerCase(),
    birth_year: typeof row.applicant_birth_year === "number" ? row.applicant_birth_year : null,
    guardian_ok: false,
    marketing_ok: false,
    my_side: "right",
    partner_label: "그 사람",
    answers: {},
    free_type: "file",
    image_count: 0,
    pay_status: "pending",
    payment_key: null,
    payment_method: null,
    paid_at: null,
    gen_status: "waiting",
    gen_started_at: null,
    result: null,
    result_token: null,
    images_deleted_at: null,
    email_sent_at: null,
    bundle_redeemed_order: null,
    utm: { s: "combo", c: order },
    source: "file",
    stats: null,
    combo_ritual_order: order,
  };
  if (!(await saveChatOrder(co))) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({
    ok: true,
    orderNumber: co.order_number,
    amount: p.price,
    regular: RITUAL_PRICE_KRW + CHAT_PRODUCTS.chat.price,
    orderName: "월하연 재회 분석 + 카톡 대화 분석",
  });
}
