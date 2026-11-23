"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  loadTossPayments,
  ANONYMOUS,
  type TossPaymentsWidgets,
} from "@tosspayments/tosspayments-sdk";
import { logPayEvent } from "@/lib/pay-events";
import { inAppName } from "@/components/pay/InAppBrowserNotice";
import PayCancelPopup from "@/components/pay/PayCancelPopup";

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
 * 결제창을 열기 직전, 이 화면의 금액이 지금 주문 금액과 같은지 서버에 확인.
 * 다른 탭에서 상품을 바꿨거나 뒤로가기로 예전 화면이 보이는 경우 → 새로고침해서 최신 금액으로.
 * 확인 자체가 실패하면 결제를 막지 않는다(서버 승인 단계에서 다시 검사함).
 */
async function amountIsCurrent(orderNumber: string, amount: number): Promise<boolean> {
  try {
    const r = await fetch(`/api/orders/price?order=${encodeURIComponent(orderNumber)}`, {
      cache: "no-store",
    });
    if (!r.ok) return true;
    const j = (await r.json()) as { amount?: number; status?: string };
    if (j.status === "paid" || (typeof j.amount === "number" && j.amount !== amount)) {
      window.location.reload();
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

/**
 * 예전 결제 화면 방지:
 * - 뒤로가기로 저장된 화면이 복원되면 새로고침 (버튼 멈춤·옛 금액 방지)
 * - 화면에 다시 돌아올 때마다(다른 탭에서 상품을 바꿨을 수 있음) 금액을 확인
 * 결제 버튼 클릭 흐름에는 끼어들지 않음(결제창 팝업 차단 방지).
 */
function useReloadOnRestore(orderNumber: string, amount: number) {
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void amountIsCurrent(orderNumber, amount);
    };
    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [orderNumber, amount]);
}


/**
 * 결제 화면 이탈 기록 (10/30 요청 1 — 결제 화면 43명 → 결제창 20명)
 * 어디까지 보고 나갔는지: view(진입) → paybtn(결제 버튼이 화면에 보임) → clicked(결제하기 누름) → error
 * 화면을 떠날 때 한 번만 pay_page_leave 로 남긴다 (code 예: paybtn_35s).
 */
type LeaveStage = "view" | "paybtn" | "clicked" | "error";
const STAGE_RANK: Record<LeaveStage, number> = { view: 0, paybtn: 1, clicked: 2, error: 3 };
function useLeaveLog(orderNumber: string) {
  const stage = useRef<LeaveStage>("view");
  const t0 = useRef<number>(0);
  const sent = useRef(false);
  useEffect(() => {
    t0.current = Date.now();
    const send = () => {
      if (sent.current) return;
      sent.current = true;
      const secs = Math.min(3600, Math.round((Date.now() - t0.current) / 1000));
      logPayEvent(orderNumber, "pay_page_leave", `${stage.current}_${secs}s`);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") send();
    };
    window.addEventListener("pagehide", send);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", send);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [orderNumber]);
  return (s: LeaveStage) => {
    if (STAGE_RANK[s] > STAGE_RANK[stage.current]) stage.current = s;
  };
}

/**
 * 결제하기를 눌렀는데 8초가 지나도 결제창으로 넘어가지 않으면(앱 안 브라우저에서 자주 막힘)
 * 안내 문구를 띄우고 pay_timeout 으로 기록한다. 그 사이 화면이 가려지면(결제창·카드앱으로 이동) 띄우지 않음.
 */
const PAY_TIMEOUT_MS = 8000;
function usePayTimeout(orderNumber: string) {
  const [stuck, setStuck] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const left = useRef(false);
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") left.current = true;
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const start = () => {
    left.current = false;
    setStuck(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (left.current || document.visibilityState === "hidden") return;
      setStuck(true);
      logPayEvent(orderNumber, "pay_timeout", inAppName());
    }, PAY_TIMEOUT_MS);
  };
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  return { stuck, start, stop };
}

function PayStuckNotice() {
  return (
    <div className="mt-4 rounded-xl border border-thread/40 bg-thread/5 px-4 py-3 text-center text-[0.8rem] leading-[1.8] text-ivory">
      결제창이 열리지 않나요?
      <br />
      <span className="text-ivory-dim">
        인스타그램·카카오톡 안에서는 결제창이 막힐 수 있어요. 아래 <b className="text-ivory">외부 브라우저로 열기</b>를 누른 뒤 다시 결제해 주세요. 신청 내용과 금액은 그대로 이어집니다.
      </span>
    </div>
  );
}

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
  /** 카톡 분석 등 다른 상품은 자체 승인 화면으로 (기본: 재회 분석 /payment/success) */
  successPath?: string;
  failPath?: string;
  /** 11/16: 결제창 취소 팝업에 보여 줄 첫 구매가 마감 시각·정가 (없으면 안내 생략) */
  offerEndsAt?: number | null;
  regular?: number;
  /** 11/16: 휴대폰 결제창에서 취소하고 돌아온 경우(?cancelled=1) — 들어오자마자 월화 팝업 */
  startCancelled?: boolean;
  /** 11/16: 결제 시트 안에 넣을 때 — 화면 하단 고정 결제 버튼은 시트가 대신한다 */
  hideStickyBar?: boolean;
}) {
  return props.clientKey.includes("_gck_") ? (
    <TossWidgetCheckout {...props} />
  ) : (
    <TossWindowCheckout {...props} />
  );
}

/** 결제창 닫기·취소는 '결제 미완료'로 안내 (주문·선택 상품은 DB에 그대로 남아 있음 — 다시 누르면 같은 금액으로 열림) */
const CANCEL_HINT = /완료되지 않았습니다/;
const CANCEL_CODES = new Set(["USER_CANCEL", "PAY_PROCESS_CANCELED", "PAY_PROCESS_ABORTED"]);
function payErrorMessage(e: unknown): string {
  const code = errorCode(e);
  if (code && CANCEL_CODES.has(code))
    return "결제가 완료되지 않았습니다. 선택한 상품과 신청 내용은 유지됩니다. 다시 결제할 수 있습니다.";
  return e instanceof Error && e.message ? e.message : "결제가 진행되지 않았습니다. 다시 시도해주세요.";
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
  successPath = "/payment/success",
  failPath = "/payment/fail",
  offerEndsAt = null,
  regular,
  startCancelled = false,
  hideStickyBar = false,
}: {
  clientKey: string;
  orderNumber: string;
  amount: number;
  orderName?: string;
  successPath?: string;
  failPath?: string;
  offerEndsAt?: number | null;
  regular?: number;
  startCancelled?: boolean;
  hideStickyBar?: boolean;
}) {
  const paymentRef = useRef<ReturnType<
    Awaited<ReturnType<typeof loadTossPayments>>["payment"]
  > | null>(null);
  const [method, setMethod] = useState<"CARD" | "TRANSFER">("CARD");
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  /* 11/16: 결제창에서 취소하고 돌아오면 월화 팝업 */
  const [cancelOpen, setCancelOpen] = useState(startCancelled);
  /* 새로고침해도 다시 뜨지 않게 주소의 cancelled=1 을 지운다 */
  useEffect(() => {
    if (!startCancelled) return;
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("cancelled");
      window.history.replaceState(window.history.state, "", u.toString());
    } catch {
      /* 무시 */
    }
  }, [startCancelled]);

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

  useReloadOnRestore(orderNumber, amount);
  const markStage = useLeaveLog(orderNumber);
  const payTimeout = usePayTimeout(orderNumber);

  /* 11/23 대표 결정: 카카오페이·네이버페이·토스페이 버튼을 시트에 바로 — 누르면 그 간편결제로 바로 연결 */
  const handlePay = async (easyPay?: "KAKAOPAY" | "NAVERPAY" | "TOSSPAY") => {
    const payment = paymentRef.current;
    if (!payment || paying) return;
    setPaying(true);
    setErrorMsg(null);
    markStage("clicked");
    payTimeout.start();
    logPayEvent(orderNumber, "pay_request", easyPay ? `easy_${easyPay}` : method);
    const common = {
      amount: { currency: "KRW" as const, value: amount },
      orderId: orderNumber,
      orderName,
      successUrl: `${window.location.origin}${successPath}`,
      failUrl: `${window.location.origin}${failPath}`,
    };
    try {
      if (easyPay) {
        await payment.requestPayment({
          ...common,
          method: "CARD",
          card: { useEscrow: false, flowMode: "DIRECT", easyPay },
        });
      } else if (method === "CARD") {
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
      payTimeout.stop();
      markStage("error");
      logPayEvent(orderNumber, "pay_request_error", errorCode(e));
      const msg = payErrorMessage(e);
      setErrorMsg(msg);
      setPaying(false);
      const c = errorCode(e);
      if (c && CANCEL_CODES.has(c)) setCancelOpen(true);
    }
  };

  /* 결제 버튼이 첫 화면 아래(약 1,160px)에 있어, 결제 화면에 온 손님 대부분이 버튼까지 내려오지 않았다
     (10/9: 결제 화면 5명 → 결제창 0명). 버튼이 안 보이는 동안 하단에 같은 버튼을 고정한다. */
  const payBtnRef = useRef<HTMLButtonElement>(null);
  const [payBtnVisible, setPayBtnVisible] = useState(true);
  /* 11/23 지시문 P0-1: 결제 시트 안이면 시트 하단 고정 영역(#pay-sheet-footer)에 결제 버튼을 그린다 */
  const [footerEl, setFooterEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!hideStickyBar) return;
    setFooterEl(document.getElementById("pay-sheet-footer"));
  }, [hideStickyBar]);
  useEffect(() => {
    const el = payBtnRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        setPayBtnVisible(e.isIntersecting);
        if (e.isIntersecting) markStage("paybtn");
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [footerEl]);

  const optionCls = (active: boolean) =>
    `flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors ${
      active
        ? "border-burgundy bg-burgundy/5 text-ivory"
        : "border-gold-dim bg-ink-soft text-ivory-dim"
    }`;

  return (
    <div>
      {/* 11/23 대표 지시: 결제 시트에서는 묘수사주처럼 결제 버튼 4개(2×2)만 — 결제수단 고르기 목록은 숨김 */}
      <div className={footerEl ? "hidden" : "flex flex-col gap-2.5"}>
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

      {!footerEl && <RefundNotice />}

      {(() => {
        const payBlock = (
          <>
            {footerEl ? (
              <div ref={payBtnRef as unknown as React.Ref<HTMLDivElement>} className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ["KAKAOPAY", "카카오페이 결제", "bg-[#fee500] text-[#191919]"],
                    ["NAVERPAY", "네이버페이 결제", "bg-[#03c75a] text-white"],
                    ["TOSSPAY", "토스페이 결제", "bg-[#0064ff] text-white"],
                    ["NORMAL", "일반결제", "bg-burgundy text-white"],
                  ] as const
                ).map(([k, label, cls]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => void handlePay(k === "NORMAL" ? undefined : k)}
                    disabled={!ready || paying}
                    className={`h-12 rounded-xl text-[0.92rem] font-extrabold transition-opacity active:opacity-85 disabled:opacity-50 ${cls}`}
                  >
                    {paying ? "여는 중…" : label}
                  </button>
                ))}
              </div>
            ) : (
              <button
                ref={payBtnRef}
                type="button"
                onClick={() => void handlePay()}
                disabled={!ready || paying}
                className="sticky bottom-3 z-10 mt-6 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-opacity active:opacity-85 disabled:opacity-50"
              >
                {paying ? "결제창을 여는 중…" : ready ? `${amount.toLocaleString()}원 결제하기` : "결제 화면 불러오는 중…"}
              </button>
            )}
            {errorMsg && footerEl && (
              <div className="mt-2 text-center text-[0.78rem] leading-[1.6] text-thread">
                <p>{errorMsg}</p>
                {!CANCEL_HINT.test(errorMsg) && (
                  <p className="mt-1 text-[0.72rem] text-ivory-dim">
                    다시 눌러도 안 열리면 오른쪽 위 ⋯ → 외부 브라우저로 열기를 눌러 주세요.
                  </p>
                )}
              </div>
            )}
            {footerEl ? (
              <p className="mt-2 text-center text-[0.66rem] leading-[1.7] text-ivory-dim/75">
                결제 정보를 확인했으며 결제 진행에 동의합니다 · 결과를 열기 전이면 7일 안 전액 환불 ·{" "}
                <Link href="/refund" target="_blank" className="underline underline-offset-2">
                  환불정책
                </Link>
                <br />
                일반결제: 카드·삼성페이 등 · 1회 결제, 정기결제 없음
              </p>
            ) : (
              <p className="mt-3 text-center text-[0.68rem] leading-[1.8] text-ivory-dim/60">
                결제하기를 누르면 토스페이먼츠 결제창에서
                <br />
                전자금융거래 약관 동의 후 결제가 진행됩니다.
              </p>
            )}
          </>
        );
        return footerEl ? createPortal(payBlock, footerEl) : payBlock;
      })()}

      {cancelOpen && (
        <PayCancelPopup
          orderNumber={orderNumber}
          amount={amount}
          offerEndsAt={offerEndsAt}
          regular={regular}
          onRetry={() => {
            setCancelOpen(false);
            /* 결제 수단이 아직 준비 전이면 결제 버튼으로 안내 */
            if (ready) void handlePay();
            else document.getElementById("pay-anchor")?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          onClose={() => setCancelOpen(false)}
        />
      )}
      {errorMsg && !footerEl && (
        <p className="mt-4 text-center text-sm leading-relaxed text-thread">
          {errorMsg}
        </p>
      )}
      {payTimeout.stuck && !errorMsg && <PayStuckNotice />}

      {typeof document !== "undefined" &&
        !hideStickyBar &&
        createPortal(
          <div
            className={`paper fixed inset-x-0 bottom-0 z-40 border-t border-gold-dim bg-ink/95 px-4 pt-3 backdrop-blur transition-transform duration-300 ${
              !payBtnVisible && ready ? "translate-y-0" : "translate-y-full"
            }`}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
            aria-hidden={payBtnVisible}
          >
            <button
              type="button"
              tabIndex={payBtnVisible ? -1 : 0}
              onClick={() => void handlePay()}
              disabled={!ready || paying}
              className="mx-auto flex h-12 w-full max-w-md items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.92rem] font-semibold text-ivory active:opacity-85 disabled:opacity-50"
            >
              {paying ? "결제창을 여는 중…" : `${amount.toLocaleString()}원 결제하기`}
            </button>
            <p className="mx-auto mt-1.5 max-w-md text-center text-[0.66rem] text-ivory-dim/80">
              {method === "CARD" ? "카드 · 간편결제" : "계좌이체"} · 1회 결제 · 정기결제 없음
            </p>
          </div>,
          document.body
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
  successPath = "/payment/success",
  failPath = "/payment/fail",
  offerEndsAt = null,
  regular,
  startCancelled = false,
}: {
  clientKey: string;
  orderNumber: string;
  amount: number;
  orderName?: string;
  successPath?: string;
  failPath?: string;
  offerEndsAt?: number | null;
  regular?: number;
  startCancelled?: boolean;
  hideStickyBar?: boolean;
}) {
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  /* 11/16: 결제창에서 취소하고 돌아오면 월화 팝업 */
  const [cancelOpen, setCancelOpen] = useState(startCancelled);
  /* 새로고침해도 다시 뜨지 않게 주소의 cancelled=1 을 지운다 */
  useEffect(() => {
    if (!startCancelled) return;
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("cancelled");
      window.history.replaceState(window.history.state, "", u.toString());
    } catch {
      /* 무시 */
    }
  }, [startCancelled]);

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

  useReloadOnRestore(orderNumber, amount);
  const markStage = useLeaveLog(orderNumber);
  const payTimeout = usePayTimeout(orderNumber);

  const handlePay = async () => {
    const widgets = widgetsRef.current;
    if (!widgets || paying) return;
    setPaying(true);
    setErrorMsg(null);
    markStage("clicked");
    payTimeout.start();
    logPayEvent(orderNumber, "pay_request");
    try {
      await widgets.requestPayment({
        orderId: orderNumber,
        orderName,
        successUrl: `${window.location.origin}${successPath}`,
        failUrl: `${window.location.origin}${failPath}`,
      });
      // Redirect 방식이므로 성공 시 이 아래는 실행되지 않음
    } catch (e) {
      // 구매자가 결제창을 닫은 경우 등 (USER_CANCEL 등 코드로 구분)
      payTimeout.stop();
      markStage("error");
      logPayEvent(orderNumber, "pay_request_error", errorCode(e));
      const msg = payErrorMessage(e);
      setErrorMsg(msg);
      setPaying(false);
      const c = errorCode(e);
      if (c && CANCEL_CODES.has(c)) setCancelOpen(true);
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
        className="sticky bottom-3 z-10 mt-6 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-opacity active:opacity-85 disabled:opacity-50"
      >
        {paying
          ? "결제창을 여는 중…"
          : ready
            ? `${amount.toLocaleString()}원 결제하기`
            : "결제 화면 불러오는 중…"}
      </button>

      {cancelOpen && (
        <PayCancelPopup
          orderNumber={orderNumber}
          amount={amount}
          offerEndsAt={offerEndsAt}
          regular={regular}
          onRetry={() => {
            setCancelOpen(false);
            /* 결제 수단이 아직 준비 전이면 결제 버튼으로 안내 */
            if (ready) void handlePay();
            else document.getElementById("pay-anchor")?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          onClose={() => setCancelOpen(false)}
        />
      )}
      {errorMsg && (
        <p className="mt-4 text-center text-sm leading-relaxed text-thread">
          {errorMsg}
        </p>
      )}
      {payTimeout.stuck && !errorMsg && <PayStuckNotice />}

    </div>
  );
}
