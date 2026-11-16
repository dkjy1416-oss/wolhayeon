/**
 * 11/16 요청: 결제 화면에서 '함께 받으면' 패키지를 아래에 펼쳐서 보여 준다 (접지 않음).
 * - 메시지를 고른 손님: 월화 패키지(리추얼 + 내 사연 PDF 책)로 바꾸는 카드
 * - 패키지를 고른 손님: '책 없이 리추얼만' 작은 링크
 * 링크 방식 — 누르면 서버가 주문의 상품·금액을 다시 정한다(브라우저가 금액을 정하지 않음).
 * 가격은 모두 서버 계산값(productPrice)만 받는다. '따로 사면' 금액도 실제 두 상품 가격의 합.
 */
import Link from "next/link";
import { PRODUCTS, BOOK_PRICE_KRW, BUNDLE_REGULAR_PRICE_KRW } from "@/lib/ritual-types";

export default function BundleUpsell({
  orderNumber,
  current,
  messagePrice,
  bundlePrice,
  offerOn,
  extraQuery = "",
}: {
  orderNumber: string;
  current: "message" | "bundle";
  messagePrice: number;
  bundlePrice: number;
  offerOn: boolean;
  extraQuery?: string;
}) {
  const base = `/apply/complete?order=${encodeURIComponent(orderNumber)}`;
  if (current === "bundle") {
    return (
      <p className="mt-4 text-center">
        <Link
          href={`${base}&product=message&changed=1${extraQuery}`}
          scroll={false}
          className="text-[0.78rem] text-ivory-dim underline underline-offset-4"
        >
          책 없이 {PRODUCTS.message.name}만 받기 · {messagePrice.toLocaleString()}원
        </Link>
      </p>
    );
  }
  const separate = messagePrice + BOOK_PRICE_KRW;
  const extra = bundlePrice - messagePrice;
  return (
    <section className="mt-6">
      <p className="text-[0.8rem] font-semibold text-ivory-dim">함께 받으면 좋은 구성</p>
      <Link
        href={`${base}&product=bundle&changed=1${extraQuery}`}
        scroll={false}
        className="mt-2.5 block rounded-2xl border border-gold/45 bg-ink-soft px-5 py-4 shadow-paper active:opacity-90"
      >
        <div className="flex items-center gap-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/book/v2/cover-3d.webp" alt="" aria-hidden className="h-16 w-14 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[0.98rem] font-semibold text-ivory">
              {PRODUCTS.bundle.name}
              <span className="rounded-full bg-thread/15 px-2 py-0.5 text-[0.64rem] font-medium text-thread">월화 추천</span>
            </p>
            <p className="mt-0.5 text-[0.76rem] leading-[1.6] text-ivory-dim">
              지금 리추얼 + 내 사연으로 만든 PDF 책 약 120쪽
            </p>
          </div>
        </div>
        <ul className="mt-3 flex flex-col gap-1 text-[0.8rem] leading-[1.65] text-ivory">
          <li className="flex gap-2"><span aria-hidden className="text-gold">✓</span>흔들릴 때 다시 펼치는 문장 · 체크리스트</li>
          <li className="flex gap-2"><span aria-hidden className="text-gold">✓</span>7일/21일 기록장 · 60일 안에 내려받아 계속 보관</li>
        </ul>
        <div className="mt-3 flex items-end justify-between border-t border-gold-dim/20 pt-3">
          <span className="text-[0.74rem] text-ivory-dim">
            따로 사면 <span className="line-through">{separate.toLocaleString()}원</span>
            {offerOn && bundlePrice < BUNDLE_REGULAR_PRICE_KRW && (
              <span className="block text-thread">첫 구매 24시간 가격 · 이후 {BUNDLE_REGULAR_PRICE_KRW.toLocaleString()}원</span>
            )}
          </span>
          <span className="text-right">
            <span className="font-display text-[1.25rem] font-semibold text-burgundy">{bundlePrice.toLocaleString()}</span>
            <span className="ml-0.5 text-[0.82rem] text-ivory-dim">원</span>
            {extra > 0 && <span className="block text-[0.7rem] text-ivory-dim">지금보다 +{extra.toLocaleString()}원</span>}
          </span>
        </div>
        <p className="mt-3 flex h-11 items-center justify-center rounded-full border border-gold/50 text-[0.86rem] font-semibold text-gold">
          패키지로 바꾸기
        </p>
      </Link>
      <Link
        href={`/book?order=${encodeURIComponent(orderNumber)}`}
        className="mt-2 block text-center text-[0.72rem] text-ivory-dim underline underline-offset-4"
      >
        PDF 책 실제 페이지 넘겨 보기
      </Link>
    </section>
  );
}
