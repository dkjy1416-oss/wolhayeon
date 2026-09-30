"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  loadTossPayments,
  ANONYMOUS,
  type TossPaymentsWidgets,
} from "@tosspayments/tosspayments-sdk";
import { logPayEvent } from "@/lib/pay-events";

/** 토스 SDK 오류에서 코드만 안전하게 꺼냄 */
function errorCode(e: unknown): string | null {
  if (e && typeof e === "object" && "code" in e) {
    const c = (e as { code?: unknown }).code;
    if (typeof c === "string") return c;
  }
  return e instanceof Error ? e.name : null;
}

const ORDER_NAME = "월하연 붉은 인연의 실 리추얼";

/**
 * 결제 진입점 — 클라이언트 키 종류로 방식을 자동 선택.
 * - 결제위젯 키(*_gck_*): 토스 결제위젯 (상점 vwolha95uh에 묶임)
 * - API 개별 연동 키(*_ck_*): 결제창 직접 호출 (키가 속한 상점, 예: vwolhagv36)
 * 서버 승인은 두 방식 모두 동일(/v1/payments/confirm) — 시크릿 키만 짝을 맞추면 됨.
 */
export default function TossCheckout(props: {
  clientKey: string;
  orderNumber: string;
  amount: number;
  orderName?: string;
}) {
  return props.clientKey.includes("_gck_") ? (
    <TossWidgetCheckout {...props} />
  ) : (
    <TossWindowCheckout {...props} />
  );
}

function RefundNotice() {
  return (
    <div className="mt-5 rounded-xl border border-gold-dim/25 bg-ink-soft px-4 py-3 text-center">
      <p className="text-[0.72rem] font-light leading-[1.8] text-ivory-dim">
        결제 후 개인 맞춤 결과 생성이 시작됩니다. 전체 결과 열람 후에는
        맞춤형 디지털 콘텐츠의 특성상 청약철회가 제한될 수 있습니다.
      </p>
      <Link
        href="/refund"
        target="_blank"
        className="mt-1.5 inline-block text-[0.72rem] text-gold underline underline-offset-4"
      >
        환불정책 확인하기
      </Link>
    </div>
  );
}

/**
 * 결제창 방식 (API 개별 연동 키).
 * 카드/간편결제는 토스 통합결제창(카카오페이·네이버페이 등 계약된 간편결제 포함),
 * 계좌이체는 퀵계좌이체 창을 연다.
 */
function TossWindowCheckout({
  clientKey,
  orderNumber,
  amount,
  orderName = ORDER_NAME,
}: {
  clientKey: string;
  orderNumber: string;
  amount: number;
  orderName?: string;
}) {
  const paymentRef = useRef<ReturnType<
    Awaited<ReturnType<typeof loadTossPayments>>["payment"]
  > | null>(null);
  const [method, setMethod] = useState<"CARD" | "TRANSFER">("CARD");
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tossPayments = await loadTossPayments(clientKey);
        if (cancelled) return;
        paymentRef.current = tossPayments.payment({ customerKey: ANONYMOUS });
        setReady(true);
        logPayEvent(orderNumber, "widget_ready", "window");
      } catch (e) {
        logPayEvent(orderNumber, "widget_error", errorCode(e));
        if (!cancelled)
          setErrorMsg(
            "결제 화면을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요."
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientKey, orderNumber]);

  const handlePay = async () => {
    const payment = paymentRef.current;
    if (!payment || paying) return;
    setPaying(true);
    setErrorMsg(null);
    logPayEvent(orderNumber, "pay_request", method);
    const common = {
      amount: { currency: "KRW" as const, value: amount },
      orderId: orderNumber,
      orderName,
      successUrl: `${window.location.origin}/payment/success`,
      failUrl: `${window.location.origin}/payment/fail`,
    };
    try {
      if (method === "CARD") {
        await payment.requestPayment({
          ...common,
          method: "CARD",
          card: {
            useEscrow: false,
            flowMode: "DEFAULT",
            useCardPoint: false,
            useAppCardOnly: false,
          },
        });
      } else {
        await payment.requestPayment({
          ...common,
          method: "TRANSFER",
          transfer: {
            cashReceipt: { type: "소득공제" },
            useEscrow: false,
          },
        });
      }
      // Redirect 방식 — 성공 시 이 아래는 실행되지 않음
    } catch (e) {
      logPayEvent(orderNumber, "pay_request_error", errorCode(e));
      const msg =
        e instanceof Error && e.message
          ? e.message
          : "결제가 진행되지 않았습니다. 다시 시도해주세요.";
      setErrorMsg(msg);
      setPaying(false);
    }
  };

  const optionCls = (active: boolean) =>
    `flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors ${
      active
        ? "border-gold/60 bg-gold/10 text-ivory"
        : "border-ivory/15 bg-ink/40 text-ivory-dim"
    }`;

  return (
    <div>
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => setMethod("CARD")}
          className={optionCls(method === "CARD")}
        >
          <span>
            <span className="block text-[0.92rem] font-medium">
              카드 · 간편결제
            </span>
            <span className="mt-0.5 block text-[0.72rem] opacity-75">
              카카오페이 · 네이버페이 · 토스페이 · 삼성페이 등
            </span>
          </span>
          <span aria-hidden>{method === "CARD" ? "●" : "○"}</span>
        </button>
        <button
          type="button"
          onClick={() => setMethod("TRANSFER")}
          className={optionCls(method === "TRANSFER")}
        >
          <span>
            <span className="block text-[0.92rem] font-medium">계좌이체</span>
            <span className="mt-0.5 block text-[0.72rem] opacity-75">
              토스 퀵계좌이체 · 현금영수증 소득공제
            </span>
          </span>
          <span aria-hidden>{method === "TRANSFER" ? "●" : "○"}</span>
        </button>
      </div>

      <RefundNotice />

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
      <p className="mt-3 text-center text-[0.68rem] leading-[1.8] text-ivory-dim/60">
        결제하기를 누르면 토스페이먼츠 결제창에서
        <br />
        전자금융거래 약관 동의 후 결제가 진행됩니다.
      </p>

      {errorMsg && (
        <p className="mt-4 text-center text-sm leading-relaxed text-thread">
          {errorMsg}
        </p>
      )}
    </div>
  );
}

/**
 * 토스페이먼츠 결제위젯 (SDK v2).
 * - 금액은 서버(DB)에서 내려준 값만 사용 — 브라우저에서 조작 불가.
 *   (승인 단계에서 서버가 DB 금액과 다시 대조하므로 조작 시 승인 거부)
 * - customerKey는 비회원(ANONYMOUS) — 개인정보를 위젯에 넘기지 않음.
 */
function TossWidgetCheckout({
  clientKey,
  orderNumber,
  amount,
  orderName = ORDER_NAME,
}: {
  clientKey: string;
  orderNumber: string;
  amount: number;
  orderName?: string;
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
        if (!cancelled) {
          setReady(true);
          logPayEvent(orderNumber, "widget_ready");
        }
      } catch (e) {
        logPayEvent(orderNumber, "widget_error", errorCode(e));
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
    logPayEvent(orderNumber, "pay_request");
    try {
      await widgets.requestPayment({
        orderId: orderNumber,
        orderName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
      // Redirect 방식이므로 성공 시 이 아래는 실행되지 않음
    } catch (e) {
      // 구매자가 결제창을 닫은 경우 등 (USER_CANCEL 등 코드로 구분)
      logPayEvent(orderNumber, "pay_request_error", errorCode(e));
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

      <RefundNotice />

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
