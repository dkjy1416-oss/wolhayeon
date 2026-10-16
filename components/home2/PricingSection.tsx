/** 09. 상품과 가격 — 중심 상품 하나(월화의 관계 리추얼), 책·패키지는 보조 영역 */
import Link from "next/link";
import TrackedCtaLink from "@/components/TrackedCtaLink";
import { PRODUCTS } from "@/lib/ritual-types";
import { CONTENT_VIEW_DAYS } from "@/lib/content-access-policy";
import { REFUND_WINDOW_DAYS } from "@/lib/refund-policy";
import { PRICE } from "./content";

export default function PricingSection() {
  const p = PRODUCTS.message;
  return (
    <section id="price" className="scroll-mt-16 px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1120px]">
        <p className="text-[0.8rem] tracking-[0.14em] text-gold">상품과 가격</p>
        <h2 className="font-display font-bold mt-2 text-[1.55rem] leading-[1.45] text-ivory md:text-[2rem]">미리보기는 무료, 전체 구성은 1회 구매</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-[1.25fr_0.75fr]">
          <div className="shadow-paper rounded-[24px] border-2 border-burgundy bg-ink-soft px-6 py-7 md:px-9">
            <p className="text-[0.78rem] font-semibold tracking-[0.1em] text-burgundy">첫 구매 추천</p>
            <h3 className="font-display font-bold mt-1 text-[1.5rem] text-ivory">{p.name}</h3>
            <p className="mt-1 text-[0.9rem] text-ivory-dim">{p.tagline}</p>
            <ul className="mt-5 flex flex-col gap-2.5">
              {p.includes.map((x) => (
                <li key={x} className="flex gap-2.5 text-[0.96rem] leading-[1.6] text-ivory">
                  <span aria-hidden className="mt-0.5 text-burgundy">✓</span>
                  <span className="min-w-0">{x}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-gold-dim pt-5">
              <div>
                <p className="text-[0.84rem] text-ivory-dim">
                  정가 {PRICE.regular.toLocaleString()}원 · 미리보기 후 24시간 안에 첫 구매하면
                </p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="font-display font-bold text-[2rem] text-burgundy">{PRICE.first.toLocaleString()}원</span>
                  <span className="rounded-full bg-[#f1e6e9] px-2.5 py-0.5 text-[0.78rem] font-semibold text-burgundy">{PRICE.save.toLocaleString()}원 할인</span>
                </p>
              </div>
              <TrackedCtaLink
                event="home_cta_click"
                placement="price"
                href="/apply"
                className="inline-flex h-13 min-h-[3.25rem] items-center justify-center rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep px-6 text-[0.96rem] font-semibold"
              >
                무료 미리보기부터 받기
              </TrackedCtaLink>
            </div>
            <p className="mt-4 text-[0.82rem] leading-[1.7] text-ivory-dim">
              1회 결제 · 정기결제 없음 · 결제 후 보통 1~3분 · {CONTENT_VIEW_DAYS}일 열람 · 열어보기 전이면 {REFUND_WINDOW_DAYS}일 안에 전액 환불
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-gold-dim bg-ink-soft px-5 py-5">
              <p className="text-[0.78rem] text-ivory-dim">더 오래 곁에 두고 싶다면</p>
              <p className="font-display mt-1 text-[1.12rem] text-ivory">개인 맞춤 PDF 책</p>
              <p className="mt-1 text-[0.88rem] leading-[1.65] text-ivory-dim">흔들릴 때마다 다시 펼치는 상황별 문장·체크리스트·7일/21일 기록장 · 약 120쪽 · 60일 안에 내려받기</p>
              <p className="mt-2 text-[0.95rem] font-semibold text-ivory">{PRICE.book.toLocaleString()}원</p>
            </div>
            <div className="rounded-2xl border border-gold-dim bg-ink-soft px-5 py-5">
              <p className="font-display text-[1.12rem] text-ivory">관계 리추얼 + 책 패키지</p>
              <p className="mt-1 text-[0.88rem] leading-[1.65] text-ivory-dim">
                미리보기 후 24시간 {PRICE.bundleFirst.toLocaleString()}원 · 이후 {PRICE.bundleRegular.toLocaleString()}원
              </p>
              <Link href="/book" className="mt-2 inline-block text-[0.88rem] text-burgundy underline underline-offset-4">
                책 실제 페이지 보기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
