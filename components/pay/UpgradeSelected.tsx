/**
 * 책 추가 구매 결제 화면 (기존 분석 구매자 · 27,000원).
 * 금액은 서버가 정한 주문 금액만 표시 — 토스 요청·서버 승인 금액과 같은 값.
 * 자격이 맞지 않으면 이유를 보여 주고, 정상 가격으로 조용히 바꾸지 않는다.
 */
import Link from "next/link";
import {
  BOOK_PRICE_KRW,
  BOOK_UPGRADE_BASE_KRW,
  BOOK_UPGRADE_SOURCE_KRW,
} from "@/lib/ritual-types";
import { upgradeDeadlineLabel } from "@/lib/book/upgrade-rules";

const CORE = [
  "《헤어진 뒤, 연락하지 말아야 할 때》 내 이름 판본 · 약 120쪽",
  "연락이 왔을 때·다시 만나기 전까지 상황별로 다시 펼치는 문장과 체크리스트",
  "날짜가 적힌 7일·21일 기록장",
];

export const BOOK_DELIVERY_TEXT = "보통 몇 분 안에";

export default function UpgradeSelected({ amount, endsAt }: { amount: number; endsAt: number }) {
  return (
    <section className="mt-8">
      <p className="text-center text-[0.72rem] tracking-[0.25em] text-gold/80">선택한 상품</p>
      <div className="mt-2.5 shadow-paper rounded-2xl border-2 border-burgundy bg-ink-soft px-5 py-5">
        <span className="inline-block rounded-full border border-thread/50 px-2 py-0.5 text-[0.66rem] text-thread">
          기존 분석 구매자 추가 구매 혜택
        </span>
        <p className="mt-2 text-[1.02rem] font-semibold text-ivory">개인 맞춤 PDF 책</p>
        <ul className="mt-3 flex flex-col gap-1.5">
          {CORE.map((x) => (
            <li key={x} className="flex gap-2 text-[0.84rem] leading-[1.7] text-ivory">
              <span aria-hidden className="text-gold">✓</span>
              <span className="min-w-0">{x}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[0.76rem] leading-[1.7] text-ivory-dim">
          이미 받은 분석은 다시 만들지 않아요. 처음 들려주신 사연 그대로 책만 만들어요.
        </p>

        <div className="mt-4 rounded-xl border border-gold-dim/25 bg-ink/50 px-4 py-3 text-[0.78rem] leading-[1.8]">
          <p className="text-gold">적용된 쿠폰</p>
          <p className="text-ivory">분석 구매자 책 추가 구매 쿠폰 · 1회</p>
          <p className="text-ivory-dim">
            패키지 기준가 {BOOK_UPGRADE_BASE_KRW.toLocaleString()}원 − 기존 분석 결제 {BOOK_UPGRADE_SOURCE_KRW.toLocaleString()}원
          </p>
          <p className="text-ivory-dim">사용 기한 {upgradeDeadlineLabel(endsAt)}까지</p>
        </div>

        <div className="mt-4 flex items-end justify-between border-t border-gold-dim/20 pt-3.5">
          <span className="text-[0.8rem] text-ivory-dim">최종 결제 금액</span>
          <span className="text-right">
            <span className="mr-2 text-[0.78rem] text-ivory-dim/70 line-through">{BOOK_PRICE_KRW.toLocaleString()}원</span>
            <span className="font-display text-[1.6rem] font-semibold text-burgundy">{amount.toLocaleString()}</span>
            <span className="ml-0.5 text-[0.9rem] text-ivory-dim">원</span>
          </span>
        </div>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2 text-center text-[0.74rem] leading-[1.5] text-ivory">
        <li className="rounded-xl border border-gold-dim/20 bg-ink/50 px-2 py-2.5">
          책 제공<span className="block text-ivory-dim">결제 후 {BOOK_DELIVERY_TEXT} · 화면과 메일</span>
        </li>
        <li className="rounded-xl border border-gold-dim/20 bg-ink/50 px-2 py-2.5">
          PDF 내려받기<span className="block text-ivory-dim">결제일로부터 60일</span>
        </li>
      </ul>
      <p className="mt-2 text-center text-[0.7rem] leading-[1.7] text-ivory-dim/80">
        1회 결제 · 정기결제 없음 · 결제를 취소하면 쿠폰은 그대로 남아요
      </p>
    </section>
  );
}

/** 자격 불일치·만료·사용 완료 — 이유를 보여 주고 정상가는 고객이 직접 고르게 */
export function UpgradeUnavailable({ reason }: { reason: string }) {
  return (
    <section className="mt-9 rounded-2xl border border-thread/40 bg-thread/5 px-6 py-7 text-center">
      <p className="text-[0.95rem] leading-[1.9] text-ivory">추가 구매 혜택을 적용할 수 없어요</p>
      <p className="mt-2 text-[0.84rem] font-light leading-[1.9] text-ivory-dim">{reason}</p>
      <p className="mt-2 text-[0.78rem] font-light leading-[1.9] text-ivory-dim/80">
        이 주문으로는 결제가 진행되지 않아요. 정상 가격({BOOK_PRICE_KRW.toLocaleString()}원)으로 받으시려면 책 소개 화면에서 다시 골라 주세요.
      </p>
      <Link
        href="/book"
        className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full border border-gold/45 text-[0.88rem] text-gold"
      >
        책 소개 보기
      </Link>
    </section>
  );
}
