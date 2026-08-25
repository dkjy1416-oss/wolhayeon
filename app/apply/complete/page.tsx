import Link from "next/link";

/** 주문번호 형식 (개인정보 아님 — URL에 넣을 수 있는 유일한 값) */
const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

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
      <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-xl text-ivory">
          주문 정보를 찾을 수 없습니다.
        </p>
        <Link
          href="/apply"
          className="mt-8 inline-flex h-13 items-center justify-center rounded-full border border-gold-dim/40 px-8 text-sm text-ivory"
        >
          신청서 작성하기
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-xs tracking-[0.35em] text-gold/90">月下緣</p>

      <h1 className="font-display mt-6 text-2xl font-semibold text-ivory">
        신청이 접수되었습니다.
      </h1>
      <p className="mt-5 text-[0.95rem] font-light leading-[2] text-ivory-dim">
        당신의 이야기를 안전하게 받았습니다.
      </p>

      <div className="mt-9 w-full rounded-2xl border border-gold-dim/30 bg-ink-soft px-6 py-6">
        <p className="text-xs tracking-wide text-ivory-dim">주문번호</p>
        <p className="font-display mt-2 text-xl font-semibold tracking-wider text-gold">
          {orderNumber}
        </p>
      </div>

      <p className="mt-8 text-[0.88rem] font-light leading-[2] text-ivory-dim">
        다음 단계에서 결제를 완료하면
        <br />
        월화의 개인 리추얼 준비가 시작됩니다.
      </p>

      <Link
        href="/"
        className="mt-10 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold-dim/40 text-[0.95rem] text-ivory transition-colors hover:border-gold/60"
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}
