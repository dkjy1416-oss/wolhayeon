"use client";

/**
 * 선택형 후기 (10/12 운영자 요청)
 * 질문 2개를 고르면 고른 내용만으로 후기 문장이 만들어지고, 고객이 확인·수정한 뒤 등록한다.
 * 공개 동의·쿠폰 메일 수신은 따로 묻고 기본 선택하지 않는다.
 * 쿠폰은 별점·내용과 관계없이 드리고, 공개 후기에는 혜택을 받고 쓴 후기임을 표시한다.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  HELPED_OPTIONS,
  IMPRESSION_OPTIONS,
  EXCLUSIVE_HELPED,
  CONFLICT_IMPRESSION,
  buildReviewSentence,
  type HelpedId,
  type ImpressionId,
} from "@/lib/review-choices";
import { BOOK_PRICE_KRW, BOOK_UPGRADE_PRICE_KRW } from "@/lib/ritual-types";
import { upgradeDeadlineLabel } from "@/lib/book/upgrade-rules";

const STARS = [1, 2, 3, 4, 5];

type Coupon = { bookUrl: string; payUrl: string; endsAt: number; mailed: boolean };

function Chip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-[0.84rem] transition-colors ${
        on ? "border-gold bg-gold/15 text-gold" : "border-gold-dim/30 text-ivory-dim"
      }`}
    >
      {on ? "✓ " : ""}
      {label}
    </button>
  );
}

export default function ReviewForm({
  o,
  t,
  initial,
  couponOffer = false,
}: {
  o: string;
  t: string;
  initial: { rating: number; body: string; name: string; consent: boolean; helped?: string[]; impressions?: string[] } | null;
  couponOffer?: boolean;
}) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [helped, setHelped] = useState<HelpedId[]>((initial?.helped ?? []) as HelpedId[]);
  const [impressions, setImpressions] = useState<ImpressionId[]>((initial?.impressions ?? []) as ImpressionId[]);
  const [body, setBody] = useState(initial?.body ?? "");
  const [edited, setEdited] = useState(Boolean(initial?.body));
  const [name, setName] = useState(initial?.name ?? "");
  /* 공개 동의는 기본 선택하지 않음 */
  const [consent, setConsent] = useState(initial?.consent ?? false);
  const [mailCoupon, setMailCoupon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const generated = buildReviewSentence(helped, impressions);
  /* 직접 고치기 전까지는 고른 내용이 바뀔 때마다 문장을 다시 만든다 */
  useEffect(() => {
    if (!edited) setBody(generated);
  }, [generated, edited]);

  const toggleHelped = (id: HelpedId) =>
    setHelped((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (id === EXCLUSIVE_HELPED) return [id];
      return [...cur.filter((x) => x !== EXCLUSIVE_HELPED), id];
    });
  const toggleImpression = (id: ImpressionId) =>
    setImpressions((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      const clash = CONFLICT_IMPRESSION.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : []));
      return [...cur.filter((x) => !clash.includes(x)), id];
    });

  const len = body.trim().length;
  const ready = rating > 0 && len >= 10 && len <= 600;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ o, t, rating, body, name, consent, helped, impressions, mailCoupon: couponOffer && mailCoupon }),
      });
      const j = await res.json().catch(() => null);
      if (j?.ok) {
        setCoupon(j.coupon ?? null);
        setDone(true);
      } else if (j?.error === "already_reviewed") setErr("이미 남겨 주신 후기가 있어요. 고마워요.");
      else if (j?.error === "invalid_link") setErr("링크가 만료되었어요. 받은 메일의 링크로 다시 들어와 주세요.");
      else if (j?.error === "body_length") setErr("후기는 10자 이상 600자 이하로 적어 주세요.");
      else setErr("저장하지 못했어요. 잠시 후 다시 눌러 주세요.");
    } catch {
      setErr("저장하지 못했어요. 잠시 후 다시 눌러 주세요.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="fade-in space-y-5">
        <div className="rounded-2xl border border-gold-dim/30 bg-ink-soft/60 px-6 py-8 text-center">
          <p className="font-display text-[1.1rem] text-ivory">고마워요. 잘 받았어요.</p>
          <p className="mt-3 text-[0.84rem] font-light leading-[1.95] text-ivory-dim">
            남겨 주신 이야기는 월화가 꼭 읽을게요.
            {consent ? (
              <>
                <br />
                공개에 동의해 주신 후기는 확인 후 월하연 페이지에 실릴 수 있어요.
              </>
            ) : null}
          </p>
        </div>
        {coupon && (
          <div className="rounded-2xl border border-gold/50 bg-gradient-to-b from-[#1d1512] to-ink-soft px-6 py-6 text-center">
            <p className="text-[0.72rem] tracking-[0.2em] text-gold/90">책 추가 구매 쿠폰이 발급됐어요</p>
            <p className="mt-3 text-[0.8rem] text-ivory-dim">
              개인 맞춤 PDF 책 <span className="line-through">{BOOK_PRICE_KRW.toLocaleString()}원</span>
            </p>
            <p className="font-display mt-1 text-[1.8rem] font-semibold text-gold">
              {BOOK_UPGRADE_PRICE_KRW.toLocaleString()}
              <span className="ml-1 text-base text-ivory-dim">원</span>
            </p>
            <p className="mt-1 text-[0.74rem] text-thread">{upgradeDeadlineLabel(coupon.endsAt)}까지 · 1회</p>
            <Link
              href={coupon.payUrl}
              className="mt-5 flex min-h-[3.25rem] items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.92rem] text-ivory"
            >
              쿠폰 적용해서 책 받기
            </Link>
            <Link href={coupon.bookUrl} className="mt-3 block text-[0.8rem] text-gold underline underline-offset-4">
              책 소개 · 실제 페이지 먼저 보기
            </Link>
            <p className="mt-4 text-[0.72rem] leading-[1.8] text-ivory-dim/80">
              사연을 다시 쓰지 않고 같은 사연으로 책만 만들어요. 결제를 취소해도 쿠폰은 남아요.
              {coupon.mailed ? (
                <>
                  <br />
                  쿠폰 링크를 메일로도 보냈어요.
                </>
              ) : null}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {couponOffer && (
        <div className="rounded-2xl border border-gold/40 bg-gold/5 px-5 py-4 text-[0.8rem] leading-[1.85] text-ivory-dim">
          <p className="text-gold">후기를 남기면 책 추가 구매 쿠폰을 드려요</p>
          <p>
            개인 맞춤 PDF 책 {BOOK_PRICE_KRW.toLocaleString()}원 → {BOOK_UPGRADE_PRICE_KRW.toLocaleString()}원 · 발급 후 14일 · 1회
          </p>
          <p className="text-ivory-dim/80">
            별점·내용과 관계없이 드려요. 아쉬운 점도 그대로 남겨 주세요. 공개되는 후기에는 &lsquo;후기 작성 혜택을 받은 구매자 후기&rsquo;로 표시돼요.
          </p>
        </div>
      )}

      <div>
        <p className="text-[0.8rem] text-gold/90">얼마나 도움이 되었나요?</p>
        <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label="별점">
          {STARS.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={rating === s}
              aria-label={`${s}점`}
              onClick={() => setRating(s)}
              className={`h-11 w-11 rounded-full text-[1.3rem] transition-colors ${
                s <= rating ? "text-gold" : "text-ivory-dim/30"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[0.8rem] text-gold/90">
          ① 도움이 된 부분 <span className="text-ivory-dim/70">(여러 개 선택)</span>
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {HELPED_OPTIONS.map((x) => (
            <Chip key={x.id} on={helped.includes(x.id)} label={x.label} onClick={() => toggleHelped(x.id)} />
          ))}
        </div>
      </div>

      <div>
        <p className="text-[0.8rem] text-gold/90">
          ② 이용 소감 <span className="text-ivory-dim/70">(여러 개 선택)</span>
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {IMPRESSION_OPTIONS.map((x) => (
            <Chip key={x.id} on={impressions.includes(x.id)} label={x.label} onClick={() => toggleImpression(x.id)} />
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="rv-body" className="text-[0.8rem] text-gold/90">
          후기 문장 <span className="text-ivory-dim/70">— 고른 내용으로 만들었어요. 확인하고 자유롭게 고쳐 주세요</span>
        </label>
        <textarea
          id="rv-body"
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setEdited(true);
          }}
          rows={5}
          maxLength={600}
          placeholder="위에서 고르면 문장이 여기에 만들어져요. 직접 써도 돼요."
          className="mt-2 w-full rounded-xl border border-gold-dim/30 bg-ink px-4 py-3 text-[0.9rem] leading-[1.8] text-ivory placeholder:text-ivory-dim/40"
        />
        <div className="mt-1 flex items-center justify-between text-[0.7rem] text-ivory-dim/70">
          {edited && generated && body !== generated ? (
            <button
              type="button"
              onClick={() => {
                setEdited(false);
                setBody(generated);
              }}
              className="text-gold underline underline-offset-4"
            >
              고른 내용으로 다시 만들기
            </button>
          ) : (
            <span />
          )}
          <span>{len}/600 · 10자 이상</span>
        </div>
      </div>

      <div>
        <label htmlFor="rv-name" className="text-[0.8rem] text-gold/90">
          후기에 보일 이름 <span className="text-ivory-dim/70">(선택, 비우면 &apos;익명&apos;)</span>
        </label>
        <input
          id="rv-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={12}
          placeholder="예: 지*, 새벽2시"
          className="mt-2 w-full rounded-xl border border-gold-dim/30 bg-ink px-4 py-3 text-[0.9rem] text-ivory placeholder:text-ivory-dim/40"
        />
      </div>

      <div className="space-y-3">
        <label className="flex items-start gap-3 text-[0.8rem] leading-[1.8] text-ivory-dim">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[#6d1f2c]"
          />
          <span>
            (선택) 이 후기를 월하연 홈페이지에 공개해도 괜찮아요. 사연 내용은 공개되지 않고, 쓰신 글과 별점, 이름만 보여요.
            {couponOffer ? " 공개 여부와 관계없이 쿠폰은 똑같이 드려요." : ""}
          </span>
        </label>
        {couponOffer && (
          <label className="flex items-start gap-3 text-[0.8rem] leading-[1.8] text-ivory-dim">
            <input
              type="checkbox"
              checked={mailCoupon}
              onChange={(e) => setMailCoupon(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[#6d1f2c]"
            />
            <span>(선택) 쿠폰과 책 안내를 메일로도 받을게요. 광고성 정보이며, 체크하지 않아도 다음 화면에서 쿠폰을 바로 쓸 수 있어요.</span>
          </label>
        )}
      </div>

      {err && <p className="text-[0.8rem] text-thread">{err}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!ready || busy}
        className="inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity disabled:opacity-40"
      >
        {busy ? "보내는 중…" : couponOffer ? "후기 등록하고 쿠폰 받기" : "후기 보내기"}
      </button>
      {!ready && (
        <p className="-mt-4 text-center text-[0.72rem] text-ivory-dim/70">
          별점을 고르고, 후기 문장을 10자 이상 적으면 등록할 수 있어요.
        </p>
      )}
    </div>
  );
}
