/**
 * 책 소개 화면 — 기존 분석 구매자 추가 구매 혜택 (메일·후기 완료 화면 링크로 들어온 경우)
 * 자격·기한은 서버가 주문 DB로 확인한 결과(status)만 보여 준다.
 */
import Link from "next/link";
import {
  BOOK_PRICE_KRW,
  BOOK_UPGRADE_BASE_KRW,
  BOOK_UPGRADE_PRICE_KRW,
  BOOK_UPGRADE_SOURCE_KRW,
} from "@/lib/ritual-types";
import { UPGRADE_REASON_TEXT, upgradeDeadlineLabel, type UpgradeStatus } from "@/lib/book/upgrade-rules";

export function UpgradeBanner({ status, href }: { status: UpgradeStatus; href: string }) {
  if (!status.ok) {
    return (
      <div className="mx-5 mt-20 rounded-2xl border border-thread/40 bg-thread/10 px-5 py-4 text-center text-[0.8rem] leading-[1.85]">
        <p className="text-ivory">추가 구매 혜택을 적용할 수 없어요</p>
        <p className="text-ivory-dim">{UPGRADE_REASON_TEXT[status.reason]}</p>
        <p className="text-ivory-dim/80">아래 가격은 정상 가격이에요 (책 {BOOK_PRICE_KRW.toLocaleString()}원).</p>
      </div>
    );
  }
  return (
    <div className="mx-5 mt-20 rounded-2xl border border-gold/50 bg-gradient-to-b from-[#1d1512] to-ink-soft px-5 py-4 text-center">
      <p className="text-[0.72rem] tracking-[0.18em] text-gold/90">기존 분석 구매자 추가 구매 혜택</p>
      <p className="mt-1.5 text-[0.86rem] text-ivory">
        <span className="mr-1.5 text-ivory-dim line-through">{BOOK_PRICE_KRW.toLocaleString()}원</span>
        <span className="font-display text-[1.3rem] font-semibold text-gold">{BOOK_UPGRADE_PRICE_KRW.toLocaleString()}원</span>
      </p>
      <p className="mt-1 text-[0.72rem] text-ivory-dim">{upgradeDeadlineLabel(status.endsAt)}까지 · 1회 · 쿠폰 자동 적용</p>
      <Link
        href={href}
        className="mt-3 flex h-11 items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.86rem] text-ivory"
      >
        쿠폰 적용해서 책 받기
      </Link>
      <p className="mt-2 text-[0.7rem] text-ivory-dim/80">아래에서 책 구성과 실제 페이지를 먼저 볼 수 있어요</p>
    </div>
  );
}

export function UpgradeOffer({ endsAt, href }: { endsAt: number; href: string }) {
  return (
    <Link
      href={href}
      className="relative block rounded-2xl border border-gold/55 bg-gradient-to-b from-[#1d1512] to-ink-soft px-6 py-6"
    >
      <span className="absolute -top-3 left-6 rounded-full bg-gold px-3 py-0.5 text-[0.68rem] font-medium text-ink">
        기존 분석 구매자 혜택
      </span>
      <p className="text-[1.02rem] text-ivory">개인 맞춤 PDF 책</p>
      <p className="mt-1 text-[0.78rem] font-light leading-[1.7] text-ivory-dim">
        이미 받은 분석은 그대로 두고, 같은 사연으로 책만 만들어요. 사연을 다시 쓰지 않아요.
      </p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2">
        <p className="font-display text-[1.75rem] font-semibold text-gold">
          {BOOK_UPGRADE_PRICE_KRW.toLocaleString()}
          <span className="ml-1 text-base text-ivory-dim">원</span>
        </p>
        <p className="text-[0.78rem] text-ivory-dim/70 line-through">{BOOK_PRICE_KRW.toLocaleString()}원</p>
      </div>
      <p className="mt-1 text-[0.72rem] leading-[1.7] text-ivory-dim">
        패키지 기준가 {BOOK_UPGRADE_BASE_KRW.toLocaleString()}원 − 기존 분석 결제 {BOOK_UPGRADE_SOURCE_KRW.toLocaleString()}원 ·{" "}
        {upgradeDeadlineLabel(endsAt)}까지 · 1회
      </p>
      <span className="mt-4 flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.9rem] text-ivory">
        쿠폰 적용해서 책 받기
      </span>
      <p className="mt-3 text-center text-[0.72rem] leading-[1.8] text-ivory-dim">
        1회 결제 · 결제 후 보통 몇 분 안에 화면과 메일로 · PDF 60일 내려받기
      </p>
    </Link>
  );
}
