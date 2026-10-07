"use client";

/** 첫 구매가 남은 시간 (신청 후 24시간) — 0이 되면 정가 안내로 바뀜 */
import { useEffect, useState } from "react";
import { RITUAL_REGULAR_PRICE_KRW } from "@/lib/ritual-types";

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function OfferCountdown({
  endsAt,
  className = "",
}: {
  endsAt: number;
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return null;
  const left = endsAt - now;
  if (left <= 0) {
    return (
      <p className={`text-[0.74rem] text-ivory-dim ${className}`}>
        첫 구매가 시간이 끝났어요 · 이후 {RITUAL_REGULAR_PRICE_KRW.toLocaleString()}원
      </p>
    );
  }
  return (
    <p className={`text-[0.76rem] text-gold ${className}`}>
      첫 구매가 마감까지 <b className="tabular-nums">{fmt(left)}</b> · 이후 {RITUAL_REGULAR_PRICE_KRW.toLocaleString()}원
    </p>
  );
}
