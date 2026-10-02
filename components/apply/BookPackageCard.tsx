"use client";

import Link from "next/link";
import {
  BOOK_PRICE_KRW,
  BUNDLE_REGULAR_PRICE_KRW,
  PROMO_DEADLINE_TEXT,
  bundlePrice,
  isPromoActive,
} from "@/lib/ritual-types";
import { STAGES, BOOK_ONLY_SHORT } from "@/lib/book/book-contents";

/** 미리보기 결제 버튼 아래 — 월화가 함께 건네는 책(패키지) 소개 */
export default function BookPackageCard({
  orderNumber,
  name,
  price,
  bundleHref,
  bookHref,
  onBundleClick,
}: {
  orderNumber: string;
  name?: string | null;
  price: number;
  bundleHref: string;
  /** 책만 결제 (주문·사연 그대로 이어서) */
  bookHref?: string;
  onBundleClick?: () => void;
}) {
  const bundle = bundlePrice();
  const save = price + BOOK_PRICE_KRW - bundle;
  return (
    <div className="mx-auto mt-14 max-w-md overflow-hidden rounded-2xl border border-gold-dim/30 bg-gradient-to-b from-[#1a1210] to-ink text-left">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/book/wolhwa-show.webp"
          alt="월화가 책 《헤어진 뒤, 연락하지 말아야 할 때》를 건네는 모습"
          loading="lazy"
          className="block aspect-[4/4.2] w-full object-cover object-top"
        />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#1a1210] to-transparent" />
      </div>
      <div className="px-6 pb-7 pt-1">
        {/* 미리보기 vs 책 — 오늘 밤 바로 쓸 수 있는 것 */}
        <p className="text-[0.7rem] tracking-[0.25em] text-thread">오늘 밤부터 바로 펼치는 책</p>
        <p className="font-display mt-2 text-[1.22rem] leading-[1.6] text-ivory">
          미리보기는 &lsquo;방향&rsquo;까지예요.
          <br />
          <span className="text-gold">오늘 밤 바로 쓸 날짜와 문장은 책에 있어요.</span>
        </p>
        <ul className="mt-4 space-y-2.5 rounded-xl border border-gold/30 bg-gold/5 px-4 py-4">
          {[
            ["기다릴 날짜", `${name ? `${name}님` : "당신"}의 상황 장에 ‘몇 월 며칠까지’가 적혀 있어요`],
            ["보내기 직전 체크", "지금 쓰고 있는 메시지를 그 자리에서 점검하는 체크리스트"],
            ["대신 보낼 문장", "보내면 안 되는 7가지와, 그 자리에 보낼 한 줄"],
            ["연락이 왔을 때", "‘보고 싶다’ · 술 마시고 온 연락 · ‘친구로 지내자’에 답하는 문장"],
            ["오늘부터 7일 · 21일", "결제한 날부터 날짜가 적힌 하루 한 장 기록장"],
          ].map(([t, d]) => (
            <li key={t} className="flex gap-2.5">
              <span aria-hidden className="mt-[0.2rem] text-[0.8rem] text-gold">✓</span>
              <span>
                <span className="block text-[0.88rem] text-ivory">{t}</span>
                <span className="block text-[0.76rem] font-light leading-[1.7] text-ivory-dim">{d}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {["p03", "p06", "p08"].map((pg) => (
            <Link key={pg} href={`/book?order=${encodeURIComponent(orderNumber)}`} className="block overflow-hidden rounded-md border border-gold-dim/25 bg-[#f5efe3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/book/pages/${pg}.webp`} alt="실제 책 페이지" loading="lazy" className="block aspect-[1/1.41] w-full object-cover object-top" />
            </Link>
          ))}
        </div>
        <p className="mt-1.5 text-center text-[0.68rem] text-ivory-dim/70">실제 책 페이지 · 눌러서 더 보기</p>

        {save > 0 && (
          <span className="inline-block rounded-full bg-thread/15 px-3 py-1 text-[0.7rem] text-thread">
            지금 함께 받으면 {save.toLocaleString()}원 아껴요
          </span>
        )}
        <p className="font-display mt-3 text-[1.15rem] font-semibold leading-[1.6] text-ivory">
          《헤어진 뒤,
          <br />
          연락하지 말아야 할 때》
        </p>
        <p className="mt-3 text-[0.84rem] font-light leading-[1.95] text-ivory-dim">
          메시지는 <span className="text-ivory">재회 전, 지금 무엇을 할지</span>를 알려줘요.
          책은 그다음 — <span className="text-ivory">상대에게서 연락이 오는 순간과 다시 만나기 시작할 때</span>
          해야 할 행동까지 담았어요.
        </p>

        {/* 단계 비교 */}
        <div className="mt-5 overflow-hidden rounded-xl border border-gold-dim/20 text-[0.76rem]">
          <div className="grid grid-cols-[1fr_3.4rem_3.4rem] bg-ink-soft/80 px-3 py-2 text-ivory-dim">
            <span>다루는 단계</span>
            <span className="text-center">메시지</span>
            <span className="text-center text-gold">책</span>
          </div>
          {STAGES.map((s) => (
            <div
              key={s.step}
              className="grid grid-cols-[1fr_3.4rem_3.4rem] items-center border-t border-gold-dim/10 px-3 py-2.5"
            >
              <span>
                <span className="block text-[0.68rem] text-gold/75">{s.step}</span>
                <span className="text-ivory">{s.title}</span>
              </span>
              <span className="text-center text-ivory-dim">{s.message ? "○" : "—"}</span>
              <span className="text-center text-gold">●</span>
            </div>
          ))}
        </div>

        {/* 책에만 있는 것 */}
        <p className="mt-6 text-[0.72rem] tracking-[0.2em] text-gold/85">책에만 있는 것</p>
        <ul className="mt-3 space-y-3">
          {BOOK_ONLY_SHORT.map((b) => (
            <li key={b.title} className="flex gap-2.5">
              <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-thread" />
              <span>
                <span className="block text-[0.86rem] text-ivory">{b.title}</span>
                <span className="block text-[0.76rem] font-light leading-[1.75] text-ivory-dim">{b.body}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[0.76rem] font-light leading-[1.8] text-ivory-dim">
          + 표지·편지에 {name ? `${name}님의` : "당신의"} 이름, 지금의 판정과 날짜, 날짜가 적힌 7일·21일 기록장 (약 120쪽)
        </p>

        <ul className="mt-5 space-y-2 rounded-xl border border-gold-dim/20 bg-ink/60 px-4 py-4 text-[0.8rem] leading-[1.7]">
          <li className="flex justify-between gap-3 text-ivory-dim">
            <span>메시지 + 책 따로</span>
            <span className="line-through opacity-70">{(price + BOOK_PRICE_KRW).toLocaleString()}원</span>
          </li>
          <li className="flex justify-between gap-3 text-ivory">
            <span>지금 패키지로</span>
            <span className="font-display text-[1.05rem] font-semibold text-gold">
              {bundle.toLocaleString()}원
            </span>
          </li>
          {isPromoActive() && (
            <li className="text-right text-[0.72rem] text-thread">
              패키지 특가 {PROMO_DEADLINE_TEXT} · 이후 {BUNDLE_REGULAR_PRICE_KRW.toLocaleString()}원
            </li>
          )}
          <li className="border-t border-gold-dim/15 pt-2 text-[0.74rem] text-ivory-dim/80">
            메시지만 먼저 받으면, 연락이 온 뒤엔 책을 {BOOK_PRICE_KRW.toLocaleString()}원에 따로 받아야 해요.
            결제 후 1~3분이면 PDF로 도착하고 메일로도 보내드려요.
          </li>
        </ul>
        <Link
          href={bundleHref}
          onClick={onBundleClick}
          className="cta-glow mt-5 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85"
        >
          메시지 + 책 함께 받기 · {bundle.toLocaleString()}원
        </Link>
        {bookHref && (
          <Link
            href={bookHref}
            onClick={onBundleClick}
            className="mt-2.5 inline-flex h-12 w-full items-center justify-center rounded-full border border-gold-dim/40 text-[0.88rem] text-ivory"
          >
            책만 받기 · {BOOK_PRICE_KRW.toLocaleString()}원
          </Link>
        )}
        <Link
          href={`/book?order=${encodeURIComponent(orderNumber)}`}
          className="mt-3 flex h-11 w-full items-center justify-center rounded-full text-[0.84rem] text-gold underline decoration-gold/30 underline-offset-[6px]"
        >
          책 자세히 보기 · 차례와 실제 페이지 →
        </Link>
        <p className="text-center text-[0.68rem] text-ivory-dim/70">
          책 페이지에서 결제해도 지금 쓴 사연 그대로 이어져요
        </p>
        <p className="mt-4 text-center text-[0.68rem] leading-[1.7] text-ivory-dim/60">
          재회를 보장하지 않아요. 차단·안전 문제가 있는 사연엔 연락 문장 대신 거리를 지키는 방법을 담아요.
        </p>
      </div>
    </div>
  );
}
