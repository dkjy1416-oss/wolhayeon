import Link from "next/link";
import {
  PRODUCTS,
  BOOK_PRICE_KRW,
  BUNDLE_PRICE_KRW,
  RITUAL_REGULAR_PRICE_KRW,
  type Product,
} from "@/lib/ritual-types";

/**
 * 결제 전 상품 선택 (메시지 / 개인화 책 / 패키지).
 * 링크 방식 — 선택하면 서버가 주문의 상품·금액을 다시 정한다(브라우저가 금액을 정하지 않음).
 */
export default function ProductPicker({
  orderNumber,
  selected,
  messagePrice,
  basePath = "/apply/complete",
  extraQuery = "",
}: {
  orderNumber: string;
  selected: Product;
  messagePrice: number;
  basePath?: string;
  extraQuery?: string;
}) {
  const items: Array<{ key: Product; price: number; note?: string; badge?: string }> = [
    {
      key: "bundle",
      price: BUNDLE_PRICE_KRW,
      badge: "가장 많이 골라요",
      note:
        messagePrice + BOOK_PRICE_KRW > BUNDLE_PRICE_KRW
          ? `따로 사면 ${(messagePrice + BOOK_PRICE_KRW).toLocaleString()}원`
          : undefined,
    },
    {
      key: "message",
      price: messagePrice,
      note:
        messagePrice < RITUAL_REGULAR_PRICE_KRW
          ? `정가 ${RITUAL_REGULAR_PRICE_KRW.toLocaleString()}원`
          : undefined,
    },
    { key: "book", price: BOOK_PRICE_KRW },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it) => {
        const p = PRODUCTS[it.key];
        const on = it.key === selected;
        return (
          <Link
            key={it.key}
            href={`${basePath}?order=${encodeURIComponent(orderNumber)}&product=${it.key}${extraQuery}`}
            scroll={false}
            className={`block rounded-2xl border px-5 py-4 text-left transition-colors ${
              on
                ? "border-gold/70 bg-gradient-to-b from-[#1d1512] to-ink-soft"
                : "border-gold-dim/25 bg-ink-soft/70"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      on ? "border-gold" : "border-ivory-dim/50"
                    }`}
                  >
                    {on && <span className="h-2 w-2 rounded-full bg-gold" />}
                  </span>
                  <span className="text-[0.95rem] font-medium text-ivory">{p.name}</span>
                  {it.badge && (
                    <span className="rounded-full bg-thread/15 px-2 py-0.5 text-[0.65rem] text-thread">
                      {it.badge}
                    </span>
                  )}
                </div>
                <p className="mt-1 pl-6 text-[0.76rem] font-light text-ivory-dim">{p.tagline}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-[1.05rem] font-semibold text-gold">
                  {it.price.toLocaleString()}원
                </p>
                {it.note && (
                  <p className="mt-0.5 text-[0.66rem] text-ivory-dim/70 line-through decoration-ivory-dim/40">
                    {it.note}
                  </p>
                )}
              </div>
            </div>
            {on && (
              <ul className="mt-3 flex flex-col gap-1 pl-6">
                {p.includes.map((x) => (
                  <li key={x} className="text-[0.76rem] font-light leading-[1.7] text-ivory-dim">
                    · {x}
                  </li>
                ))}
              </ul>
            )}
          </Link>
        );
      })}
    </div>
  );
}
