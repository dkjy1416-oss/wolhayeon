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
}: {
  endsAt: number;
  after: number;
  className?: string;
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
        첫 구매가 시간이 끝났어요 · 이후 {after.toLocaleString()}원
      </p>
    );
  }
  return (
    <p className={`text-[0.76rem] text-gold ${className}`}>
      첫 구매가 마감까지 <b className="tabular-nums">{fmt(left)}</b> · 이후 {after.toLocaleString()}원
    </p>
  );
}
