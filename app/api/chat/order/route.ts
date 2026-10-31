/**
 * POST /api/chat/order — 카톡 분석 주문 생성 (결제 전)
 * body: { answers, name, email, birthYear, guardianOk, marketingOk, product, mySide, partnerLabel, utm }
 */
import { NextResponse, after } from "next/server";
import { CHAT_QUESTIONS, freeChatType } from "@/lib/chat/questions";
import { CHAT_PRODUCTS, type ChatOrder, type ChatProduct } from "@/lib/chat/types";
import { chatOrderNumber, saveChatOrder, sweepStaleChatImages } from "@/lib/chat/store";
import { chatToken } from "@/lib/chat/auth";
import { isValidEmail } from "@/lib/ritual-types";

export const dynamic = "force-dynamic";

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n) : "");

export async function POST(request: Request) {
  after(() => sweepStaleChatImages());
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ ok: false, message: "요청을 읽지 못했어요." }, { status: 400 });

  const raw = (b.answers ?? {}) as Record<string, unknown>;
  const answers: Record<string, string> = {};
  for (const q of CHAT_QUESTIONS) {
    const v = raw[q.id];
    if (typeof v === "string" && q.options.some((o) => o.v === v)) answers[q.id] = v;
  }
  const source: "file" | "images" = b.source === "file" ? "file" : "images";
  if (source === "images" && Object.keys(answers).length < CHAT_QUESTIONS.length)
    return NextResponse.json({ ok: false, message: "질문에 모두 답해 주세요." }, { status: 400 });

  const email = clip(b.email, 120).toLowerCase();
  if (!isValidEmail(email)) return NextResponse.json({ ok: false, message: "결과를 받을 이메일을 확인해 주세요." }, { status: 400 });

  const thisYear = new Date().getFullYear();
  const by = Number(b.birthYear);
  const birthYear = Number.isInteger(by) && by >= 1940 && by <= thisYear ? by : null;
  if (!birthYear) return NextResponse.json({ ok: false, message: "출생연도를 골라 주세요." }, { status: 400 });
  /* 만 나이 대략치 — 만 14세 미만 결제 불가, 미성년자는 보호자 동의 확인 */
  const age = thisYear - birthYear - 1;
  if (age < 14) return NextResponse.json({ ok: false, message: "만 14세 미만은 결제할 수 없어요." }, { status: 400 });
  const guardianOk = b.guardianOk === true;
  if (age < 19 && !guardianOk)
    return NextResponse.json({ ok: false, message: "미성년자는 보호자 동의 확인이 필요해요." }, { status: 400 });

  const product: ChatProduct = b.product === "chat_bundle" ? "chat_bundle" : "chat";
  const utmRaw = (b.utm ?? {}) as Record<string, unknown>;
  const utm: Record<string, string> = {};
  for (const k of ["s", "m", "c", "x", "r"]) {
    const v = clip(utmRaw[k], 80);
    if (v) utm[k] = v;
  }

  const order: ChatOrder = {
    order_number: chatOrderNumber(),
    created_at: new Date().toISOString(),
    product,
    amount: CHAT_PRODUCTS[product].price,
    name: clip(b.name, 20),
    email,
    birth_year: birthYear,
    guardian_ok: guardianOk,
    marketing_ok: b.marketingOk === true,
    my_side: b.mySide === "left" ? "left" : "right",
    partner_label: clip(b.partnerLabel, 12) || "그 사람",
    answers,
    free_type: source === "file" ? "file" : freeChatType(answers).key,
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
    utm: Object.keys(utm).length ? utm : null,
    source,
    stats: source === "file" && b.stats && typeof b.stats === "object" && JSON.stringify(b.stats).length < 8000 ? (b.stats as Record<string, unknown>) : null,
  };
  if (!(await saveChatOrder(order)))
    return NextResponse.json({ ok: false, message: "저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  return NextResponse.json({ ok: true, orderNumber: order.order_number, token: chatToken("order", order.order_number) });
}
