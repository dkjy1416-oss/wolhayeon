"use client";

/** 첫 구매가 남은 시간 (신청 후 24시간) — 0이 되면 페이지를 새로 읽어 가격·결제 금액을 함께 바꾼다.
    after: 선택한 상품의 할인 종료 후 가격 (regularPriceFor) */
import { useEffect, useState } from "react";

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function OfferCountdown({
  endsAt,
  after,
  className = "",
  showEnd = false,
  bar = false,
}: {
  endsAt: number;
  after: number;
  className?: string;
  /** 실제 종료 시각(KST)도 함께 — '종료: 10월 16일 오전 2:00 · 종료 후 16,900원' */
  showEnd?: boolean;
  /** 하단 고정 버튼 위 한 줄 — '할인혜택 종료까지 08:45:53' */
  bar?: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = now === null ? 1 : endsAt - now;
  /* 마감 순간 한 번만 새로고침 → 서버가 정가로 다시 계산해 카드·버튼·결제 금액이 함께 바뀜 */
  useEffect(() => {
    if (now !== null && left <= 0 && Date.now() - endsAt < 5000) window.location.reload();
  }, [now, left, endsAt]);
  if (now === null) return null;
  if (left <= 0) {
    return (
      <p className={`text-[0.74rem] text-ivory-dim ${className}`}>
        첫 구매 혜택이 종료되어 현재 {after.toLocaleString()}원입니다
      </p>
    );
  }
  if (bar) {
    return (
      <p className={`text-center text-[0.9rem] font-semibold text-ivory ${className}`}>
        할인혜택 종료까지 <span className="tabular-nums text-[#ffd84d]">{fmt(left)}</span>
      </p>
    );
  }
  if (showEnd) {
    const d = new Date(endsAt + 9 * 3600 * 1000);
    const h = d.getUTCHours();
    const end = `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    return (
      <div className={`text-[0.84rem] leading-[1.6] text-ivory ${className}`}>
        <p>
          혜택 종료까지 <b className="tabular-nums font-semibold text-burgundy" aria-hidden>{fmt(left)}</b>
        </p>
        <p className="text-[0.78rem] text-ivory-dim">종료: {end} · 종료 후 {after.toLocaleString()}원</p>
      </div>
    );
  }
  return (
    <p className={`text-[0.76rem] text-gold ${className}`}>
      첫 구매가 마감까지 <b className="tabular-nums">{fmt(left)}</b> · 이후 {after.toLocaleString()}원
    </p>
  );
}
