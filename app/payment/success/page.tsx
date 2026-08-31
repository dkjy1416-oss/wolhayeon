import Link from "next/link";
import { confirmOrderPayment } from "@/lib/payment-confirm";
import { createProcessToken } from "@/lib/customer-process-auth";
import AutoResultProcessing from "@/components/payment/AutoResultProcessing";

function SuccessView({ orderNumber }: { orderNumber: string }) {
  /* 서버가 결제를 success/already_paid로 확인한 경우에만 이 뷰가 렌더되며,
     그 주문에 한해 30분짜리 서명 처리 토큰을 발급해 자동 처리 화면을 시작.
     (RITUAL_ADMIN_SECRET 자체는 전달되지 않고 서명 결과만 전달) */
  const processToken = createProcessToken(orderNumber);

  if (!processToken) {
    /* 서명키 미설정 등 — 결제는 완료 상태이므로 안내만 (재결제 유도 없음) */
    return (
      <main className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col items-center justify-center px-6 py-20 text-center">
        <p className="text-xs tracking-[0.35em] text-gold/90">月下緣</p>
        <h1 className="font-display mt-6 text-2xl font-semibold text-ivory">
          결제가 완료되었습니다.
        </h1>
        <p className="mt-5 text-[0.95rem] font-light leading-[2] text-ivory-dim">
          결과가 준비되면 신청서에 적어주신
          <br />
          이메일로 안내드립니다.
        </p>
        <div className="mt-9 w-full rounded-2xl border border-gold-dim/30 bg-ink-soft px-6 py-6">
          <p className="text-xs tracking-wide text-ivory-dim">주문번호</p>
          <p className="font-display mt-2 text-xl font-semibold tracking-wider text-gold">
            {orderNumber}
          </p>
        </div>
        <Link
          href="/"
          className="mt-10 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold-dim/40 text-[0.95rem] text-ivory"
        >
          홈으로 돌아가기
        </Link>
      </main>
    );
  }

  return (
    <AutoResultProcessing orderNumber={orderNumber} processToken={processToken} />
  );
}

function ErrorView({
  message,
  retryOrder,
}: {
  message: string;
  retryOrder: string | null;
}) {
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <p className="text-xs tracking-[0.35em] text-gold/90">月下緣</p>
      <h1 className="font-display mt-6 text-xl leading-relaxed text-ivory">
        결제가 완료되지 않았습니다.
      </h1>
      <p className="mt-5 max-w-sm text-sm leading-[1.9] text-ivory-dim">
        {message}
      </p>
      {retryOrder && (
        <Link
          href={`/apply/complete?order=${encodeURIComponent(retryOrder)}`}
          className="mt-9 inline-flex h-14 w-full max-w-xs items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory active:opacity-85"
        >
          다시 결제하기
        </Link>
      )}
      <Link
        href="/"
        className="mt-6 text-xs text-ivory-dim/60 underline underline-offset-4"
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    paymentKey?: string;
    orderId?: string;
    amount?: string;
  }>;
}) {
  const params = await searchParams;

  /* success URL 도착만으로 paid 처리하지 않음 —
     서버 검증 + 토스 승인 API를 거친 결과로만 화면을 결정 */
  const result = await confirmOrderPayment(params);

  switch (result.status) {
    case "success":
    case "already_paid":
      return <SuccessView orderNumber={result.orderNumber} />;
    case "not_found":
      return (
        <ErrorView message="주문 정보를 찾을 수 없습니다." retryOrder={null} />
      );
    case "amount_mismatch":
      return (
        <ErrorView
          message="결제 금액이 주문 정보와 일치하지 않아 승인하지 않았습니다. 다시 시도해주세요."
          retryOrder={
            typeof params.orderId === "string" ? params.orderId : null
          }
        />
      );
    case "confirm_failed":
      return (
        <ErrorView
          message={result.message}
          retryOrder={
            typeof params.orderId === "string" ? params.orderId : null
          }
        />
      );
    case "invalid_request":
      return (
        <ErrorView
          message="결제 정보가 올바르지 않습니다. 다시 시도하시거나 잠시 후 이용해주세요."
          retryOrder={
            typeof params.orderId === "string" ? params.orderId : null
          }
        />
      );
    default:
      return (
        <ErrorView
          message="일시적인 문제가 발생했습니다. 다시 시도하시거나 잠시 후 이용해주세요."
          retryOrder={
            typeof params.orderId === "string" ? params.orderId : null
          }
        />
      );
  }
}
