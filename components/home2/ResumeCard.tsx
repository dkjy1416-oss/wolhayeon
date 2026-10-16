"use client";

/**
 * 02. 저장된 사연 복귀 — 이 기기에서 사연을 쓴 사람에게만 (주문번호만 기기에 저장, 사연은 서버에만).
 * 상태·가격·혜택 마감은 서버(/api/orders/price)가 정한 값만 쓴다. 기기 시계로 가격을 바꾸지 않는다.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { readOrder } from "@/components/book/ResumeOrder";

type S = { status: string; priceNow: number | null; regular: number; offerEndsAt: number | null; skew: number };

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(":");
}
function endLabel(t: number) {
  const d = new Date(t + 9 * 3600 * 1000);
  const h = d.getUTCHours();
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export default function ResumeCard() {
  const [saved, setSaved] = useState<{ o: string; n: string } | null>(null);
  const [st, setSt] = useState<S | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const s = readOrder();
    if (!s) return;
    setSaved(s);
    fetch(`/api/orders/price?order=${encodeURIComponent(s.o)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok) setSt({ status: j.status, priceNow: j.priceNow, regular: j.regular, offerEndsAt: j.offerEndsAt, skew: (j.serverNow ?? Date.now()) - Date.now() });
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!st?.offerEndsAt) return;
    setNow(Date.now() + st.skew);
    const t = setInterval(() => setNow(Date.now() + st.skew), 1000);
    return () => clearInterval(t);
  }, [st]);
  if (!saved || !st || st.status === "refunded") return null;
  const q = encodeURIComponent(saved.o);
  const paid = st.status === "paid";
  const left = st.offerEndsAt ? st.offerEndsAt - now : 0;
  return (
    <section className="px-5 pt-6 md:px-8">
      <div className="shadow-paper mx-auto flex max-w-[1120px] flex-col gap-4 rounded-2xl border border-gold-dim bg-ink-soft px-5 py-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="font-display text-[1.08rem] text-ivory">
            {paid ? "결제가 끝난 사연이 있어요." : `${saved.n ? `${saved.n}님이 ` : ""}작성한 사연이 저장돼 있어요.`}
          </p>
          {paid ? (
            <p className="mt-1 text-[0.9rem] text-ivory-dim">결과는 결제할 때 입력한 메일의 ‘결과 열기’ 링크로 다시 열 수 있어요.</p>
          ) : st.offerEndsAt && left > 0 ? (
            <p className="mt-1 text-[0.9rem] text-ivory-dim" aria-live="off">
              첫 구매 혜택 {st.priceNow?.toLocaleString()}원 · 종료까지 <b className="tabular-nums font-semibold text-burgundy">{fmt(left)}</b>
              <span className="block text-[0.8rem]">종료: {endLabel(st.offerEndsAt)} · 종료 후 {st.regular.toLocaleString()}원</span>
            </p>
          ) : (
            <p className="mt-1 text-[0.9rem] text-ivory-dim">다시 쓰지 않고 이어볼 수 있어요 · 현재 {(st.priceNow ?? st.regular).toLocaleString()}원</p>
          )}
        </div>
        {!paid && (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Link href={`/apply/preview?order=${q}`} className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep px-5 text-[0.92rem] font-semibold">
              무료 미리보기 이어보기
            </Link>
            <Link href={`/apply/complete?order=${q}&product=message`} className="inline-flex h-12 items-center justify-center rounded-full border border-gold-dim px-5 text-[0.92rem] text-ivory">
              구매 구성 확인
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
