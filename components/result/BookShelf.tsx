"use client";

/**
 * 결과 페이지의 '내 책' 카드.
 *  - 책 포함 주문(패키지·책): 완성되면 [PDF 저장] [바로 열어 보기], 만드는 중이면 자동으로 다시 확인
 *  - 메시지만 산 주문: 책 소개 + 사연 그대로 책만 결제하는 버튼
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type State = "checking" | "processing" | "ready" | "failed";

export default function BookShelf({
  token,
  hasBook,
  maskedEmail,
}: {
  token: string;
  hasBook: boolean;
  maskedEmail: string | null;
}) {
  const [state, setState] = useState<State>("checking");
  const [path, setPath] = useState<string | null>(null);
  const tries = useRef(0);
  const [buying, setBuying] = useState(false);
  const [buyNote, setBuyNote] = useState<string | null>(null);

  const buyBook = async () => {
    setBuying(true);
    setBuyNote(null);
    try {
      const res = await fetch("/api/books/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addon", token }),
      });
      const j = await res.json().catch(() => null);
      if (j?.ok && typeof j.order === "string") {
        window.location.href = `/apply/complete?order=${encodeURIComponent(j.order)}&product=book`;
        return;
      }
      setBuyNote(
        j?.error === "already_bought"
          ? "이미 이 사연으로 책을 받으셨어요. 메일함을 확인해 주세요."
          : "잠시 후 다시 눌러 주세요."
      );
    } catch {
      setBuyNote("잠시 후 다시 눌러 주세요.");
    }
    setBuying(false);
  };

  useEffect(() => {
    if (!hasBook) return;
    let alive = true;
    const run = async () => {
      tries.current += 1;
      try {
        const res = await fetch("/api/books/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status", token }),
        });
        const j = await res.json().catch(() => null);
        if (!alive) return;
        if (j?.status === "ready" && typeof j.downloadPath === "string") {
          setPath(j.downloadPath);
          setState("ready");
          return;
        }
        if (j?.status === "failed" && tries.current >= 3) {
          setState("failed");
          return;
        }
        setState("processing");
      } catch {
        if (alive) setState("processing");
      }
      if (alive && tries.current < 30) window.setTimeout(run, 10_000);
    };
    run();
    return () => {
      alive = false;
    };
  }, [hasBook, token]);

  const cover = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/book/v2/cover-3d.webp"
      alt="《헤어진 뒤, 연락하지 말아야 할 때》"
      loading="lazy"
      className="bk-float w-[6.2rem] shrink-0 drop-shadow-[0_16px_26px_rgba(0,0,0,0.7)]"
    />
  );

  if (!hasBook) {
    return (
      <section id="book" className="scroll-mt-6 px-5 py-8">
        <div className="mx-auto max-w-[34rem] rounded-2xl border border-gold/40 bg-gradient-to-b from-[#1d1512] to-ink-soft px-5 py-6">
          <div className="flex items-center gap-4">
            {cover}
            <div className="min-w-0">
              <p className="text-[0.66rem] tracking-[0.2em] text-gold/80">다음 단계까지 · 개인화 PDF 약 120쪽</p>
              <p className="font-display mt-1.5 text-[1.05rem] leading-[1.5] text-ivory">
                헤어진 뒤,
                <br />
                연락하지 말아야 할 때
              </p>
            </div>
          </div>
          <p className="mt-4 text-[0.84rem] font-light leading-[1.9] text-ivory-dim">
            이 답장은 <span className="text-ivory">지금 무엇을 할지</span>를 알려 드렸어요. 책은 그다음 —{" "}
            <span className="text-ivory">연락이 다시 오는 순간, 다시 만나기 시작할 때</span>까지 10가지 상황별로
            보낼 문장과 보내면 안 되는 문장을 담았어요. 지금 이야기 그대로 만들어요.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-1.5">
            {["p03", "p06", "p08"].map((pg) => (
              <div key={pg} className="overflow-hidden rounded-md border border-gold-dim/25 bg-[#f5efe3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/book/pages/${pg}.webp`} alt="실제 책 페이지" loading="lazy" className="block aspect-[1/1.41] w-full object-cover object-top" />
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={buying}
            onClick={buyBook}
            className="cta-glow mt-5 flex min-h-[3.25rem] w-full items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.92rem] text-ivory disabled:opacity-60"
          >
            {buying ? "결제 화면을 여는 중…" : "사연 다시 안 쓰고 책 받기 · 29,000원"}
          </button>
          {buyNote && <p className="mt-2 text-center text-[0.74rem] text-thread">{buyNote}</p>}
          <Link
            href="/book"
            className="mt-2.5 flex h-11 items-center justify-center rounded-full border border-gold/40 text-[0.84rem] text-gold"
          >
            책 차례와 실제 페이지 보기 →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section id="book" className="scroll-mt-6 px-5 py-6">
      <div className="mx-auto max-w-[34rem] rounded-2xl border border-gold/50 bg-gradient-to-b from-[#1d1512] to-ink-soft px-5 py-6 shadow-[0_0_40px_rgba(226,196,138,0.08)]">
        <div className="flex items-center gap-4">
          {cover}
          <div className="min-w-0">
            <p className="text-[0.66rem] tracking-[0.2em] text-gold">함께 받은 내 책</p>
            <p className="font-display mt-1.5 text-[1.05rem] leading-[1.5] text-ivory">
              헤어진 뒤,
              <br />
              연락하지 말아야 할 때
            </p>
            <p className="mt-1 text-[0.72rem] text-ivory-dim">개인화 PDF · 약 120쪽</p>
          </div>
        </div>

        {state === "ready" && path ? (
          <>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <a
                href={path}
                className="flex h-12 items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.88rem] text-ivory"
              >
                PDF로 저장하기
              </a>
              <a
                href={`${path}&view=1`}
                target="_blank"
                rel="noopener"
                className="flex h-12 items-center justify-center rounded-full border border-gold/45 text-[0.88rem] text-gold"
              >
                바로 열어 보기
              </a>
            </div>
            <p className="mt-3 text-center text-[0.74rem] font-light leading-[1.8] text-ivory-dim">
              같은 책을 메일{maskedEmail ? `(${maskedEmail})` : ""}로도 보내 드렸어요.
              <br />
              60일 동안 언제든 메일함에서 다시 받을 수 있어요.
            </p>
          </>
        ) : state === "failed" ? (
          <p className="mt-5 rounded-xl border border-gold-dim/25 px-4 py-3 text-center text-[0.8rem] leading-[1.8] text-ivory-dim">
            책을 마무리하는 데 조금 더 걸리고 있어요.
            <br />
            완성되는 대로 메일{maskedEmail ? `(${maskedEmail})` : ""}로 보내 드릴게요.
          </p>
        ) : (
          <div className="mt-5 rounded-xl border border-gold-dim/25 px-4 py-3.5 text-center">
            <div className="mx-auto h-[3px] w-full overflow-hidden rounded-full bg-ivory/10">
              <div className="wh-indeterminate h-full w-1/3 rounded-full bg-gradient-to-r from-thread to-gold" />
            </div>
            <p className="mt-3 text-[0.8rem] leading-[1.8] text-ivory-dim">
              지금 책을 엮고 있어요. 완성되면 여기에 버튼이 생겨요.
              <br />
              메일{maskedEmail ? `(${maskedEmail})` : ""}로도 함께 보내 드려요.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
