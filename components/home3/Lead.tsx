/**
 * 11/27 운영자 요청 — 재회 분석 첫 화면 정리.
 * 꽉 찬 첫 화면(아래 버튼은 따라다니는 하단 버튼이 맡음) → 딱 3단계면 끝 → 후기 3줄(왼·오·왼으로 흐름) → 월계수.
 * 원칙: 결과·재회·연락을 장담하지 않는다. 후기는 실제 후기(DB 승인 + 운영자 저장 원문)만.
 */
import Link from "next/link";
import LoopVideo from "@/components/book/LoopVideo";
import InView from "@/components/fx/InView";
import SplitWords from "@/components/fx/SplitWords";
import { FIRST_OFFER_PRICE_KRW } from "@/lib/ritual-types";
import { SAVED_REVIEWS } from "@/lib/home/reviews-saved";
import { ReviewCard, maskName, type ReviewView } from "@/components/home4/ReviewCard";
import type { PublicReview } from "@/lib/reviews";

export function LeadHero() {
  return (
    <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden">
      <div className="absolute inset-0" aria-hidden>
        <LoopVideo src="/book/v3/check.mp4" poster="/book/v3/check.webp" className="h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#120e10]/30 via-[#120e10]/50 to-[#120e10]" />
        <div className="fx-aurora" />
      </div>
      {/* 아래쪽 여백 = 따라다니는 하단 버튼 자리 */}
      <div className="relative px-6 pb-[9.5rem] pt-28">
        <p className="fx-kicker text-[#e8b04a]">月下緣 · Reunion Reading</p>
        <h1 className="font-display mt-5 text-[2.2rem] font-black leading-[1.25] text-ivory">
          <SplitWords text="혹시 오늘도," />
          <br />
          <SplitWords text={"대화창을\n열었다 닫았나요?"} wordClassName="fx-shine" delayMs={280} />
        </h1>
        <InView className="reveal mt-5">
          <p className="text-[1rem] leading-[1.85] text-white/80">
            왜 헤어졌는지, 마지막 대화, 지금의 연락 상태.
            <br />
            두 사람의 사연을 월화가 끝까지 읽고
            <br />
            <b className="font-semibold text-[#ff8fab]">연락 기준과 보낼 문장</b>으로 정리해 드려요.
          </p>
        </InView>
        <p className="mt-5 text-[0.78rem] text-white/50">
          미리보기 무료 · 미리보기 후 24시간 첫 구매 {FIRST_OFFER_PRICE_KRW.toLocaleString()}원 · 정기결제 없음
        </p>
        <p aria-hidden className="mt-6 animate-bounce text-center text-[0.9rem] text-white/40">⌄</p>
      </div>
    </section>
  );
}

const STEPS: Array<[string, string]> = [
  ["사연 들려주기", "몇 가지 질문에 답하고 그 사람과의 이야기를 적어요. 5분 정도면 돼요."],
  ["무료 미리보기", "월화가 사연을 읽고 지금의 판단 일부를 먼저 보여 드려요. 여기까지 무료예요."],
  ["재회 분석 받기", "결제하면 연락 기준, 보낼 문장, 첫날·7일·21일 가이드까지 전체를 받아요."],
];

export function LeadSteps() {
  return (
    <section className="px-5 pt-4">
      <p className="fx-kicker text-[#e8b04a]">How it works</p>
      <SplitWords as="h2" className="font-display mt-3 block text-[1.6rem] font-bold text-ivory" text="딱 3단계면 끝" />
      <ol className="mt-4 flex flex-col gap-3">
        {STEPS.map(([t, d], i) => (
          <InView as="li" key={t} className="reveal fx-glass flex gap-3 rounded-2xl px-4 py-4" style={{ transitionDelay: `${i * 120}ms` }}>
            <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e46b8a] to-[#8a2442] text-[1rem] font-bold text-white">
              {i + 1}
            </span>
            <span className="min-w-0">
              <b className="block text-[0.98rem] text-ivory">{t}</b>
              <span className="mt-0.5 block text-[0.84rem] leading-[1.7] text-white/65">{d}</span>
            </span>
          </InView>
        ))}
      </ol>
    </section>
  );
}

/** 후기 3줄 — 1줄 왼쪽, 2줄 오른쪽, 3줄 왼쪽으로 계속 흐름 (손가락을 대면 잠깐 멈춤) */
export function LeadReviews({ reviews = [] }: { reviews?: PublicReview[] }) {
  const all: ReviewView[] = [
    ...reviews.map((r) => ({ key: `d${r.id}`, id: r.id + 100, name: r.name, stars: r.rating, body: r.body, product: r.product })),
    ...SAVED_REVIEWS.map((r) => ({ key: `s${r.id}`, id: r.id, name: maskName(r.id), stars: 5, body: r.body, product: r.product, age: r.age })),
  ];
  if (all.length < 6) return null;
  const rows = [0, 1, 2].map((k) => all.filter((_, i) => i % 3 === k));
  return (
    <section className="pt-16">
      <style>{`
        @keyframes lead-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes lead-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        .lead-row { display: flex; width: max-content; gap: 0.75rem; }
        .lead-row:hover, .lead-row:active { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .lead-row { animation: none !important; } }
      `}</style>
      <div className="px-5">
        <p className="fx-kicker text-[#e46b8a]">Reviews</p>
        <SplitWords as="h2" className="font-display mt-3 block text-[1.6rem] font-bold leading-[1.35] text-ivory" text="먼저 열어 본 분들의 이야기" />
      </div>
      <div className="mt-6 flex flex-col gap-3 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
        {rows.map((row, k) => (
          <div
            key={k}
            className="lead-row"
            style={{ animation: `${k === 1 ? "lead-right" : "lead-left"} ${row.length * 5.5}s linear infinite` }}
          >
            {[...row, ...row].map((r, i) => (
              <div key={`${r.key}-${i}`} className="w-[270px] shrink-0" aria-hidden={i >= row.length}>
                <ReviewCard r={r} clamp={3} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="px-5">
        <Link href="/reviews" className="mt-4 block rounded-xl border border-white/15 py-3 text-center text-[14px] font-bold text-ivory">
          후기 더보기 ›
        </Link>
      </div>
    </section>
  );
}
