"use client";

/**
 * 11/16 요청: 결제하기 → 토스 결제창에서 취소하고 돌아왔을 때 월화가 붙잡는 팝업.
 * - 문구는 사실만: 사연·상품은 그대로 남아 있음, 첫 구매가가 적용 중이면 실제 남은 시간.
 * - 망설인 이유 한 번 탭 → pay_cancel_popup 으로 기록 (관리자 '결제 화면, 어디서 나갔나').
 * - '다시 결제하기'는 이 버튼 클릭 자체로 결제창을 연다(팝업 차단 방지 — 사용자 동작 안에서 호출).
 */
import { useEffect, useState } from "react";
import { logPayEvent } from "@/lib/pay-events";

const REASONS: [string, string][] = [
  ["reason_price", "가격이 부담돼요"],
  ["reason_method", "결제 수단·절차가 불편해요"],
  ["reason_later", "조금 더 생각해 볼게요"],
  ["reason_other", "다른 이유"],
];

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-cancel-title"
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/70 px-4 pb-6 sm:items-center"
    >
      <div className="w-full max-w-[360px] overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#1d181b] shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="relative h-[168px] w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wolhwa/wolhwa-gaze.webp" alt="월화" className="h-full w-full object-cover object-[50%_22%]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#1d181b]" />
          <button
            type="button"
            onClick={() => {
              logPayEvent(orderNumber, "pay_cancel_popup", "close");
              onClose();
            }}
            aria-label="닫기"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-[1rem] text-white"
          >
            ✕
          </button>
        </div>
        <div className="px-6 pb-6 pt-1">
          <p className="text-[0.78rem] font-semibold tracking-wide text-[#e46b8a]">월화</p>
          <p id="pay-cancel-title" className="mt-1 text-[1.18rem] font-bold leading-[1.55] text-[#f7f0e8]">
            잠깐.
            <br />
            결제창을 닫으셨네요.
          </p>
          <p className="mt-2 text-[0.84rem] leading-[1.75] text-[#cfc4bd]">
            괜찮아요. 들려준 사연과 고른 상품은 그대로 남아 있어요.
            {offerOn && (
              <>
                <br />
                첫 구매가 <b className="text-[#f7f0e8]">{amount.toLocaleString()}원</b>은{" "}
                <b className="tabular-nums text-[#f7f0e8]">{fmt(left)}</b> 뒤에 끝나요 (이후 {regular!.toLocaleString()}원).
              </>
            )}
          </p>

          <p className="mt-4 text-[0.76rem] text-[#cfc4bd]">어떤 점이 망설여졌나요? (한 번만 눌러 주세요)</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REASONS.map(([code, label]) => (
              <button
                key={code}
                type="button"
                onClick={() => pick(code)}
                disabled={!!picked && picked !== code}
                className={`rounded-full border px-3 py-1.5 text-[0.76rem] transition-colors ${
                  picked === code
                    ? "border-[#e46b8a] bg-[#4a1621] text-[#f7f0e8]"
                    : "border-white/15 text-[#cfc4bd] disabled:opacity-40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {reply && <p className="mt-2.5 text-[0.8rem] leading-[1.7] text-[#f0c6d2]">{reply}</p>}

          <button
            type="button"
            onClick={() => {
              logPayEvent(orderNumber, "pay_cancel_popup", "retry");
              onRetry();
            }}
            className="mt-5 flex h-[52px] w-full items-center justify-center rounded-full bg-gradient-to-b from-[#c2416a] to-[#8e1f3f] text-[1rem] font-bold text-white"
          >
            {amount.toLocaleString()}원 다시 결제하기
          </button>
          <button
            type="button"
            onClick={() => {
              logPayEvent(orderNumber, "pay_cancel_popup", "close");
              onClose();
            }}
            className="mt-3 w-full text-center text-[0.82rem] text-[#cfc4bd] underline underline-offset-4"
          >
            나중에 할게요
          </button>
        </div>
      </div>
    </div>
  );
}
