import Reveal from "@/components/home/Reveal";
import LoopVideo from "@/components/book/LoopVideo";
import TrackedCtaLink from "@/components/TrackedCtaLink";
import {
  BOOK_PRICE_KRW,
  BUNDLE_REGULAR_PRICE_KRW,
  PROMO_DEADLINE_TEXT,
  bundlePrice,
  RITUAL_PRICE_KRW,
  RITUAL_REGULAR_PRICE_KRW,
  isPromoActive,
} from "@/lib/ritual-types";

/**
 * 홈 중간 — 상품 한눈에 보기: 월화의 메시지 / 메시지+책 패키지 / 책만
 * 모든 결제는 사연(무료 미리보기)부터 시작. 책 상세는 /book.
 */
export default function ProductsSection() {
  const promo = isPromoActive();
  const msg = promo ? RITUAL_PRICE_KRW : RITUAL_REGULAR_PRICE_KRW;
  const separate = msg + BOOK_PRICE_KRW;
  const bundle = bundlePrice();
  const save = separate - bundle;

  return (
    <section id="products" className="scroll-mt-20 border-y border-gold-dim/10 bg-gradient-to-b from-ink-soft/60 to-ink px-5 py-16">
      <Reveal>
        <p className="text-center text-[0.7rem] tracking-[0.3em] text-gold/80">월하연에서 받을 수 있는 것</p>
        <h2 className="font-display mt-3 text-center text-[1.4rem] leading-[1.6] text-ivory">
          지금 읽어 주는 메시지,
          <br />
          <span className="text-gold">흔들릴 때 펼치는 책</span>
        </h2>
      </Reveal>

      <div className="mt-9 space-y-3">
        {/* 1. 메시지 */}
        <Reveal>
          <div className="rounded-2xl border border-gold-dim/35 bg-ink-soft/70 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.66rem] tracking-[0.2em] text-gold/80">지금 내 관계를 읽는</p>
                <p className="mt-1 text-[1rem] text-ivory">월화의 메시지</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-[1.4rem] font-semibold text-gold">
                  {msg.toLocaleString()}
                  <span className="ml-0.5 text-sm text-ivory-dim">원</span>
                </p>
                {promo && msg < RITUAL_REGULAR_PRICE_KRW && (
                  <p className="text-[0.7rem] text-ivory-dim/70 line-through">{RITUAL_REGULAR_PRICE_KRW.toLocaleString()}원</p>
                )}
              </div>
            </div>
            {promo && (
              <p className="mt-2 inline-block rounded-full bg-thread/15 px-2.5 py-0.5 text-[0.7rem] text-thread">
                재오픈 특가 {PROMO_DEADLINE_TEXT} · 이후 {RITUAL_REGULAR_PRICE_KRW.toLocaleString()}원
              </p>
            )}
            <p className="mt-2 text-[0.8rem] font-light leading-[1.85] text-ivory-dim">
              첫 편지 · 관계 읽기 · 연락 타이밍과 첫 메시지 예시 · 반응별 대응 · 24시간·7일·21일 가이드 · 리추얼. 결제 전 미리보기는 무료예요.
            </p>
            <TrackedCtaLink
              event="home_cta_click"
              placement="products_message"
              href="/apply"
              className="mt-4 flex h-11 items-center justify-center rounded-full border border-gold/45 text-[0.86rem] text-gold"
            >
              무료 미리보기부터 보기
            </TrackedCtaLink>
          </div>
        </Reveal>

        {/* 2. 패키지 */}
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-gold/55 bg-gradient-to-b from-[#1d1512] to-ink-soft shadow-[0_0_40px_rgba(226,196,138,0.08)]">
            <span aria-hidden className="bk-shine pointer-events-none absolute inset-0" />
            <div className="grid grid-cols-[38%_1fr]">
              <div className="relative">
                <LoopVideo
                  src="/book/v3/w-reading.mp4"
                  poster="/book/v3/w-reading.webp"
                  label="이야기를 읽는 월화"
                  fit="contain"
                  className="block h-full min-h-[13rem] w-full"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent to-[#1a1310]" />
              </div>
              <div className="relative px-4 py-5">
                <span className="rounded-full bg-gold px-2.5 py-0.5 text-[0.64rem] font-medium text-ink">월화의 추천</span>
                <p className="mt-2.5 text-[1rem] leading-[1.45] text-ivory">메시지 + 책 패키지</p>
                <p className="mt-1 text-[0.74rem] font-light leading-[1.7] text-ivory-dim">
                  지금을 읽는 메시지와, 기다리는 동안 곁에 둘 내 이름의 책
                </p>
                <p className="font-display mt-2 text-[1.45rem] font-semibold text-gold">
                  {bundle.toLocaleString()}
                  <span className="ml-0.5 text-sm text-ivory-dim">원</span>
                </p>
                {promo && (
                  <p className="text-[0.7rem] text-gold/90">
                    특가 {PROMO_DEADLINE_TEXT} · 이후 {BUNDLE_REGULAR_PRICE_KRW.toLocaleString()}원
                  </p>
                )}
                {save > 0 && (
                  <p className="text-[0.7rem] text-thread">
                    따로 사면 {separate.toLocaleString()}원 · {save.toLocaleString()}원 아껴요
                  </p>
                )}
              </div>
            </div>
            <div className="px-4 pb-4">
              <TrackedCtaLink
                event="home_cta_click"
                placement="products_bundle"
                href="/apply?want=bundle"
                className="flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.9rem] text-ivory"
              >
                패키지로 받기
              </TrackedCtaLink>
            </div>
          </div>
        </Reveal>

        {/* 3. 책 */}
        <Reveal>
          <div className="rounded-2xl border border-gold-dim/35 bg-ink-soft/70 px-5 py-5">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/book/v2/cover-3d.webp"
                alt="《헤어진 뒤, 연락하지 말아야 할 때》 책"
                loading="lazy"
                className="bk-float w-[5.2rem] shrink-0 drop-shadow-[0_14px_24px_rgba(0,0,0,0.7)]"
              />
              <div className="min-w-0">
                <p className="text-[0.66rem] tracking-[0.2em] text-gold/80">개인화 PDF 책 · 약 120쪽</p>
                <p className="font-display mt-1 text-[1.02rem] leading-[1.5] text-ivory">헤어진 뒤,<br />연락하지 말아야 할 때</p>
                <p className="font-display mt-1 text-[1.3rem] font-semibold text-gold">
                  {BOOK_PRICE_KRW.toLocaleString()}
                  <span className="ml-0.5 text-sm text-ivory-dim">원</span>
                </p>
              </div>
            </div>
            <p className="mt-3 text-[0.8rem] font-light leading-[1.85] text-ivory-dim">
              싸우고 끝났을 때, 매달린 뒤, 술 마신 새벽 — 10가지 상황별로 기다릴 기간과 보낼 문장, 보내면 안 되는 문장을 담았어요.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <TrackedCtaLink
                event="home_cta_click"
                placement="products_book_detail"
                href="/book"
                className="flex h-11 items-center justify-center rounded-full border border-gold/45 text-[0.84rem] text-gold"
              >
                책 자세히 보기 →
              </TrackedCtaLink>
              <TrackedCtaLink
                event="home_cta_click"
                placement="products_book"
                href="/apply?want=book"
                className="flex h-11 items-center justify-center rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.84rem] text-ivory"
              >
                책만 받기
              </TrackedCtaLink>
            </div>
          </div>
        </Reveal>
      </div>

      <p className="mt-5 text-center text-[0.72rem] font-light leading-[1.9] text-ivory-dim">
        모두 1회 결제 · 정기결제 없음 · 사연을 먼저 듣고 당신에게 맞춰 써요
      </p>
    </section>
  );
}
