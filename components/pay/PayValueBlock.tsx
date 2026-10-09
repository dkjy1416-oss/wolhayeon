/**
 * 결제 화면 — 가격만 보고 미리보기로 되돌아가는 이탈을 줄이기 위한 안내 (10/9 결제 이탈 분석).
 * 결제 화면을 연 손님 대부분이 결제창은 정상으로 떴는데 20초~1분 보고 나갔다.
 * → 결제하면 '무엇을' 받는지, 열어보기 전엔 환불된다는 것, 실제 구매자 후기를 가격 바로 곁에 둔다.
 * 문구는 사실만 (환불 기준은 lib/refund-policy.ts, 후기는 승인·공개 동의된 실제 후기만).
 */
import { PRODUCTS, type Product } from "@/lib/ritual-types";
import { REFUND_WINDOW_DAYS } from "@/lib/refund-policy";
import type { PublicReview } from "@/lib/reviews";

export function PayIncludes({ product }: { product: Product }) {
  const p = PRODUCTS[product];
  return (
    <div className="mt-7 rounded-2xl border border-gold-dim/30 bg-ink-soft/60 px-5 py-5">
      <p className="text-[0.7rem] tracking-[0.25em] text-gold/85">결제하면 바로 열리는 것</p>
      <p className="mt-1.5 text-[0.82rem] text-ivory-dim">미리보기에서 잠겨 있던 부분 전부 · {p.tagline}</p>
      <ul className="mt-3.5 flex flex-col gap-2">
        {p.includes.map((t) => (
          <li key={t} className="flex gap-2 text-[0.86rem] leading-[1.7] text-ivory">
            <span aria-hidden className="text-gold">✓</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-gold-dim/15 pt-3.5 text-[0.76rem] leading-[1.8] text-ivory-dim">
        결과를 열어보기 전이라면 결제일로부터 {REFUND_WINDOW_DAYS}일 안에 <b className="text-ivory">전액 환불</b>돼요.
        <br />
        상담원 없이 자동으로 처리돼요.
      </p>
    </div>
  );
}

export function PayReviews({ reviews }: { reviews: PublicReview[] }) {
  if (!reviews.length) return null;
  return (
    <div className="mt-8">
      <p className="text-center text-[0.7rem] tracking-[0.25em] text-gold/80">먼저 받아본 분들</p>
      <div className="mt-3 flex flex-col gap-2.5">
        {reviews.map((r) => (
          <figure key={r.id} className="rounded-xl border border-gold-dim/20 bg-ink-soft/50 px-4 py-3.5">
            <span aria-label={`별점 ${r.rating}점`} className="text-[0.72rem] text-gold">
              {"★".repeat(r.rating)}
            </span>
            <blockquote className="mt-1 line-clamp-4 whitespace-pre-wrap text-[0.82rem] font-light leading-[1.8] text-ivory">
              {r.body}
            </blockquote>
            <figcaption className="mt-1.5 text-[0.68rem] text-ivory-dim">
              {r.name} · {r.product} 구매 · {r.month}
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-2 text-center text-[0.66rem] text-ivory-dim/60">결제하신 분이 공개에 동의한 후기만 실어요</p>
    </div>
  );
}
