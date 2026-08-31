import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { RITUAL_PRICE_KRW } from "@/lib/ritual-types";
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
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
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
  let row: { payment_amount: number; payment_status: string } | null = null;
  let lookupFailed = false;
  try {
    const supabase = getSupabaseAdmin();
    const res = await supabase
      .from("ritual_orders")
      .select("payment_amount, payment_status")
      .eq("order_number", orderNumber)
      .single();
    if (!res.error && res.data) row = res.data;
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
  /* pending인데 금액이 16,900원이 아니면 비정상 주문 → 결제 진행 금지 */
  const amountValid = row.payment_amount === RITUAL_PRICE_KRW;

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim();

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-6 pb-16 pt-20">
      <p className="text-center text-xs tracking-[0.35em] text-gold/90">
        月下緣
      </p>

      <h1 className="font-display mt-6 text-center text-2xl font-semibold text-ivory">
        신청이 접수되었습니다.
      </h1>
      <p className="mt-4 text-center text-[0.95rem] font-light leading-[2] text-ivory-dim">
        당신의 이야기를 안전하게 받았습니다.
      </p>

      <div className="mt-8 rounded-2xl border border-gold-dim/30 bg-ink-soft px-6 py-6 text-center">
        <p className="text-xs tracking-wide text-ivory-dim">주문번호</p>
        <p className="font-display mt-2 text-xl font-semibold tracking-wider text-gold">
          {orderNumber}
        </p>
      </div>

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
          <h2 className="font-display mt-12 text-center text-xl font-semibold text-ivory">
            결제를 완료해주세요
          </h2>
          <p className="font-display mt-4 text-center text-3xl font-semibold text-gold">
            {RITUAL_PRICE_KRW.toLocaleString()}
            <span className="ml-1 text-lg text-ivory-dim">원</span>
          </p>
          <p className="mt-2 text-center text-xs tracking-wide text-ivory-dim">
            1회 결제 · 정기결제 없음
          </p>

          <div className="mt-7">
            <TossCheckout
              clientKey={clientKey}
              orderNumber={orderNumber}
              amount={row.payment_amount}
            />
          </div>

          {/* 테스트 결제 단계 전용 — 실결제 전환 시 제거 (TestModeNotices.tsx 참고) */}
          <TestPaymentNotice />

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
