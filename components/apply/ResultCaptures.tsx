"use client";

/**
 * 결제하면 받는 실제 결과 화면 예시 (운영자 테스트 주문 캡처 · 첫 줄만 선명, 나머지 흐림).
 *
 * 11/20 지시문 v3:
 * - 카드를 누르면 구매창이 아니라 "크게 보기"가 열린다. 구매는 확대 화면 안의 별도 버튼으로만.
 * - 확대 열람은 결제 클릭으로 세지 않는다 (paid_example_opened 로 따로 기록).
 * - 닫으면 보던 위치 그대로 (페이지 스크롤을 건드리지 않는 고정 오버레이).
 * - 거리두기·안전(boundary) 유형에는 '연락' 예시와 연락 시점 문구를 보이지 않는다.
 * - 고객 사연·개인정보 아님 — "다른 사연 예시"라고 화면에 분명히 표시.
 */
import { useEffect, useRef, useState } from "react";
import { logPayEvent } from "@/lib/pay-events";

type Kind = "contact" | "lover" | "boundary";

const SHOTS = [
  { k: "24h", src: "/images/result/result-24h.webp", t: "앞으로 24시간", d: "오늘 밤부터 내일 이 시간까지 할 일 · 피할 일" },
  { k: "7d", src: "/images/result/result-7d.webp", t: "앞으로 7일", d: "일주일 동안 지킬 내 원칙 · 지켜볼 신호" },
  { k: "plan", src: "/images/result/result-plan.webp", t: "상황별 대응", d: "접근 방식과 첫 문장 초안, 반응별 다음 행동" },
  { k: "21d", src: "/images/result/result-21d.webp", t: "21일 가이드", d: "하루 하나씩, 21일치 행동과 질문" },
] as const;

export default function ResultCaptures({
  orderNumber,
  name,
  stanceLabel,
  kind,
  buyLabel,
  onBuy,
}: {
  orderNumber: string;
  name: string | null;
  stanceLabel: string;
  period?: string;
  kind: Kind;
  /** 결제 오픈 상태일 때만 확대 화면에 구매 버튼 */
  buyLabel: string | null;
  onBuy: (k: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState<string | null>(null);
  const shots = kind === "boundary" ? SHOTS.filter((s) => s.k !== "plan") : SHOTS;
  const cur = shots.find((s) => s.k === open) ?? null;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([en]) => {
        if (en.isIntersecting) {
          logPayEvent(orderNumber, "example_seen", "capture");
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [orderNumber]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const openShot = (k: string) => {
    setOpen(k);
    logPayEvent(orderNumber, "paid_example_opened", k);
  };

  const who = name ? `${name}님` : "내";

  return (
    <div ref={ref}>
      <p className="text-[0.76rem] font-semibold tracking-wider text-gold">결제하면 받는 실제 결과 화면 (예시)</p>
      <p className="mt-1.5 break-keep font-display text-[1.18rem] font-bold leading-snug text-ivory">
        {kind === "boundary" ? "앞으로 24시간, 7일, 21일 — 내가 지킬 행동을 정리해 드려요" : "앞으로 24시간, 7일 — 무엇을 할지 정리해 드려요"}
      </p>
      <p className="mt-1.5 text-[0.84rem] leading-[1.7] text-ivory-dim">눌러서 크게 볼 수 있어요 · 다른 사연(예시)의 실제 결과 화면이에요</p>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {shots.map((s, i) => (
          <button
            key={s.k}
            type="button"
            onClick={() => openShot(s.k)}
            aria-label={`${s.t} 예시 크게 보기`}
            className="relative overflow-hidden rounded-2xl border border-gold-dim bg-[#0c0b0d] text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.src}
              alt=""
              width={800}
              height={1000}
              loading={i < 2 ? "eager" : "lazy"}
              className="block aspect-[4/5] w-full object-cover object-top"
            />
            <span className="absolute left-2 top-2 rounded-full bg-[#7a2335] px-2 py-0.5 text-[0.68rem] font-semibold text-[#f7f0e8]">
              {s.t}
            </span>
            <span className="absolute inset-x-0 bottom-0 block bg-gradient-to-t from-[#0c0b0d] via-[#0c0b0d]/90 to-transparent px-2.5 pb-2.5 pt-8">
              <span className="block text-[0.74rem] leading-[1.45] text-[#f7f0e8]">{s.d}</span>
              <span className="mt-1 block text-[0.68rem] text-[#cfc4bd]">🔍 크게 보기</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-burgundy/40 bg-[#f6e9ec] px-4 py-3">
        <p className="text-[0.86rem] leading-[1.7] text-ivory">
          {who} 미리보기 기준은 <b className="text-burgundy">{stanceLabel}</b>
        </p>
        <p className="mt-1 text-[0.8rem] leading-[1.7] text-ivory-dim">
          {kind === "boundary"
            ? `전체 결과에서는 ${who} 사연으로 24시간 할 일, 7일 원칙, 흔들릴 때 할 행동, 21일 가이드를 새로 써 드려요.`
            : `전체 결과에서는 ${who} 사연으로 24시간 할 일, 7일 원칙, 상황별 대응, 21일 가이드를 새로 써 드려요.`}
        </p>
      </div>

      {cur && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${cur.t} 결과 화면 예시`}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 sm:items-center"
          onClick={() => setOpen(null)}
        >
          <div
            className="flex max-h-[92dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-2xl bg-[#f7f0e8] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-2">
              <p className="text-[0.9rem] font-semibold text-[#2a2326]">
                {cur.t} <span className="text-[0.74rem] font-normal text-[#6b5f63]">· 다른 사연 예시</span>
              </p>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(null)}
                className="min-h-11 min-w-11 rounded-full text-[1.2rem] text-[#2a2326]"
                aria-label="예시 닫기"
              >
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-[#0c0b0d]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cur.src} alt={`${cur.t} — 결과 화면 예시 (첫 부분만 선명, 나머지 흐림)`} className="block w-full" />
            </div>
            <div className="border-t border-black/10 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
              <p className="text-[0.76rem] leading-[1.6] text-[#6b5f63]">
                실제 결과는 {who} 사연으로 새로 만들어져요. 이 화면은 다른 사연의 예시예요.
              </p>
              {buyLabel && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(null);
                    onBuy(cur.k);
                  }}
                  className="mt-2.5 min-h-12 w-full rounded-xl bg-[#7a2335] px-4 py-3 text-[0.95rem] font-semibold text-[#f7f0e8]"
                >
                  {buyLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
