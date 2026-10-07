/**
 * 결제 승인 처리 (서버 전용) — /payment/success 에서 호출.
 *
 * "success URL에 도착했다" ≠ "결제 완료".
 * 반드시 아래 검증을 모두 통과한 뒤 토스 승인 API를 호출하고,
 * 토스 승인이 성공한 경우에만 payment_status를 paid로 바꿉니다.
 *
 * 서버 검증 6단계
 *  1. orderId(주문번호)에 해당하는 주문이 실제 존재하는가
 *  2. 현재 payment_status가 pending인가 (이미 paid면 재승인 금지)
 *  3. DB payment_amount가 정확히 RITUAL_PRICE_KRW(12,900원)인가
 *  4. success URL의 amount가 RITUAL_PRICE_KRW인가
 *  5. 클라이언트가 보낸 금액이 아닌 DB 금액으로 토스에 승인 요청
 *  6. 같은 paymentKey 재전송/새로고침 → 멱등 처리 (paid면 그대로 성공)
 *
 * 로그에는 secret·paymentKey 전체·개인정보를 남기지 않습니다.
 * (requestId + 결과 코드만)
 */
import "server-only";
import { randomUUID } from "crypto";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { confirmTossPayment, getTossPayment, getTossPaymentByOrderId } from "@/lib/toss";
import {
  RITUAL_PRICE_KRW,
  RITUAL_REGULAR_PRICE_KRW,
  APOLOGY_PRICE_KRW,
  BOOK_PRICE_KRW,
  BOOK_COUPON_PRICE_KRW,
  BUNDLE_PRICE_KRW,
  BUNDLE_REGULAR_PRICE_KRW,
  isAllowedPrice,
  productPrice,
  PROMO_GRACE_MS,
} from "@/lib/ritual-types";
import { verifyPaidOwnership } from "@/lib/payment-ownership";
import { track } from "@vercel/analytics/server";
import { logPayEventServer } from "@/lib/pay-events-server";
import { sendOpsAlert } from "@/lib/ops-alert";

const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

/** 결제 확정 시 운영자에게 알림 메일 (실패해도 결제 흐름에 영향 없음) */
async function notifyOperatorPaid(info: {
  orderNumber: string;
  applicantName?: string | null;
  amount: number;
  method?: string | null;
}): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.RESEND_FROM_EMAIL?.trim();
    const to =
      process.env.OPERATOR_NOTIFY_EMAIL?.trim() || "dkjy1416@naver.com";
    if (!apiKey || !from) return;

    const name = (info.applicantName ?? "").trim() || "(이름 없음)";
    const method = (info.method ?? "").trim() || "-";
    const amount = info.amount.toLocaleString();
    const subject = `💰 [월하연] 새 결제 ${amount}원 — ${name}님 (${info.orderNumber})`;
    const text = [
      `새 결제가 확정되었습니다.`,
      ``,
      `주문번호: ${info.orderNumber}`,
      `신청자: ${name}`,
      `금액: ${amount}원`,
      `결제수단: ${method}`,
      `시각: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
      ``,
      `관리자: ${(process.env.SITE_URL ?? "").replace(/\/$/, "")}/admin/orders/${info.orderNumber}`,
    ].join("\n");

    await new Resend(apiKey).emails.send(
      { from: `월하연 알림 <${from}>`, to, subject, text },
      { idempotencyKey: `op-paid-v1-${info.orderNumber}` }
    );
  } catch {
    /* 알림 실패는 무시 — 결제 성공 응답이 우선 */
  }
}

export type PaymentConfirmOutcome =
  | { status: "success"; orderNumber: string }
  | { status: "already_paid"; orderNumber: string }
  | { status: "not_found" }
  | { status: "invalid_request" }
  | { status: "amount_mismatch" }
  | { status: "promo_expired"; orderNumber: string }
  | { status: "confirm_pending"; orderNumber: string }
  | { status: "confirm_failed"; message: string }
  | { status: "server_error" };

export async function confirmOrderPayment(params: {
  paymentKey?: string;
  orderId?: string;
  amount?: string;
}): Promise<PaymentConfirmOutcome> {
  const requestId = randomUUID().slice(0, 8);
  const { paymentKey, orderId, amount } = params;

  /* 파라미터 형식 검증 */
  const orderNumber =
    typeof orderId === "string" && ORDER_NUMBER_RE.test(orderId)
      ? orderId
      : null;
  if (!orderNumber) return { status: "invalid_request" };

  const validKey =
    typeof paymentKey === "string" &&
    paymentKey.length >= 1 &&
    paymentKey.length <= 200;
  const amountNumber = Number(amount);

  try {
    const supabase = getSupabaseAdmin();

    /* 1) 주문 존재 확인 — 개인정보 컬럼은 조회하지 않음 */
    const found = await supabase
      .from("ritual_orders")
      .select("id, payment_amount, payment_status, payment_key, applicant_name, product, created_at")
      .eq("order_number", orderNumber)
      .single();
    if (found.error || !found.data) return { status: "not_found" };
    const row = found.data;

    /* 2) 이미 paid → orderId만으로는 절대 통과시키지 않음.
          실제 결제 리다이렉트에만 있는 paymentKey + amount 가
          DB payment_key / 금액(RITUAL_PRICE_KRW)과 정확히 일치할 때만 already_paid.
          (정상 success URL 새로고침은 일치하므로 계속 이어짐) */
    if (row.payment_status === "paid") {
      const owned = verifyPaidOwnership({
        dbPaymentKey: row.payment_key,
        dbAmount: row.payment_amount,
        expectedAmount: isAllowedPrice(row.payment_amount)
          ? row.payment_amount
          : RITUAL_PRICE_KRW,
        paymentKey,
        amount,
      });
      if (!owned) {
        console.error(`[pay:${requestId}] paid_ownership_mismatch`);
        return { status: "invalid_request" };
      }
      return { status: "already_paid", orderNumber };
    }
    if (row.payment_status !== "pending") {
      return { status: "invalid_request" };
    }

    if (!validKey || !Number.isInteger(amountNumber)) {
      return { status: "invalid_request" };
    }
    const key = paymentKey as string;
    const product = (row as { product?: string | null }).product ?? "message";
    const applicantName = (row as { applicant_name?: string | null }).applicant_name;

    /** 토스 쪽에서 이미 결제 완료(DONE)된 "이 주문"의 결제인가 (주문번호·허용 금액까지 대조) */
    const tossDone = async (): Promise<{ method: string | null; amount: number } | null> => {
      const t = await getTossPayment(key);
      if (
        t &&
        t.status === "DONE" &&
        t.orderId === orderNumber &&
        typeof t.totalAmount === "number" &&
        isAllowedPrice(t.totalAmount)
      ) {
        return { method: t.method, amount: t.totalAmount };
      }
      return null;
    };

    const markPaid = (method: string | null, amountPaid: number) =>
      markOrderPaid({ id: row.id, orderNumber, paymentKey: key, method, amountPaid, requestId });

    const afterPaid = async (method: string | null, amountPaid: number) => {
      await notifyOperatorPaid({ orderNumber, applicantName, amount: amountPaid, method });
      await logPayEventServer(orderNumber, "pay_success", method);
      try {
        await track("payment_success");
      } catch {
        /* analytics 실패가 결제 성공 응답에 영향을 주면 안 됨 */
      }
    };

    /* 3) DB 금액이 허용 가격인가  4) URL amount가 DB 금액과 같은가
          5) 특가·쿠폰 기한 안의 가격인가 (마감 직후 30분 유예).
       쿠폰가는 서버(DB)에서만 정해지므로 브라우저 조작으로 할인 불가. */
    const amountOk = isAllowedPrice(row.payment_amount) && amountNumber === row.payment_amount;
    /* 정가(16,900원)는 첫 구매가 기간 중에도 받는다 — 첫 구매가 도입 전에 열어 둔 결제창 대비 */
    const priceStillValid =
      (product === "message" && row.payment_amount === RITUAL_REGULAR_PRICE_KRW) ||
      [Date.now(), Date.now() - PROMO_GRACE_MS].some(
      (t) =>
        productPrice(product, row.payment_amount, t, (row as { created_at?: string | null }).created_at) ===
        row.payment_amount
    );
    if (!amountOk || !priceStillValid) {
      /* 혹시 예전에 이미 돈이 빠져나간 이 주문의 결제인지 토스에 직접 확인 */
      const done = await tossDone();
      if (done) {
        const r = await markPaid(done.method, done.amount);
        await sendOpsAlert("payment_error", {
          orderNumber,
          code: "late_paid_recovered",
          level: r === "failed" ? "action" : "info",
          detail: `토스에서는 ${done.amount}원 결제 완료였는데 주문이 결제 대기로 남아 있어서 자동으로 결제 완료 처리했습니다${
            r === "failed" ? "(저장 실패 — 확인 필요)" : ""
          }. 결과는 자동으로 만들어집니다.`,
        });
        if (r === "updated") await afterPaid(done.method, done.amount);
        return r === "failed" ? { status: "server_error" } : { status: "already_paid", orderNumber };
      }
      /* 청구 없음 — 예전 결제 화면·예전 결제 주소. 알림 메일 없이 기록만 */
      console.error(`[pay:${requestId}] amount_mismatch url=${amountNumber} db=${row.payment_amount}`);
      if (amountOk && !priceStillValid) {
        await logPayEventServer(orderNumber, "amount_mismatch", `expired_${row.payment_amount}`);
        return { status: "promo_expired", orderNumber };
      }
      await logPayEventServer(orderNumber, "amount_mismatch", `url${amountNumber}_db${row.payment_amount}`);
      return { status: "amount_mismatch" };
    }

    /* 6) 토스 승인 — 금액은 DB 값 사용 */
    const confirm = await confirmTossPayment({
      paymentKey: key,
      orderId: orderNumber,
      amount: row.payment_amount,
    });

    if (confirm.ok) {
      /* 토스가 승인한 주문·금액이 이 주문과 정확히 같은지 한 번 더 대조 */
      if (
        confirm.orderId !== orderNumber ||
        confirm.totalAmount !== row.payment_amount
      ) {
        console.error(`[pay:${requestId}] confirm_mismatch`);
        await sendOpsAlert("payment_error", {
          orderNumber,
          code: "confirm_mismatch",
          detail: "토스 승인 응답의 주문번호/금액이 주문과 달라 결제 완료 처리하지 않았습니다. 토스 관리자에서 해당 결제를 확인해 주세요.",
        });
        return { status: "invalid_request" };
      }
      /* 승인 성공 후에만 paid 반영. 저장이 끝내 실패해도 고객 돈은 승인됐으므로 성공으로 안내(운영자 알림 발송됨) */
      const r = await markPaid(confirm.method ?? null, row.payment_amount);
      if (r !== "already") await afterPaid(confirm.method ?? null, row.payment_amount);
      return { status: "success", orderNumber };
    }

    /* 이미 승인된 결제의 재전송 → 토스에서 이 주문·금액의 결제가 맞는지 확인한 뒤 DB 보정 */
    if (confirm.code === "ALREADY_PROCESSED_PAYMENT") {
      const done = await tossDone();
      if (done && done.amount === row.payment_amount) {
        const r = await markPaid(done.method, done.amount);
        if (r === "updated") await afterPaid(done.method, done.amount);
        return r === "failed" ? { status: "server_error" } : { status: "already_paid", orderNumber };
      }
      await logPayEventServer(orderNumber, "confirm_failed", "ALREADY_PROCESSED_NOT_THIS_ORDER");
      return { status: "invalid_request" };
    }

    /* 응답을 못 받았거나(네트워크·토스 서버 오류) 알 수 없는 오류 → 실제로 결제됐는지 토스에 확인 (최대 3번) */
    const uncertain =
      confirm.code === "NETWORK_ERROR" ||
      /^HTTP_5\d\d$/.test(confirm.code ?? "") ||
      confirm.code === "PROVIDER_ERROR" ||
      confirm.code === "FAILED_INTERNAL_SYSTEM_PROCESSING" ||
      confirm.code === "UNKNOWN_PAYMENT_ERROR";
    for (let i = 0; i < (uncertain ? 3 : 1); i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 2_000));
      const done = await tossDone();
      if (done && done.amount === row.payment_amount) {
        const r = await markPaid(done.method, done.amount);
        if (r === "updated") await afterPaid(done.method, done.amount);
        return r === "failed" ? { status: "server_error" } : { status: "success", orderNumber };
      }
    }
    /* 동시에 열린 다른 요청이 이미 결제 완료 처리했는지 */
    const again = await supabase
      .from("ritual_orders")
      .select("payment_status")
      .eq("id", row.id)
      .maybeSingle();
    if (again.data?.payment_status === "paid") return { status: "already_paid", orderNumber };

    if (uncertain) {
      /* 결과를 모르는 상태 — 다시 결제하면 두 번 빠질 수 있으니 재결제 버튼 대신 안내.
         자동 재확인(스위퍼)이 토스 결제 상태를 다시 조회해 처리한다. */
      console.error(`[pay:${requestId}] confirm_uncertain code=${confirm.code}`);
      await logPayEventServer(orderNumber, "confirm_pending", confirm.code);
      await sendOpsAlert("payment_error", {
        orderNumber,
        code: `confirm_uncertain_${confirm.code}`,
        level: "info",
        detail: "토스 승인 응답을 받지 못했습니다. 몇 분 안에 자동으로 토스 결제 상태를 다시 확인해, 결제됐으면 결과까지 자동으로 이어집니다.",
      });
      return { status: "confirm_pending", orderNumber };
    }

    console.error(`[pay:${requestId}] confirm_failed code=${confirm.code}`);
    await logPayEventServer(orderNumber, "confirm_failed", confirm.code);
    return {
      status: "confirm_failed",
      message:
        confirm.code === "INVALID_UNREGISTERED_SUBMALL"
          ? "현대카드는 지금 카드사 심사가 진행 중이라 결제가 되지 않아요. 현대카드가 아닌 다른 카드로 결제해 주세요. 카카오페이·네이버페이 같은 간편결제도 현대카드가 아닌 결제수단을 골라 주세요."
          : confirm.message ??
            "결제 승인에 실패했습니다. 다시 시도하시거나 잠시 후 이용해주세요.",
    };
  } catch {
    console.error(`[pay:${requestId}] server_error`);
    await sendOpsAlert("payment_error", { orderNumber, code: "server_error" });
    return { status: "server_error" };
  }
}

/** 결제 금액으로 상품 판정 (결제 도중 다른 탭에서 상품을 바꿔도 실제 결제 금액 기준으로 저장) */
function productForAmount(amount: number): "message" | "book" | "bundle" | null {
  if (amount === APOLOGY_PRICE_KRW || amount === RITUAL_PRICE_KRW || amount === RITUAL_REGULAR_PRICE_KRW)
    return "message";
  if (amount === BOOK_PRICE_KRW || amount === BOOK_COUPON_PRICE_KRW) return "book";
  if (amount === BUNDLE_PRICE_KRW || amount === BUNDLE_REGULAR_PRICE_KRW) return "bundle";
  return null;
}

/** 결제 완료 반영 — pending일 때만, 실패하면 3번까지 다시 시도.
 *  updated = 이번에 반영, already = 이미 다른 요청이 반영, failed = 저장 실패(운영자 알림) */
async function markOrderPaid(p: {
  id: string;
  orderNumber: string;
  paymentKey: string;
  method: string | null;
  amountPaid: number;
  requestId: string;
}): Promise<"updated" | "already" | "failed"> {
  const supabase = getSupabaseAdmin();
  const patch: Record<string, unknown> = {
    payment_status: "paid",
    payment_key: p.paymentKey,
    payment_method: p.method,
    payment_amount: p.amountPaid,
    paid_at: new Date().toISOString(),
  };
  const prod = productForAmount(p.amountPaid);
  if (prod) patch.product = prod;
  for (let i = 0; i < 3; i++) {
    const upd = await supabase
      .from("ritual_orders")
      .update(patch)
      .eq("id", p.id)
      .eq("payment_status", "pending")
      .select("id");
    if (!upd.error) {
      if (upd.data && upd.data.length > 0) return "updated";
      const again = await supabase
        .from("ritual_orders")
        .select("payment_status")
        .eq("id", p.id)
        .maybeSingle();
      if (again.data?.payment_status === "paid") return "already";
    }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  console.error(`[pay:${p.requestId}] db_update_failed`);
  await sendOpsAlert("payment_error", {
    orderNumber: p.orderNumber,
    code: "db_update_failed",
    detail: "토스 결제는 승인됐지만 주문 상태 저장에 3번 실패했습니다. 관리자 화면에서 이 주문을 확인해 주세요.",
  });
  return "failed";
}

/**
 * 승인 응답을 못 받은 주문 재확인 (자동 재처리에서 호출).
 * 토스에 주문번호로 조회해서 이 주문의 결제가 DONE이고 허용 금액이면 결제 완료로 반영.
 */
export async function reconcilePendingOrder(orderNumber: string): Promise<"paid" | "not_paid" | "error"> {
  try {
    const supabase = getSupabaseAdmin();
    const found = await supabase
      .from("ritual_orders")
      .select("id, payment_status, applicant_name")
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (!found.data) return "error";
    if (found.data.payment_status === "paid") return "paid";
    if (found.data.payment_status !== "pending") return "not_paid";
    const t = await getTossPaymentByOrderId(orderNumber);
    if (
      !t ||
      t.status !== "DONE" ||
      t.orderId !== orderNumber ||
      !t.paymentKey ||
      typeof t.totalAmount !== "number" ||
      !isAllowedPrice(t.totalAmount)
    ) {
      return "not_paid";
    }
    const r = await markOrderPaid({
      id: found.data.id as string,
      orderNumber,
      paymentKey: t.paymentKey,
      method: t.method,
      amountPaid: t.totalAmount,
      requestId: "reconcile",
    });
    if (r === "failed") return "error";
    if (r === "updated") {
      await notifyOperatorPaid({
        orderNumber,
        applicantName: found.data.applicant_name as string | null,
        amount: t.totalAmount,
        method: t.method,
      });
      await logPayEventServer(orderNumber, "pay_success", t.method);
    }
    return "paid";
  } catch {
    return "error";
  }
}
