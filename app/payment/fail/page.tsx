import Link from "next/link";

const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

/** 자주 발생하는 토스 오류 코드만 부드러운 문구로 변환.
    그 외 내부 오류 메시지는 사용자에게 그대로 노출하지 않음. */
const FRIENDLY: Record<string, string> = {
  PAY_PROCESS_CANCELED: "결제를 중단하셨습니다. 준비되시면 다시 시도해주세요.",
  PAY_PROCESS_ABORTED: "결제가 진행되지 못했습니다. 잠시 후 다시 시도해주세요.",
  REJECT_CARD_COMPANY:
    "카드사에서 결제를 거절했습니다. 다른 결제수단을 이용해주세요.",
};

export default async function PaymentFailPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; orderId?: string }>;
}) {
  const { code, orderId } = await searchParams;
  const orderNumber =
    typeof orderId === "string" && ORDER_NUMBER_RE.test(orderId)
      ? orderId
      : null;

  const friendly =
    (typeof code === "string" && FRIENDLY[code]) ||
    "다시 시도하시거나 잠시 후 이용해주세요.";

  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <p className="text-xs tracking-[0.35em] text-gold/90">月下緣</p>
      <h1 className="font-display mt-6 text-xl leading-relaxed text-ivory">
        결제가 완료되지 않았습니다.
      </h1>
      <p className="mt-5 max-w-sm text-sm leading-[1.9] text-ivory-dim">
        {friendly}
      </p>
      <p className="mt-4 text-[0.7rem] text-ivory-dim/50">
        입력하신 신청 내용은 안전하게 보관되어 있습니다.
      </p>

      {orderNumber && (
        <Link
          href={`/apply/complete?order=${encodeURIComponent(orderNumber)}`}
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
