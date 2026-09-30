"use client";

import Link from "next/link";
import { BUNDLE_PRICE_KRW, BOOK_PRICE_KRW } from "@/lib/ritual-types";
import { STAGES, BOOK_ONLY_SHORT } from "@/lib/book/book-contents";

/** 미리보기 결제 버튼 아래 — 월화가 함께 건네는 책(패키지) 소개 */
export default function BookPackageCard({
  orderNumber,
  name,
  price,
  bundleHref,
  onBundleClick,
}: {
  orderNumber: string;
  name?: string | null;
  price: number;
  bundleHref: string;
  onBundleClick?: () => void;
}) {
  const save = price + BOOK_PRICE_KRW - BUNDLE_PRICE_KRW;
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
          + 표지·편지에 {name ? `${name}님의` : "당신의"} 이름, 지금의 판정과 날짜, 날짜가 적힌 7일·21일 기록장 (약 125쪽)
        </p>

        <ul className="mt-5 space-y-2 rounded-xl border border-gold-dim/20 bg-ink/60 px-4 py-4 text-[0.8rem] leading-[1.7]">
          <li className="flex justify-between gap-3 text-ivory-dim">
            <span>메시지 + 책 따로</span>
            <span className="line-through opacity-70">{(price + BOOK_PRICE_KRW).toLocaleString()}원</span>
          </li>
          <li className="flex justify-between gap-3 text-ivory">
            <span>지금 패키지로</span>
            <span className="font-display text-[1.05rem] font-semibold text-gold">
              {BUNDLE_PRICE_KRW.toLocaleString()}원
            </span>
          </li>
          <li className="border-t border-gold-dim/15 pt-2 text-[0.74rem] text-ivory-dim/80">
            메시지만 먼저 받으면, 연락이 온 뒤엔 책을 {BOOK_PRICE_KRW.toLocaleString()}원에 따로 받아야 해요.
            결제 후 1~3분이면 PDF로 도착하고 메일로도 보내드려요.
          </li>
        </ul>
        <Link
          href={bundleHref}
          onClick={onBundleClick}
          className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full border border-gold/45 bg-gold/10 text-[0.9rem] text-gold transition-opacity active:opacity-85"
        >
          책까지 함께 받기 · {BUNDLE_PRICE_KRW.toLocaleString()}원
        </Link>
        <Link
          href={`/book?order=${encodeURIComponent(orderNumber)}`}
          className="mt-3 block text-center text-[0.76rem] text-ivory-dim underline underline-offset-4"
        >
          책 차례와 실제 페이지 보기
        </Link>
        <p className="mt-4 text-center text-[0.68rem] leading-[1.7] text-ivory-dim/60">
          재회를 보장하지 않아요. 차단·안전 문제가 있는 사연엔 연락 문장 대신 거리를 지키는 방법을 담아요.
        </p>
      </div>
    </div>
  );
}
