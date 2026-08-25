"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadTossPayments,
  ANONYMOUS,
  type TossPaymentsWidgets,
} from "@tosspayments/tosspayments-sdk";

/**
 * 토스페이먼츠 결제위젯 (SDK v2).
 * - 금액은 서버(DB)에서 내려준 값만 사용 — 브라우저에서 조작 불가.
 *   (승인 단계에서 서버가 DB 금액과 다시 대조하므로 조작 시 승인 거부)
 * - customerKey는 비회원(ANONYMOUS) — 개인정보를 위젯에 넘기지 않음.
 */
export default function TossCheckout({
  clientKey,
  orderNumber,
  amount,
}: {
  clientKey: string;
  orderNumber: string;
  amount: number;
}) {
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tossPayments = await loadTossPayments(clientKey);
        if (cancelled) return;
        const widgets = tossPayments.widgets({ customerKey: ANONYMOUS });
        widgetsRef.current = widgets;

        await widgets.setAmount({ currency: "KRW", value: amount });
        await Promise.all([
          widgets.renderPaymentMethods({
            selector: "#toss-payment-methods",
            variantKey: "DEFAULT",
          }),
          widgets.renderAgreement({
            selector: "#toss-agreement",
            variantKey: "AGREEMENT",
          }),
        ]);
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled)
          setErrorMsg(
            "결제 화면을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요."
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientKey, amount]);

  const handlePay = async () => {
    const widgets = widgetsRef.current;
    if (!widgets || paying) return;
    setPaying(true);
    setErrorMsg(null);
    try {
      await widgets.requestPayment({
        orderId: orderNumber,
        orderName: "월하연 붉은 인연의 실 리추얼",
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
      // Redirect 방식이므로 성공 시 이 아래는 실행되지 않음
    } catch (e) {
      // 구매자가 결제창을 닫은 경우 등
      const msg =
        e instanceof Error && e.message
          ? e.message
          : "결제가 진행되지 않았습니다. 다시 시도해주세요.";
      setErrorMsg(msg);
      setPaying(false);
    }
  };

  return (
    <div>
      {/* 결제수단/약관 UI — 위젯이 흰 배경으로 렌더링되므로 밝은 카드로 감싸기 */}
      <div className="overflow-hidden rounded-2xl bg-white">
        <div id="toss-payment-methods" />
        <div id="toss-agreement" />
      </div>

      <button
        type="button"
        onClick={handlePay}
        disabled={!ready || paying}
        className="mt-6 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85 disabled:opacity-50"
      >
        {paying
          ? "결제창을 여는 중…"
          : ready
            ? `${amount.toLocaleString()}원 결제하기`
            : "결제 화면 불러오는 중…"}
      </button>

      {errorMsg && (
        <p className="mt-4 text-center text-sm leading-relaxed text-thread">
          {errorMsg}
        </p>
      )}

    </div>
  );
}
