import Link from "next/link";
import { CONTENT_VIEW_LINE } from "@/lib/content-access-policy";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  RITUAL_PRICE_KRW,
  RITUAL_REGULAR_PRICE_KRW,
  APOLOGY_PRICE_KRW,
  BOOK_COUPON_PRICE_KRW,
  BOOK_COUPON_DEADLINE_TEXT,
  BOOK_PRICE_KRW,
  isAllowedPrice,
  priceBadge,
  listPriceKRW,
  PROMO_DEADLINE_TEXT,
  isPromoActive,
  FIRST_OFFER_PRICE_KRW,
  FIRST_OFFER_BUNDLE_PRICE_KRW,
  firstOfferEndsAt,
  isFirstOfferActive,
  offerAnchor,
  isProduct,
  productPrice,
  PRODUCTS,
  type Product,
} from "@/lib/ritual-types";
import ProductPicker from "@/components/pay/ProductPicker";
import { PAYMENTS_OPEN, BOOK_SALES_OPEN } from "@/lib/payment-availability";
import PayEventPing from "@/components/pay/PayEventPing";
import InAppBrowserNotice from "@/components/pay/InAppBrowserNotice";
import OfferCountdown from "@/components/pay/OfferCountdown";
import TossCheckout from "@/components/pay/TossCheckout";
import { TestPaymentNotice } from "@/components/pay/TestModeNotices";

/** 주문번호 형식 (개인정보 아님 — URL에 넣을 수 있는 유일한 값) */
const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

function Guard({
  title,
  linkHref,
  linkLabel,
}: {
  title: string;
  linkHref: string;
  linkLabel: string;
}) {
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-xl leading-relaxed text-ivory">{title}</p>
      <Link
        href={linkHref}
        className="mt-8 inline-flex h-13 items-center justify-center rounded-full border border-gold-dim/40 px-8 text-sm text-ivory"
      >
        {linkLabel}
      </Link>
    </main>
  );
}

export default async function CompletePage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; paytest?: string; product?: string }>;
}) {
  const { order, paytest, product: productParam } = await searchParams;
  /* 운영자 실결제 테스트용: 결제가 닫혀 있어도 ?paytest=1 이면 결제창 표시 */
  const paymentsOpen = PAYMENTS_OPEN || paytest === "1";
  /* 책·패키지 판매: 오픈 전에는 운영자 테스트(?paytest=1)에서만 */
  const bookSales = BOOK_SALES_OPEN || paytest === "1";
  const orderNumber =
    typeof order === "string" && ORDER_NUMBER_RE.test(order) ? order : null;

  if (!orderNumber) {
    return (
      <Guard
        title="주문 정보를 찾을 수 없습니다."
        linkHref="/apply"
        linkLabel="신청서 작성하기"
      />
    );
  }

  /* 결제창을 띄우기 전, 서버에서 주문 실존 여부·상태·금액을 확인.
     (query parameter의 order 값만 신뢰하지 않음, 개인정보 컬럼 미조회) */
  let row: {
    payment_amount: number;
    payment_status: string;
    product: string | null;
    message_amount: number | null;
    created_at: string;
    remind_sent_at: string | null;
  } | null = null;
  let lookupFailed = false;
  try {
    const supabase = getSupabaseAdmin();
    const res = await supabase
      .from("ritual_orders")
      .select("payment_amount, payment_status, product, message_amount, created_at, remind_sent_at")
      .eq("order_number", orderNumber)
      .single();
    if (!res.error && res.data) {
      row = res.data;
      /* 상품 선택 반영 + 특가·사과 쿠폰 마감(10/4) 이후엔 정가로 맞춤.
         금액은 항상 서버가 상품 규칙으로 정한다. */
      if (row && row.payment_status === "pending" && isAllowedPrice(row.payment_amount)) {
        const current: Product = isProduct(row.product) ? row.product : "message";
        /* 책 쿠폰(26,000원) 주문은 책 전용 — 상품을 바꾸면 쿠폰이 사라지므로 바꾸지 않는다 */
        const couponLocked = current === "book" && row.payment_amount === BOOK_COUPON_PRICE_KRW;
        const target: Product =
          bookSales && !couponLocked && isProduct(productParam) ? productParam : current;
        /* 책·패키지에서 메시지로 돌아오면 저장 금액이 책값이므로 메시지 기본가로 계산 */
        const base =
          current !== "message" && target === "message"
            ? row.message_amount ?? RITUAL_PRICE_KRW
            : row.payment_amount;
        const want = productPrice(target, base, Date.now(), offerAnchor(row));
        if (want !== row.payment_amount || target !== current) {
          /* 메시지 → 책·패키지로 바꿀 때 원래 메시지 금액(사과 쿠폰 9,900원 등)을 기억해 두었다가
             다시 메시지로 돌아오면 그대로 적용 */
          const patch: Record<string, unknown> = { payment_amount: want, product: target };
          if (current === "message" && target !== "message") patch.message_amount = row.payment_amount;
          const upd = await supabase
            .from("ritual_orders")
            .update(patch)
            .eq("order_number", orderNumber)
            .eq("payment_status", "pending");
          if (!upd.error) row = { ...row, payment_amount: want, product: target };
        }
      }
    }
    else if (res.error && res.error.code !== "PGRST116") lookupFailed = true;
  } catch {
    lookupFailed = true;
  }

  if (lookupFailed) {
    return (
      <Guard
        title="주문 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
        linkHref={`/apply/complete?order=${encodeURIComponent(orderNumber)}`}
        linkLabel="다시 시도"
      />
    );
  }
  if (!row) {
    return (
      <Guard
        title="주문 정보를 찾을 수 없습니다."
        linkHref="/apply"
        linkLabel="신청서 작성하기"
      />
    );
  }

  /* 이미 결제 완료 → 결제창을 다시 띄우지 않음 */
  const alreadyPaid = row.payment_status === "paid";
  /* pending인데 금액이 허용 가격(정상가·사과 쿠폰가)이 아니면 비정상 주문 → 결제 진행 금지 */
  const amountValid = isAllowedPrice(row.payment_amount);
  /* 결제 오류 사과 쿠폰이 적용된 주문 */
  const isApologyCoupon = row.payment_amount === APOLOGY_PRICE_KRW;
  const badge = priceBadge(row.payment_amount);
  const product: Product = isProduct(row.product) ? row.product : "message";
  const messagePrice =
    product === "message"
      ? row.payment_amount
      : productPrice("message", row.message_amount ?? RITUAL_PRICE_KRW, Date.now(), offerAnchor(row));
  /* 첫 구매가 적용 중이면 마감 시각 (메시지 결제일 때만 표시) */
  const anchor = offerAnchor(row);
  const offerOn = !isPromoActive() && isFirstOfferActive(anchor);
  const bundleNowPrice = productPrice("bundle", null, Date.now(), anchor);
  const offerEnd =
    offerOn &&
    ((product === "message" && row.payment_amount === FIRST_OFFER_PRICE_KRW) ||
      (product === "bundle" && row.payment_amount === FIRST_OFFER_BUNDLE_PRICE_KRW))
      ? firstOfferEndsAt(anchor)
      : null;

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim();

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-6 pb-16 pt-14">
      {!alreadyPaid && (
        <PayEventPing
          orderNumber={orderNumber}
          event="pay_page_view"
          code={paymentsOpen ? "open" : "closed"}
        />
      )}
      <p className="text-center text-xs tracking-[0.35em] text-gold/90">
        月下緣
      </p>

      <h1 className="font-display mt-6 text-center text-2xl font-semibold leading-[1.55] text-ivory">
        월화의 이야기를
        <br />
        계속 열어볼게요.
      </h1>
      <p className="mt-4 text-center text-[0.92rem] font-light leading-[1.9] text-ivory-dim">
        방금 본 미리보기 다음 이야기부터 이어집니다.
      </p>

      {alreadyPaid ? (
        <>
          <p className="mt-9 text-center text-[0.95rem] leading-[2] text-ivory">
            이 주문은 이미 결제가 완료되었습니다.
          </p>
          <p className="mt-3 text-center text-[0.88rem] font-light leading-[2] text-ivory-dim">
            결제 완료 화면이 열려 있다면
            <br />
            그 화면에서 결과 준비가 이어집니다.
            <br />
            결과가 완성되면 입력한 이메일로도 전달됩니다.
          </p>
          <Link
            href="/"
            className="mt-9 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold-dim/40 text-[0.95rem] text-ivory transition-colors hover:border-gold/60"
          >
            홈으로 돌아가기
          </Link>
        </>
      ) : !paymentsOpen ? (
        <>
          <p className="mt-9 text-center text-[0.8rem] text-ivory-dim">
            {isPromoActive() && (
              <span className="line-through opacity-60">
                {RITUAL_REGULAR_PRICE_KRW.toLocaleString()}원
              </span>
            )}
            {isPromoActive() && (
              <span className="ml-2 text-thread">재오픈 기념 특가 · {PROMO_DEADLINE_TEXT}</span>
            )}
          </p>
          <p className="font-display mt-1.5 text-center text-3xl font-semibold text-gold">
            {listPriceKRW().toLocaleString()}
            <span className="ml-1 text-lg text-ivory-dim">원</span>
          </p>
          <div className="mt-8 rounded-2xl border border-gold-dim/30 bg-ink-soft/60 px-6 py-7 text-center">
            <p className="text-[0.68rem] tracking-[0.3em] text-thread/90">
              결제 오픈 준비 중
            </p>
            <p className="mt-4 text-[0.92rem] leading-[2] text-ivory">
              카드·간편결제 심사가
              <br />
              마무리되는 대로 결제가 열려요.
            </p>
            <p className="mt-3 text-[0.82rem] font-light leading-[2] text-ivory-dim">
              열리는 날, 입력하신 이메일로
              <br />
              가장 먼저 알려드릴게요.
              <br />
              지금 신청하신 가격은 그대로 지켜둡니다.
            </p>
          </div>
          <p className="mt-5 text-center text-[0.78rem] leading-[1.9] text-ivory-dim/70">
            들려주신 이야기와 미리보기는 안전하게 보관되어 있어요.
          </p>
          <p className="mt-4 text-center text-[0.68rem] text-ivory-dim/45">
            주문번호 {orderNumber}
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold-dim/40 text-[0.95rem] text-ivory transition-colors hover:border-gold/60"
          >
            홈으로 돌아가기
          </Link>
        </>
      ) : !amountValid ? (
        <p className="mt-10 text-center text-sm leading-[1.9] text-ivory-dim">
          주문 금액 정보에 문제가 있어 결제를 진행할 수 없습니다.
        </p>
      ) : !clientKey ? (
        <p className="mt-10 text-center text-sm leading-[1.9] text-ivory-dim">
          결제 설정이 아직 완료되지 않았습니다.
          <br />
          잠시 후 다시 시도해주세요.
        </p>
      ) : (
        <>
          {isApologyCoupon ? (
            <div className="mt-9 rounded-xl border border-thread/40 bg-thread/10 px-4 py-3 text-center">
              <p className="text-[0.78rem] font-medium text-thread">
                결제 오류 사과 쿠폰 적용
              </p>
              <p className="mt-1 text-[0.72rem] font-light leading-[1.8] text-ivory-dim">
                결제가 원활하지 않아 불편을 드려 죄송해요.
              </p>
            </div>
          ) : null}
          {bookSales && !(product === "book" && row.payment_amount === BOOK_COUPON_PRICE_KRW) && (
          <div className="mt-9">
            <p className="mb-3 text-center text-[0.72rem] tracking-[0.25em] text-gold/80">
              받아볼 구성을 골라주세요
            </p>
            <ProductPicker
              orderNumber={orderNumber}
              selected={product}
              messagePrice={messagePrice}
              bundlePrice={bundleNowPrice}
              offerOn={offerOn}
              extraQuery={paytest === "1" ? "&paytest=1" : ""}
            />
          </div>
          )}
          {product === "message" && badge.strike !== null && (
            <p className={`${isApologyCoupon ? "mt-5" : "mt-9"} text-center text-[0.8rem] text-ivory-dim`}>
              <span className="line-through opacity-60">
                {badge.strike.toLocaleString()}원
              </span>
              <span className="ml-2 text-thread">{badge.label}</span>
            </p>
          )}
          {product !== "message" && (
            <p className="mt-9 text-center text-[0.8rem] text-ivory-dim">
              {PRODUCTS[product].name}
              {product === "book" && row.payment_amount === BOOK_COUPON_PRICE_KRW && (
                <span className="mt-1 block">
                  <span className="line-through opacity-60">{BOOK_PRICE_KRW.toLocaleString()}원</span>
                  <span className="ml-2 text-thread">책 출간 기념 쿠폰 · {BOOK_COUPON_DEADLINE_TEXT}</span>
                </span>
              )}
            </p>
          )}
          <p className={`font-display ${product === "message" && badge.strike !== null ? "mt-1.5" : product === "message" ? "mt-9" : "mt-1.5"} text-center text-3xl font-semibold text-gold`}>
            {row.payment_amount.toLocaleString()}
            <span className="ml-1 text-lg text-ivory-dim">원</span>
          </p>
          <p className="mt-2 text-center text-xs tracking-wide text-ivory-dim">
            1회 결제 · 정기결제 없음
          </p>
          <p className="mt-1.5 text-center text-xs text-ivory-dim">
            {product === "book"
              ? "PDF 책 다운로드 가능 기간: 결제일로부터 60일"
              : product === "bundle"
              ? `${CONTENT_VIEW_LINE} · PDF 책 다운로드는 60일`
              : CONTENT_VIEW_LINE}
          </p>
          <p className="mt-1.5 text-center text-[0.7rem] text-ivory-dim/80">
            결제 완료 후 결과가 생성됩니다 · 입력하신 사연은 결과를 만드는 데에만 사용됩니다
          </p>

          <div className="mt-7">
            <TossCheckout
              clientKey={clientKey}
              orderNumber={orderNumber}
              amount={row.payment_amount}
              orderName={PRODUCTS[product].orderName}
            />
          </div>
          {offerEnd && <OfferCountdown endsAt={offerEnd} className="mt-3 text-center" />}
          <InAppBrowserNotice orderNumber={orderNumber} />

          {/* 테스트 결제 단계 전용 — 실결제 전환 시 제거 (TestModeNotices.tsx 참고) */}
          <TestPaymentNotice />

          <p className="mt-6 text-center text-[0.68rem] text-ivory-dim/45">
            주문번호 {orderNumber}
          </p>

          <Link
            href="/"
            className="mt-8 text-center text-xs text-ivory-dim/60 underline underline-offset-4"
          >
            나중에 결제하기 (홈으로)
          </Link>
        </>
      )}
    </main>
  );
}
