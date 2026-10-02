"use client";

/**
 * 미리보기까지 마친 사람이 나중에 /book·홈으로 다시 와도 사연을 다시 쓰지 않게:
 * 이 기기에 저장된 최근 주문이 있으면 책·패키지 구매 버튼(/apply?want=…)을
 * 그 주문의 결제 화면(/apply/complete?order=…&product=…)으로 바로 보낸다.
 * (주문번호만 기기에 저장 — 사연 내용은 서버에만 있음)
 */
import { useEffect, useState } from "react";

const KEY = "wh_last_order_v1";
const TTL = 14 * 24 * 60 * 60 * 1000;
const ORDER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

export function rememberOrder(orderNumber: string, name?: string | null) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ o: orderNumber, n: name ?? "", at: Date.now() }));
  } catch {
    /* 저장이 막힌 브라우저 — 무시 */
  }
}

/** 결제가 끝나면 기억한 주문을 지운다 (다음 구매는 새 주문으로) */
export function forgetOrder() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 무시 */
  }
}

function readOrder(): { o: string; n: string } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || !ORDER_RE.test(v.o) || Date.now() - Number(v.at) > TTL) return null;
    return { o: v.o, n: typeof v.n === "string" ? v.n : "" };
  } catch {
    return null;
  }
}

export default function ResumeOrder({
  hasOrderParam = false,
  className = "mx-4 mt-20",
}: {
  hasOrderParam?: boolean;
  className?: string;
}) {
  const [saved, setSaved] = useState<{ o: string; n: string } | null>(null);

  useEffect(() => {
    if (hasOrderParam) return;
    const s = readOrder();
    if (!s) return;
    setSaved(s);
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      const href = a?.getAttribute("href") ?? "";
      const m = href.match(/^\/apply\?want=(book|bundle)$/);
      if (!m) return;
      e.preventDefault();
      e.stopPropagation();
      window.location.href = `/apply/complete?order=${encodeURIComponent(s.o)}&product=${m[1]}`;
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [hasOrderParam]);

  if (!saved) return null;
  return (
    <div className={`${className} rounded-xl border border-gold/35 bg-gold/10 px-4 py-3 text-center`}>
      <p className="text-[0.8rem] leading-[1.7] text-ivory">
        {saved.n ? `${saved.n}님의 ` : ""}사연이 저장돼 있어요.
        <br />
        <span className="text-gold">다시 쓰지 않고 바로 결제할 수 있어요.</span>
      </p>
    </div>
  );
}
