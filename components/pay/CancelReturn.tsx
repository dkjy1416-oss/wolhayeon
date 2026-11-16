"use client";

/**
 * 11/17: 결제창(휴대폰은 새 화면)에서 취소하고 돌아왔을 때 — 결제를 시작한 미리보기 화면으로 바로 돌려보낸다.
 * (미리보기에서 시트를 열 때 주소를 sessionStorage 에 기억해 둠) 기억이 없으면 결제 화면으로.
 * 돌아간 화면에서 ?cancelled=1 을 보고 결제 시트와 월화 팝업을 다시 띄운다.
 */
import { useEffect } from "react";

export default function CancelReturn({ orderNumber, fallback }: { orderNumber: string; fallback: string }) {
  useEffect(() => {
    let to = fallback;
    try {
      const saved = sessionStorage.getItem(`wh_pay_return_${orderNumber}`);
      if (saved) {
        const u = new URL(saved, window.location.origin);
        if (u.origin === window.location.origin) {
          u.searchParams.set("cancelled", "1");
          to = u.toString();
        }
      }
    } catch {
      /* 결제 화면으로 */
    }
    window.location.replace(to);
  }, [orderNumber, fallback]);
  return (
    <main className="flex min-h-[100svh] items-center justify-center px-6 text-center">
      <p className="text-sm text-ivory-dim">결제 화면으로 돌아가는 중…</p>
    </main>
  );
}
