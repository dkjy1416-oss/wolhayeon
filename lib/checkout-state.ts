import "server-only";
/**
 * 11/17: 미리보기 화면에서 바로 여는 결제 시트용 — 주문의 결제 정보를 준비한다.
 * /apply/complete 의 서버 규칙과 같다:
 *  - 금액은 항상 서버가 상품 규칙(productPrice)으로 정한다(브라우저가 정하지 않음).
 *  - 결제 전(pending) 주문만 상품을 바꾼다. 책 쿠폰·추가 구매 주문은 바꾸지 않는다.
 * 개인정보(이름·사연·이메일)는 돌려주지 않는다.
 */
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  RITUAL_PRICE_KRW,
  BOOK_COUPON_PRICE_KRW,
  BOOK_UPGRADE_PRICE_KRW,
  FIRST_OFFER_PRICE_KRW,
  FIRST_OFFER_BUNDLE_PRICE_KRW,
  PRODUCTS,
  firstOfferEndsAt,
  isAllowedPrice,
  isFirstOfferActive,
  isProduct,
  isPromoActive,
  offerAnchor,
  productPrice,
  regularPriceFor,
  type Product,
} from "@/lib/ritual-types";
import { PAYMENTS_OPEN, BOOK_SALES_OPEN } from "@/lib/payment-availability";
import { logPayEventServer } from "@/lib/pay-events-server";
import { redeemChatBundle, BUNDLE_COOKIE } from "@/lib/chat/bundle";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isOperatorEmail } from "@/lib/admin-util";

export type CheckoutState =
  | { ok: false; error: "not_found" | "server_error" }
  | { ok: true; redirect: string }
  | {
      ok: true;
      status: string;
      product: Product;
      amount: number;
      amountValid: boolean;
      regular: number;
      orderName: string;
      title: string;
      messagePrice: number;
      bundlePrice: number;
      offerEndsAt: number | null;
      paymentsOpen: boolean;
      bookSales: boolean;
      /** 관리자 로그인 + 운영자(테스트) 이메일 주문일 때만 — 결제 없이 전체 결과 보기 */
      adminFree: boolean;
    };

export async function prepareCheckout(orderNumber: string, productParam: string | null, paytest = false): Promise<CheckoutState> {
  const paymentsOpen = PAYMENTS_OPEN || paytest;
  const bookSales = BOOK_SALES_OPEN || paytest;
  let row: {
    payment_amount: number;
    payment_status: string;
    product: string | null;
    message_amount: number | null;
    created_at: string;
    remind_sent_at: string | null;
    email: string | null;
  } | null = null;
  try {
    const supabase = getSupabaseAdmin();
    const res = await supabase
      .from("ritual_orders")
      .select("payment_amount, payment_status, product, message_amount, created_at, remind_sent_at, email")
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (res.error) return { ok: false, error: "server_error" };
    if (!res.data) return { ok: false, error: "not_found" };
    row = res.data;
    if (row && row.payment_status === "pending" && isAllowedPrice(row.payment_amount)) {
      const current: Product = isProduct(row.product) ? row.product : "message";
      const couponLocked =
        current === "book" && (row.payment_amount === BOOK_COUPON_PRICE_KRW || row.payment_amount === BOOK_UPGRADE_PRICE_KRW);
      const isUpgradeOrder = current === "book" && row.payment_amount === BOOK_UPGRADE_PRICE_KRW;
      const target: Product = bookSales && !couponLocked && isProduct(productParam) ? productParam : current;
      const base = current !== "message" && target === "message" ? row.message_amount ?? RITUAL_PRICE_KRW : row.payment_amount;
      const want = isUpgradeOrder ? row.payment_amount : productPrice(target, base, Date.now(), offerAnchor(row));
      if (!isUpgradeOrder && (want !== row.payment_amount || target !== current)) {
        const patch: Record<string, unknown> = { payment_amount: want, product: target };
        if (current === "message" && target !== "message") patch.message_amount = row.payment_amount;
        const upd = await supabase
          .from("ritual_orders")
          .update(patch)
          .eq("order_number", orderNumber)
          .eq("payment_status", "pending");
        if (!upd.error) {
          row = { ...row, payment_amount: want, product: target };
          if (target !== current) await logPayEventServer(orderNumber, "product_change", target);
        }
      }
    }
  } catch {
    return { ok: false, error: "server_error" };
  }
  if (!row) return { ok: false, error: "not_found" };

  /* 카톡 분석 패키지 손님: 결제 없이 결과 생성으로 (결제 화면과 같은 규칙) */
  if (row.payment_status === "pending") {
    const cb = (await cookies()).get(BUNDLE_COOKIE)?.value;
    const to = cb ? await redeemChatBundle(orderNumber, cb) : null;
    if (to) return { ok: true, redirect: to };
  }

  const product: Product = isProduct(row.product) ? row.product : "message";
  const anchor = offerAnchor(row);
  const offerOn = !isPromoActive() && isFirstOfferActive(anchor);
  const messagePrice =
    product === "message" ? row.payment_amount : productPrice("message", row.message_amount ?? RITUAL_PRICE_KRW, Date.now(), anchor);
  const bundlePrice = productPrice("bundle", null, Date.now(), anchor);
  const offerEndsAt =
    offerOn &&
    ((product === "message" && row.payment_amount === FIRST_OFFER_PRICE_KRW) ||
      (product === "bundle" && row.payment_amount === FIRST_OFFER_BUNDLE_PRICE_KRW))
      ? firstOfferEndsAt(anchor)
      : null;

  let adminFree = false;
  if (row.payment_status === "pending" && isOperatorEmail(row.email)) {
    try {
      adminFree = await isAdminAuthenticated();
    } catch {
      adminFree = false;
    }
  }

  return {
    ok: true,
    status: row.payment_status,
    product,
    amount: row.payment_amount,
    amountValid: isAllowedPrice(row.payment_amount),
    regular: regularPriceFor(product),
    orderName: PRODUCTS[product].orderName,
    title: PRODUCTS[product].name,
    messagePrice,
    bundlePrice,
    offerEndsAt,
    paymentsOpen,
    bookSales,
    adminFree,
  };
}
