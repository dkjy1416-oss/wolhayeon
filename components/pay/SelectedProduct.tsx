/**
 * 결제 전 화면 — 이미 고른 상품 중심 (10/12 개발지시서 6).
 * 선택한 상품 → 핵심 3가지 → 최종 결제 금액 → 제공 시간·열람 기간. 카드 위치는 고정, 내용만 바뀐다.
 * 금액은 서버가 정한 주문 금액(row.payment_amount)만 표시 — 토스 요청 금액과 같은 값.
 */
import Link from "next/link";
import { PRODUCTS, type Product } from "@/lib/ritual-types";
import { CONTENT_VIEW_DAYS } from "@/lib/content-access-policy";
import { DELIVERY_TIME_TEXT, DELIVERY_DELAY_TEXT } from "@/lib/service-facts";
import OfferCountdown from "@/components/pay/OfferCountdown";

const CORE: Record<"message" | "bundle", string[]> = {
  message: [
    "현재 관계 상태 · 상대 반응 해석 · 지금 연락 여부",
    "연락을 고려할 조건 · 첫 메시지 초안 · 반가운 답/단답/무응답별 대응",
    "24시간 · 7일 · 21일 행동 플랜",
  ],
  bundle: [
    "내 관계 전체 분석 전부 (웹 화면 · 30일 열람)",
    "내 사연으로 만든 PDF 책 약 120쪽 — 여러 상황에서 다시 펼치는 문장 · 체크리스트",
    "7일/21일 기록장 · 60일 안에 내려받아 계속 보관",
  ],
};

export default function SelectedProduct({
  product,
  amount,
  strike,
  badgeLabel,
  offerEnd,
  after,
  changed,
}: {
  product: "message" | "bundle";
  amount: number;
  strike: number | null;
  badgeLabel: string | null;
  offerEnd: number | null;
  after: number;
  changed: boolean;
}) {
  const p = PRODUCTS[product];
  return (
    <section className="mt-8">
      {changed && (
        <p className="mb-3 rounded-xl border border-gold/45 bg-gold/10 px-4 py-2.5 text-center text-[0.8rem] leading-[1.7] text-gold" role="status">
          선택한 상품이 ‘{p.name}’(으)로 바뀌었어요 · 결제 금액도 함께 바뀌었어요
        </p>
      )}
      <p className="text-center text-[0.72rem] tracking-[0.25em] text-gold/80">선택한 상품</p>
      <div className="mt-2.5 rounded-2xl border border-gold/60 bg-gradient-to-b from-[#1d1512] to-ink-soft px-5 py-5">
        <p className="text-[1.02rem] font-semibold text-ivory">{p.name}</p>
        <p className="mt-0.5 text-[0.78rem] font-light text-ivory-dim">{p.tagline}</p>
        <ul className="mt-3 flex flex-col gap-1.5">
          {CORE[product].map((x) => (
            <li key={x} className="flex gap-2 text-[0.84rem] leading-[1.7] text-ivory">
              <span aria-hidden className="text-gold">✓</span>
              <span className="min-w-0">{x}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-end justify-between border-t border-gold-dim/20 pt-3.5">
          <span className="text-[0.8rem] text-ivory-dim">최종 결제 금액</span>
          <span className="text-right">
            {strike !== null && strike > amount && (
              <span className="mr-2 text-[0.78rem] text-ivory-dim/70 line-through">{strike.toLocaleString()}원</span>
            )}
            <span className="font-display text-[1.6rem] font-semibold text-gold">{amount.toLocaleString()}</span>
            <span className="ml-0.5 text-[0.9rem] text-ivory-dim">원</span>
            {badgeLabel && <span className="block text-[0.7rem] text-thread">{badgeLabel}</span>}
          </span>
        </div>
        {offerEnd && <OfferCountdown endsAt={offerEnd} after={after} className="mt-1.5 text-right" />}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2 text-center text-[0.74rem] leading-[1.5] text-ivory">
        <li className="rounded-xl border border-gold-dim/20 bg-ink/50 px-2 py-2.5">결과 제공<span className="block text-ivory-dim">결제 후 {DELIVERY_TIME_TEXT}</span></li>
        <li className="rounded-xl border border-gold-dim/20 bg-ink/50 px-2 py-2.5">
          {CONTENT_VIEW_DAYS}일 동안 열람
          <span className="block text-ivory-dim">{product === "bundle" ? "PDF는 60일 안에 내려받기" : "메일로도 링크 발송"}</span>
        </li>
      </ul>
      <p className="mt-2 text-center text-[0.7rem] leading-[1.7] text-ivory-dim/80">
        1회 결제 · 정기결제 없음 · AI가 사연을 바탕으로 작성하는 디지털 콘텐츠 · {DELIVERY_DELAY_TEXT}
      </p>
    </section>
  );
}

/** 보조 옵션 — 접힌 상태로만 (고객 선택을 바꾸지 않음, 누를 때만 상품 변경) */
export function OtherProductOption({
  orderNumber,
  current,
  otherPrice,
  extraQuery = "",
}: {
  orderNumber: string;
  current: "message" | "bundle";
  otherPrice: number;
  extraQuery?: string;
}) {
  const other = current === "message" ? "bundle" : "message";
  const href = `/apply/complete?order=${encodeURIComponent(orderNumber)}&product=${other}&changed=1${extraQuery}`;
  return (
    <details className="group mt-6 rounded-2xl border border-gold-dim/25 bg-ink-soft/70">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5">
        <span className="text-[0.86rem] text-ivory">
          {current === "message" ? "PDF 책도 함께 받고 싶다면" : "분석만 받고 싶다면"}
        </span>
        <span aria-hidden className="text-ivory-dim transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="border-t border-gold-dim/15 px-5 pb-4 pt-3">
        <p className="text-[0.8rem] leading-[1.8] text-ivory-dim">
          {current === "message"
            ? "월화 패키지 = 내 관계 전체 분석 + 내 사연으로 만든 PDF 책. 분석은 지금 사연에 대한 판단과 다음 행동, 책은 흔들릴 때마다 다시 펼치는 문장·체크리스트·기록 도구예요. 연락 시점·문장 이야기는 일부 겹쳐요."
            : "내 관계 전체 분석만 받으면 PDF 책은 빠지고, 지금 사연에 대한 판단과 다음 행동을 웹 화면으로 받아요."}
        </p>
        <Link
          href={href}
          scroll={false}
          className="mt-3 flex h-11 items-center justify-center rounded-full border border-gold/45 text-[0.86rem] font-medium text-gold active:opacity-80"
        >
          {PRODUCTS[other].name}로 바꾸기 · {otherPrice.toLocaleString()}원
        </Link>
        {current === "message" && (
          <Link
            href={`/book?order=${encodeURIComponent(orderNumber)}`}
            className="mt-2 block text-center text-[0.72rem] text-ivory-dim underline underline-offset-4"
          >
            PDF 책 실제 페이지 넘겨 보기
          </Link>
        )}
      </div>
    </details>
  );
}
