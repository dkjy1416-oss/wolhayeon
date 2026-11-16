"use client";

/**
 * 11/17 운영자 요청: '주문 확인' 화면 없이, 미리보기에서 [결제하기]를 누르면 그 자리에서 결제 시트가 아래에서 올라온다.
 * - 결제 정보·상품 변경은 /api/orders/checkout (서버가 금액을 정함)
 * - 결제창에서 취소하고 돌아오면(?cancelled=1) 시트를 다시 열고 월화 팝업
 * - 관리자 로그인 + 운영자 테스트 주문이면 '관리자 무료로 전체 결과 보기'
 */
import { useCallback, useEffect, useRef, useState } from "react";
import PaySheet from "@/components/pay/PaySheet";
import TossCheckout from "@/components/pay/TossCheckout";
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
}: {
  orderNumber: string;
  open: boolean;
  product: "message" | "bundle";
  startCancelled?: boolean;
  onClose: () => void;
}) {
  const clientKey = (process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "").trim();
  const [data, setData] = useState<Ready | null>(null);
  const [want, setWant] = useState<"message" | "bundle">(product);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [freeBusy, setFreeBusy] = useState(false);
  const viewed = useRef(false);

  useEffect(() => setWant(product), [product, open]);

  const load = useCallback(
    async (p: "message" | "bundle") => {
      setBusy(true);
      setErr(null);
      try {
        const r = await fetch(`/api/orders/checkout?order=${encodeURIComponent(orderNumber)}&product=${p}`, { cache: "no-store" });
        const j = await r.json();
        if (j?.ok && typeof j.redirect === "string") {
          window.location.href = j.redirect;
          return;
        }
        if (!j?.ok) {
          setErr("결제 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
          return;
        }
        setData(j as Ready);
      } catch {
        setErr("결제 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      } finally {
        setBusy(false);
      }
    },
    [orderNumber]
  );

  useEffect(() => {
    if (!open) return;
    if (!data || data.product !== want) void load(want);
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

  return (
    <PaySheet
      orderNumber={orderNumber}
      title={ready?.title ?? (want === "bundle" ? "월화 패키지" : "월화의 관계 리추얼")}
      current={cur}
      amount={ready?.amount ?? 0}
      regular={ready?.regular ?? 0}
      offerEndsAt={ready?.offerEndsAt ?? null}
      options={
        ready && ready.bookSales
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
    >
      {err && <p className="mb-3 rounded-xl bg-thread/10 px-4 py-3 text-center text-[0.84rem] text-thread">{err}</p>}
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
  );
}
