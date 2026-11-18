"use client";

/**
 * 11/16 요청: 결제 화면 하단 [결제하기] → 아래에서 올라오는 결제 시트.
 * - 시트 안: 할인 배지 · 패키지 할인 혜택(리추얼 / 월화 패키지) · 금액 내역(판매가 → 지금 결제 시 할인 → 최종 구매가) · 결제수단 · 결제 버튼
 * - 오른쪽 위 X → 첫 구매 할인이 적용 중이면 '할인 사라짐' 카드 (실제 마감 시각 기준 · 지어낸 마감 없음)
 * - 상품을 바꾸면 서버가 금액을 다시 정한다(링크 방식) — 주소에 sheet=1 을 붙여 시트를 연 채로 돌아온다.
 * - 결제수단 영역(TossCheckout)은 시트가 닫혀 있어도 항상 DOM에 있다(토스 위젯 초기화가 끊기지 않게).
 */
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { logPayEvent } from "@/lib/pay-events";
import HoldCard from "./HoldCard";

type Option = {
  key: "message" | "bundle";
  name: string;
  desc: string;
  price: number;
  regular: number;
  badge?: string;
};

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function PaySheet({
  orderNumber,
  title,
  current,
  amount,
  regular,
  options,
  offerEndsAt,
  startOpen = false,
  extraQuery = "",
  children,
  open: openProp,
  onOpenChange,
  showBar = true,
  onSelect,
  busy = false,
}: {
  orderNumber: string;
  title: string;
  current: "message" | "bundle";
  amount: number;
  regular: number;
  options: Option[];
  offerEndsAt: number | null;
  startOpen?: boolean;
  extraQuery?: string;
  /** 결제수단 + 결제 버튼 (TossCheckout) */
  children: ReactNode;
  /** 11/17: 미리보기 화면에서 쓸 때 — 바깥에서 열고 닫음 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 화면 하단 고정 [결제하기] 버튼 (미리보기에서는 미리보기 자체 버튼을 씀) */
  showBar?: boolean;
  /** 상품 바꾸기 — 주면 링크 대신 이 함수를 부름(화면 이동 없이) */
  onSelect?: (key: "message" | "bundle") => void;
  /** 상품을 바꾸는 중 */
  busy?: boolean;
}) {
  const [openState, setOpenState] = useState(startOpen);
  const open = openProp ?? openState;
  const setOpen = (v: boolean) => {
    if (openProp === undefined) setOpenState(v);
    onOpenChange?.(v);
  };
  const [warn, setWarn] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const saved = Math.max(0, regular - amount);
  const remain = offerEndsAt ? offerEndsAt - now : 0;
  const offerOn = !!offerEndsAt && remain > 0 && saved > 0;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* 시트가 열려 있는 동안 뒤 화면 스크롤 막기 */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  /* 상품을 바꾸고 돌아온 주소의 sheet=1 은 지워 둔다(새로고침 때 저절로 열리지 않게) */
  useEffect(() => {
    if (!startOpen) return;
    setOpen(true);
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("sheet");
      window.history.replaceState(window.history.state, "", u.toString());
    } catch {
      /* 무시 */
    }
  }, [startOpen, current]);

  const openSheet = () => {
    setOpen(true);
    logPayEvent(orderNumber, "pay_sheet", "open");
  };
  const pressX = () => {
    if (offerOn) {
      setWarn(true);
      logPayEvent(orderNumber, "pay_sheet", "x_warn");
    } else {
      setOpen(false);
      logPayEvent(orderNumber, "pay_sheet", "close");
    }
  };

  const base = `/apply/complete?order=${encodeURIComponent(orderNumber)}`;

  return (
    <>
      {/* 화면 하단 고정 버튼 — 누르면 결제 시트 */}
      {showBar && (
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gold-dim bg-ink/95 px-4 pt-3 backdrop-blur"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
      >
        <button
          type="button"
          onClick={openSheet}
          className="mx-auto flex h-[52px] w-full max-w-md items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.98rem] font-semibold text-ivory active:opacity-85"
        >
          {amount.toLocaleString()}원 결제하기
        </button>
        <p className="mt-1.5 text-center text-[0.7rem] text-ivory-dim">
          {offerOn ? (
            <>
              첫 구매 혜택 종료까지 <b className="tabular-nums text-thread">{clock(remain)}</b>
            </>
          ) : (
            "카드 · 간편결제 · 1회 결제 · 정기결제 없음"
          )}
        </p>
      </div>
      )}

      {/* 결제 시트 */}
      <div
        className={`fixed inset-0 z-[80] transition-opacity duration-200 ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden={!open}
      >
        <div className="absolute inset-0 bg-black/55" onClick={pressX} />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pay-sheet-title"
          className={`absolute inset-x-0 bottom-0 mx-auto max-h-[90svh] w-full max-w-[560px] overflow-y-auto rounded-t-[1.75rem] bg-ink px-5 pt-6 shadow-[0_-12px_40px_rgba(0,0,0,0.35)] transition-transform duration-300 ${
            open ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="pay-sheet-title" className="text-[1.3rem] font-bold leading-snug text-ivory">
              {title} 결제하기
            </h2>
            <button type="button" onClick={pressX} aria-label="닫기" className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center text-[1.35rem] text-ivory-dim">
              ✕
            </button>
          </div>
          {saved > 0 && offerOn && (
            <p className="mt-2 inline-block rounded-full bg-thread/10 px-3 py-1.5 text-[0.84rem] font-semibold text-ivory">
              총 <b className="text-thread">{saved.toLocaleString()}원</b> 할인받았어요!
              <span className="ml-1.5 font-normal tabular-nums text-ivory-dim">· {clock(remain)} 남음</span>
            </p>
          )}

          {options.length > 1 && (
            <>
              <p className="mt-6 text-[0.86rem] font-semibold text-ivory-dim">패키지 할인 혜택 🎁</p>
              <div className="mt-2.5 flex flex-col gap-2.5">
                {options.map((o) => {
                  const on = o.key === current;
                  const pct = o.regular > o.price ? Math.round(((o.regular - o.price) / o.regular) * 100) : 0;
                  const inner = (
                    <div
                      className={`rounded-2xl border px-4 py-3.5 transition-colors ${
                        on ? "border-2 border-ivory bg-ink-soft" : "border-gold-dim/40 bg-ink-soft/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[0.98rem] font-semibold text-ivory">{o.name}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.76rem] leading-[1.5] text-ivory-dim">
                            {o.badge && <span className="rounded-full bg-thread/12 px-2 py-0.5 text-[0.68rem] font-semibold text-thread">{o.badge}</span>}
                            {o.desc}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {pct > 0 && (
                            <p className="text-[0.76rem]">
                              <b className="text-thread">{pct}%</b>{" "}
                              <span className="text-ivory-dim line-through">{o.regular.toLocaleString()}원</span>
                            </p>
                          )}
                          <p className="font-display text-[1.15rem] font-semibold text-ivory">{o.price.toLocaleString()}원</p>
                        </div>
                      </div>
                    </div>
                  );
                  return on ? (
                    <div key={o.key} aria-current="true">
                      {inner}
                    </div>
                  ) : onSelect ? (
                    <button
                      key={o.key}
                      type="button"
                      disabled={busy}
                      onClick={() => onSelect(o.key)}
                      className="block w-full text-left active:opacity-85 disabled:opacity-60"
                    >
                      {inner}
                    </button>
                  ) : (
                    <Link key={o.key} href={`${base}&product=${o.key}&changed=1&sheet=1${extraQuery}`} scroll={false} className="block active:opacity-85">
                      {inner}
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          <dl className="mt-5 space-y-2 text-[0.92rem]">
            <div className="flex justify-between">
              <dt className="text-ivory-dim">상품 판매가</dt>
              <dd className="text-ivory">{regular.toLocaleString()}원</dd>
            </div>
            {saved > 0 && (
              <div className="flex justify-between">
                <dt className="text-thread">{offerOn ? "첫 구매 할인" : "할인"}</dt>
                <dd className="text-thread">-{saved.toLocaleString()}원</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-gold-dim/30 pt-3">
              <dt className="font-semibold text-ivory">최종 구매가</dt>
              <dd className="font-display text-[1.3rem] font-bold text-ivory">{amount.toLocaleString()}원</dd>
            </div>
          </dl>

          <div id="pay-anchor" className={`mt-5 transition-opacity ${busy ? "pointer-events-none opacity-50" : ""}`}>
            {children}
          </div>
        </div>

        {/* X → 할인 사라짐 카드 (11/17: 월화 영상 + 큰 타이머) */}
        {warn && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 px-5">
            <HoldCard
              saved={saved}
              offerEndsAt={offerEndsAt}
              regular={regular}
              stayLabel={offerOn ? "할인 받고 계속하기" : `${amount.toLocaleString()}원 결제 계속하기`}
              onStay={() => {
                setWarn(false);
                logPayEvent(orderNumber, "pay_sheet", "warn_stay");
              }}
              onLeave={() => {
                setWarn(false);
                setOpen(false);
                logPayEvent(orderNumber, "pay_sheet", "warn_close");
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}
