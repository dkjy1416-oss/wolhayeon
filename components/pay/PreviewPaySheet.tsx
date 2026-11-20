"use client";

/**
 * 11/17 운영자 요청: '주문 확인' 화면 없이, 미리보기에서 [결제하기]를 누르면 그 자리에서 결제 시트가 아래에서 올라온다.
 * - 결제 정보·상품 변경은 /api/orders/checkout (서버가 금액을 정함)
 * - 결제창에서 취소하고 돌아오면(?cancelled=1) 시트를 다시 열고 월화 팝업
 * - 관리자 로그인 + 운영자 테스트 주문이면 '관리자 무료로 전체 결과 보기'
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PaySheet from "@/components/pay/PaySheet";
import TossCheckout from "@/components/pay/TossCheckout";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { preconnect } from "react-dom";
import InAppBrowserNotice from "@/components/pay/InAppBrowserNotice";
import { logPayEvent } from "@/lib/pay-events";
import { RITUAL_REGULAR_PRICE_KRW, BUNDLE_REGULAR_PRICE_KRW } from "@/lib/ritual-types";

type Ready = {
  ok: true;
  status: string;
  product: "message" | "bundle" | "book";
  amount: number;
  amountValid: boolean;
  regular: number;
  orderName: string;
  title: string;
  messagePrice: number;
  bundlePrice: number;
  offerEndsAt: number | null;
  paymentsOpen: boolean;
  bookSales: boolean;
  adminFree: boolean;
};

export default function PreviewPaySheet({
  orderNumber,
  open,
  product,
  startCancelled = false,
  onClose,
  highlights = [],
}: {
  orderNumber: string;
  open: boolean;
  product: "message" | "bundle";
  startCancelled?: boolean;
  onClose: () => void;
  /** 11/20: 유형별 핵심 결과 3개 */
  highlights?: string[];
}) {
  const clientKey = (process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "").trim();
  const [data, setData] = useState<Ready | null>(null);
  const [want, setWant] = useState<"message" | "bundle">(product);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [freeBusy, setFreeBusy] = useState(false);
  const viewed = useRef(false);

  useEffect(() => setWant(product), [product, open]);

  /* 11/21: 결제 시트가 늦게 뜬다 → 미리보기를 보는 동안 결제 정보와 토스 결제 모듈을 미리 준비해 둔다.
     (미리 불러온 것은 관리자 퍼널에 기록하지 않음 — 시트를 열 때만 pay_sheet_ready 기록) */
  const fetchedAt = useRef(0);
  const prefetched = useRef(false);
  const load = useCallback(
    async (p: "message" | "bundle", silent = false) => {
      if (!silent) setBusy(true);
      setErr(null);
      try {
        const r = await fetch(`/api/orders/checkout?order=${encodeURIComponent(orderNumber)}&product=${p}`, { cache: "no-store" });
        const j = await r.json();
        if (j?.ok && typeof j.redirect === "string") {
          window.location.href = j.redirect;
          return;
        }
        if (!j?.ok) {
          if (silent) return;
          setErr("결제 정보를 불러오지 못했어요. 다시 시도해 주세요.");
          logPayEvent(orderNumber, "pay_sheet_ready", "error");
          return;
        }
        setData(j as Ready);
        fetchedAt.current = Date.now();
        if (!silent) logPayEvent(orderNumber, "pay_sheet_ready", p);
      } catch {
        if (silent) return;
        setErr("결제 정보를 불러오지 못했어요. 다시 시도해 주세요.");
        logPayEvent(orderNumber, "pay_sheet_ready", "error");
      } finally {
        if (!silent) setBusy(false);
      }
    },
    [orderNumber]
  );

  /* 화면에 들어오고 잠시 뒤(첫 화면 그리기를 방해하지 않게) 미리 준비 */
  useEffect(() => {
    try {
      preconnect("https://js.tosspayments.com");
      preconnect("https://api.tosspayments.com");
      preconnect("https://pay.toss.im");
    } catch {
      /* 무시 */
    }
    const t = window.setTimeout(() => {
      if (prefetched.current) return;
      prefetched.current = true;
      if (clientKey) loadTossPayments(clientKey).catch(() => {});
      void load(product, true);
    }, 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!data || data.product !== want) void load(want);
    else {
      /* 미리 받아 둔 정보로 바로 그리고, 오래됐으면 조용히 새로 받기 */
      logPayEvent(orderNumber, "pay_sheet_ready", want);
      if (Date.now() - fetchedAt.current > 120_000) void load(want, true);
    }
    /* 결제 화면 도달 기록(관리자 퍼널 '결제 화면') — 열 때 한 번 */
    if (!viewed.current) {
      viewed.current = true;
      logPayEvent(orderNumber, "pay_page_view", "sheet");
    }
    logPayEvent(orderNumber, "pay_sheet", "open");
    /* 결제창(휴대폰은 새 화면)에서 취소하면 이 미리보기로 돌아오게 주소를 기억 */
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("cancelled");
      sessionStorage.setItem(`wh_pay_return_${orderNumber}`, u.toString());
    } catch {
      /* 저장 안 되면 결제 화면으로 돌아감 */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, want]);

  const select = (k: "message" | "bundle") => {
    if (k === want) return;
    setWant(k);
  };

  const freePass = async () => {
    if (freeBusy) return;
    setFreeBusy(true);
    try {
      const r = await fetch("/api/admin/free-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber }),
      });
      const j = await r.json().catch(() => null);
      if (j?.ok && typeof j.redirect === "string") window.location.href = j.redirect;
      else setErr("관리자 무료 보기를 처리하지 못했어요.");
    } finally {
      setFreeBusy(false);
    }
  };

  const ready = data && data.product !== "book" ? data : null;
  /* 취소 복귀 팝업은 처음 그린 결제 영역에서 한 번만 (상품을 바꿔 다시 그릴 때 또 뜨지 않게) */
  const firstKey = useRef<string | null>(null);
  const tossKey = ready ? `${ready.product}-${ready.amount}` : "";
  if (ready && firstKey.current === null) firstKey.current = tossKey;
  const cur = (ready?.product ?? want) as "message" | "bundle";

  /* 미리보기 화면의 fade-in(transform) 안에서는 fixed 가 화면이 아니라 페이지 맨 아래에 붙는다
     → 시트는 body 바로 아래에 그린다 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="paper">
    <PaySheet
      orderNumber={orderNumber}
      title={ready?.title ?? (want === "bundle" ? "월화 패키지" : "월화의 관계 리추얼")}
      current={cur}
      amount={ready?.amount ?? 0}
      regular={ready?.regular ?? 0}
      offerEndsAt={ready?.offerEndsAt ?? null}
      options={
        /* 11/20 지시문 v3: 기본 흐름에서 39,900원 패키지 제외 — 패키지로 들어온 손님에게만 선택지 */
        ready && ready.bookSales && product === "bundle"
          ? [
              {
                key: "message",
                name: "월화의 관계 리추얼",
                desc: "사연 읽기 · 월화의 편지 · 나만의 리추얼 · 21일 가이드",
                price: ready.messagePrice,
                regular: RITUAL_REGULAR_PRICE_KRW,
              },
              {
                key: "bundle",
                name: "월화의 관계 리추얼 + PDF 책",
                desc: "리추얼 전부 + 내 사연으로 만든 PDF 책 약 120쪽",
                price: ready.bundlePrice,
                regular: BUNDLE_REGULAR_PRICE_KRW,
                badge: "추천",
              },
            ]
          : []
      }
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      showBar={false}
      onSelect={select}
      busy={busy}
      highlights={want === "bundle" && cur === "bundle" ? [] : highlights}
    >
      {err && (
        <div className="mb-3 rounded-xl bg-thread/10 px-4 py-3 text-center text-[0.84rem] text-thread">
          <p>{err}</p>
          <button
            type="button"
            onClick={() => void load(want)}
            disabled={busy}
            className="mt-2 min-h-11 rounded-full border border-thread/50 px-5 text-[0.84rem] font-semibold disabled:opacity-60"
          >
            {busy ? "다시 불러오는 중…" : "다시 시도"}
          </button>
        </div>
      )}
      {!ready ? (
        <p className="py-6 text-center text-[0.86rem] text-ivory-dim">{busy ? "결제 정보를 불러오는 중…" : ""}</p>
      ) : ready.status === "paid" ? (
        <p className="py-6 text-center text-[0.9rem] text-ivory">이미 결제가 끝난 주문이에요. 결과는 메일의 링크로 열 수 있어요.</p>
      ) : !ready.paymentsOpen || !clientKey || !ready.amountValid ? (
        <p className="py-6 text-center text-[0.9rem] text-ivory-dim">지금은 결제를 진행할 수 없어요. 잠시 후 다시 시도해 주세요.</p>
      ) : (
        <>
          {ready.adminFree && (
            <button
              type="button"
              onClick={freePass}
              disabled={freeBusy}
              className="mb-4 flex h-12 w-full items-center justify-center rounded-full border-2 border-dashed border-thread/60 text-[0.9rem] font-semibold text-thread disabled:opacity-60"
            >
              {freeBusy ? "처리 중…" : "관리자 · 결제 없이 전체 결과 보기"}
            </button>
          )}
          <InAppBrowserNotice orderNumber={orderNumber} />
          <TossCheckout
            key={tossKey}
            clientKey={clientKey}
            orderNumber={orderNumber}
            amount={ready.amount}
            orderName={ready.orderName}
            offerEndsAt={ready.offerEndsAt}
            regular={ready.regular}
            startCancelled={startCancelled && tossKey === firstKey.current}
            hideStickyBar
          />
        </>
      )}
    </PaySheet>
    </div>,
    document.body
  );
}
