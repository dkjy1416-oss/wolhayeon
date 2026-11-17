"use client";

/**
 * 11/16 요청: 결제하기 → 토스 결제창에서 취소하고 돌아왔을 때 월화가 붙잡는 팝업.
 * - 문구는 사실만: 사연·상품은 그대로 남아 있음, 첫 구매가가 적용 중이면 실제 남은 시간.
 * - 망설인 이유 한 번 탭 → pay_cancel_popup 으로 기록 (관리자 '결제 화면, 어디서 나갔나').
 * - '다시 결제하기'는 이 버튼 클릭 자체로 결제창을 연다(팝업 차단 방지 — 사용자 동작 안에서 호출).
 */
import { useEffect, useState } from "react";
import { logPayEvent } from "@/lib/pay-events";
import HoldCard from "./HoldCard";

const REASONS: [string, string][] = [
  ["reason_price", "가격이 부담돼요"],
  ["reason_method", "결제 수단·절차가 불편해요"],
  ["reason_later", "조금 더 생각해 볼게요"],
  ["reason_other", "다른 이유"],
];

export default function PayCancelPopup({
  orderNumber,
  amount,
  offerEndsAt,
  regular,
  onRetry,
  onClose,
}: {
  orderNumber: string;
  amount: number;
  offerEndsAt?: number | null;
  regular?: number;
  onRetry: () => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    logPayEvent(orderNumber, "pay_cancel_popup", "shown");
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [orderNumber]);

  const left = offerEndsAt ? offerEndsAt - now : 0;
  const offerOn = !!offerEndsAt && left > 0 && !!regular && regular > amount;

  const pick = (code: string) => {
    if (picked) return;
    setPicked(code);
    logPayEvent(orderNumber, "pay_cancel_popup", code);
  };

  const reply =
    picked === "reason_price"
      ? "부담되는 마음 알아요. 결제는 한 번뿐이고, 정기결제는 없어요."
      : picked === "reason_method"
        ? "인스타·카톡 안에서는 결제창이 막힐 때가 있어요. 아래 '외부 브라우저로 열기'로 다시 해 보세요."
        : picked === "reason_later"
          ? "천천히 생각해도 괜찮아요. 사연은 그대로 두었어요."
          : picked
            ? "알려 줘서 고마워요."
            : null;

  const saved = regular && regular > amount ? regular - amount : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="결제창을 닫으셨어요"
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 px-5"
    >
      <HoldCard
        saved={offerOn ? saved : 0}
        offerEndsAt={offerEndsAt}
        regular={regular}
        title={
          <>
            잠깐,
            <br />
            결제창을 닫으셨네요
          </>
        }
        stayLabel={offerOn ? "할인 받고 계속하기" : `${amount.toLocaleString()}원 다시 결제하기`}
        onStay={() => {
          logPayEvent(orderNumber, "pay_cancel_popup", "retry");
          onRetry();
        }}
        onLeave={() => {
          logPayEvent(orderNumber, "pay_cancel_popup", "close");
          onClose();
        }}
        onClose={() => {
          logPayEvent(orderNumber, "pay_cancel_popup", "close");
          onClose();
        }}
      >
        <p className="mt-3 text-[0.8rem] leading-[1.7] text-[#cfc4bd]">들려준 사연과 고른 상품은 그대로 남아 있어요.</p>
        <p className="mt-4 text-[0.74rem] text-[#9d938c]">어떤 점이 망설여졌나요? (한 번만)</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {REASONS.map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => pick(code)}
              disabled={!!picked && picked !== code}
              className={`rounded-full border px-2.5 py-1 text-[0.72rem] transition-colors ${
                picked === code ? "border-[#ff7a9a] bg-[#3a1a22] text-[#f7f0e8]" : "border-white/15 text-[#cfc4bd] disabled:opacity-40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {reply && <p className="mt-2 text-[0.78rem] leading-[1.7] text-[#f0c6d2]">{reply}</p>}
      </HoldCard>
    </div>
  );
}
