"use client";

/**
 * 11/16 요청: 결제 화면에서 나가려는 사람에게 "할인 받은 금액" 안내 팝업.
 * - 첫 구매가가 실제로 적용 중일 때만(offerEnd 있음) 페이지에서 렌더한다.
 * - 문구는 사실만: 할인 금액 = 정가 - 지금 금액, 남은 시간 = 실제 첫 구매가 마감 시각까지.
 *   ("나가면 즉시 사라진다"가 아니라 마감 시각에 끝난다 — 실제 규칙이 신청 후 24시간이므로)
 * - 뒤로가기(제스처 포함)와 화면 안 링크(← 미리보기로, 나중에 결제하기 등)에서 한 번만 뜬다.
 *   같은 주문에서 한 번 보여 줬으면 다시 막지 않는다(세션 기준).
 * - 인스타 앱의 X(창 닫기)는 브라우저가 막을 수 없어 대상이 아니다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { logPayEvent } from "@/lib/pay-events";

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}시간 ${m}분 ${sec}초` : `${m}분 ${sec}초`;
}

export default function LeaveOfferGuard({
  orderNumber,
  endsAt,
  amount,
  regular,
}: {
  orderNumber: string;
  endsAt: number;
  amount: number;
  regular: number;
}) {
  const saved = regular - amount;
  const key = `wolhayeon_leave_popup_${orderNumber}`;
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());
  const armed = useRef(false);
  const pendingHref = useRef<string | null>(null);

  const already = () => {
    try {
      return sessionStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  };
  const markShown = () => {
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* 저장 안 되면 이번 화면에서만 한 번 */
    }
  };

  const show = useCallback(() => {
    armed.current = false;
    markShown();
    setNow(Date.now());
    setOpen(true);
    logPayEvent(orderNumber, "pay_leave_popup", "shown");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  useEffect(() => {
    if (saved <= 0 || already() || Date.now() >= endsAt) return;
    armed.current = true;
    /* 뒤로가기를 한 번 받아 낼 자리 */
    try {
      history.pushState({ wolhaLeaveGuard: 1 }, "", location.href);
    } catch {
      /* 일부 앱 브라우저 — 링크 안내만 동작 */
    }
    const onPop = () => {
      if (!armed.current) return;
      pendingHref.current = null;
      show();
    };
    const onClick = (e: MouseEvent) => {
      if (!armed.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank") return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      /* 같은 결제 화면 안의 이동(상품 바꾸기 등)과 환불정책은 막지 않음 */
      if (url.pathname === location.pathname || url.pathname.startsWith("/refund")) return;
      e.preventDefault();
      pendingHref.current = a.href;
      show();
    };
    window.addEventListener("popstate", onPop);
    document.addEventListener("click", onClick, true);
    return () => {
      armed.current = false;
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("click", onClick, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber, endsAt, saved, show]);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  if (!open) return null;
  const left = endsAt - now;

  const stay = () => {
    logPayEvent(orderNumber, "pay_leave_popup", "stay");
    setOpen(false);
    /* 뒤로가기로 열렸다면 빠진 자리를 다시 채워 둔다(다음 뒤로가기는 그대로 나감) */
    if (!pendingHref.current) {
      try {
        history.pushState({ wolhaLeaveGuard: 2 }, "", location.href);
      } catch {
        /* 무시 */
      }
    }
    document.getElementById("pay-anchor")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const leave = () => {
    logPayEvent(orderNumber, "pay_leave_popup", "leave");
    setOpen(false);
    if (pendingHref.current) window.location.href = pendingHref.current;
    else history.back();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-offer-title"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-6"
    >
      <div className="w-full max-w-[340px] rounded-[1.6rem] border border-white/10 bg-[#1d181b] px-6 pb-6 pt-7 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <p id="leave-offer-title" className="text-[1.22rem] font-bold leading-[1.55] text-ivory">
          할인 받은{" "}
          <span className="rounded-md bg-[#4a1621] px-1.5 text-[#ff8fab]">{saved.toLocaleString()}원</span>
          <br />
          두고 나가시겠어요?
        </p>
        <p className="mt-3 text-[0.86rem] leading-[1.75] text-ivory-dim">
          {left > 0 ? (
            <>
              <b className="tabular-nums text-ivory">{fmt(left)}</b> 뒤에 첫 구매 할인이 끝나요.
              <br />
              그 뒤에는 {regular.toLocaleString()}원으로 결제돼요.
            </>
          ) : (
            <>첫 구매 할인 시간이 끝났어요.</>
          )}
        </p>
        <button
          type="button"
          onClick={stay}
          className="mt-6 flex h-[52px] w-full items-center justify-center rounded-full bg-gradient-to-b from-[#c2416a] to-[#8e1f3f] text-[1rem] font-bold text-white"
        >
          {amount.toLocaleString()}원으로 계속 보기
        </button>
        <button
          type="button"
          onClick={leave}
          className="mt-3 w-full text-center text-[0.84rem] text-ivory-dim underline underline-offset-4"
        >
          나갈래요
        </button>
      </div>
    </div>
  );
}
