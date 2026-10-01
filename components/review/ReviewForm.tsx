"use client";

import { useState } from "react";

const STARS = [1, 2, 3, 4, 5];

export default function ReviewForm({
  o,
  t,
  initial,
}: {
  o: string;
  t: string;
  initial: { rating: number; body: string; name: string; consent: boolean } | null;
}) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [body, setBody] = useState(initial?.body ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [consent, setConsent] = useState(initial?.consent ?? true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
        body: JSON.stringify({ o, t, rating, body, name, consent }),
      });
      const j = await res.json().catch(() => null);
      if (j?.ok) setDone(true);
      else if (j?.error === "already_reviewed") setErr("이미 남겨 주신 후기가 있어요. 고마워요.");
      else if (j?.error === "invalid_link") setErr("링크가 만료되었어요. 받은 메일의 링크로 다시 들어와 주세요.");
      else setErr("저장하지 못했어요. 잠시 후 다시 눌러 주세요.");
    } catch {
      setErr("저장하지 못했어요. 잠시 후 다시 눌러 주세요.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="fade-in rounded-2xl border border-gold-dim/30 bg-ink-soft/60 px-6 py-8 text-center">
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
    );
  }

  return (
    <div className="space-y-6">
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
        <label htmlFor="rv-body" className="text-[0.8rem] text-gold/90">
          어떤 점이 도움이 되었는지, 솔직하게 들려주세요
        </label>
        <textarea
          id="rv-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          maxLength={600}
          placeholder="예: 연락하고 싶은 밤에 체크리스트를 펼쳐 보고 한 번 멈췄어요."
          className="mt-2 w-full rounded-xl border border-gold-dim/30 bg-ink px-4 py-3 text-[0.9rem] leading-[1.8] text-ivory placeholder:text-ivory-dim/40"
        />
        <p className="mt-1 text-right text-[0.7rem] text-ivory-dim/70">{len}/600 · 10자 이상</p>
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

      <label className="flex items-start gap-3 text-[0.8rem] leading-[1.8] text-ivory-dim">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[#6d1f2c]"
        />
        <span>
          이 후기를 월하연 홈페이지에 공개해도 괜찮아요. (사연 내용은 공개되지 않고, 쓰신 글과 별점, 이름만 보여요)
        </span>
      </label>

      {err && <p className="text-[0.8rem] text-thread">{err}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!ready || busy}
        className="inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity disabled:opacity-40"
      >
        {busy ? "보내는 중…" : "후기 보내기"}
      </button>
    </div>
  );
}
