"use client";

/**
 * 11/17 운영자 요청 — "미리보기가 너무 짧다. 실제로 받는 결과물을 캡처해서 흐리게 보여줘라.
 * 특히 24시간 안에·7일 안에 무엇을 해야 하는지가 제일 중요하다."
 *
 * - 운영자 테스트 주문의 실제 결과 화면을 캡처(첫 줄만 선명, 나머지 흐림)한 이미지
 * - 고객 사연·개인정보 아님 — "다른 사연 예시"라고 화면에 분명히 표시
 * - 고객 본인의 24시간·7일 가이드는 결제 후 그 사연으로 새로 만들어진다 (약속을 늘리지 않음)
 */
import { useEffect, useRef } from "react";
import { logPayEvent } from "@/lib/pay-events";

const SHOTS = [
  { k: "24h", src: "/images/result/result-24h.webp", t: "앞으로 24시간", d: "오늘 밤부터 내일 이 시간까지 할 일 · 참을 일" },
  { k: "7d", src: "/images/result/result-7d.webp", t: "앞으로 7일", d: "일주일 동안 지킬 내 원칙 · 지켜볼 신호" },
  { k: "plan", src: "/images/result/result-plan.webp", t: "연락의 순서", d: "언제, 어떤 방식으로, 몇 줄로 보낼지" },
  { k: "21d", src: "/images/result/result-21d.webp", t: "21일 회복 여정", d: "하루 하나씩, 21일치 행동과 질문" },
] as const;

export default function ResultCaptures({
  orderNumber,
  name,
  stanceLabel,
  period,
  onTap,
}: {
  orderNumber: string;
  name: string | null;
  stanceLabel: string;
  period: string;
  onTap: (k: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
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

  const who = name ? `${name}님` : "내";

  return (
    <div ref={ref}>
      <p className="text-[0.76rem] font-semibold tracking-wider text-gold">결제하면 받는 실제 결과 화면</p>
      <p className="mt-1.5 break-keep font-display text-[1.18rem] font-bold leading-snug text-ivory">
        지금 24시간, 앞으로 7일 — 무엇을 할지까지 정해 드려요
      </p>
      <p className="mt-1.5 text-[0.84rem] leading-[1.7] text-ivory-dim">옆으로 넘겨 보세요 · 다른 사연(예시)의 실제 결과 화면이에요</p>

      <div className="-mx-6 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none]">
        {SHOTS.map((s, i) => (
          <button
            key={s.k}
            type="button"
            onClick={() => onTap(s.k)}
            className="relative w-[76%] max-w-[300px] shrink-0 snap-start overflow-hidden rounded-2xl border border-gold-dim bg-[#0c0b0d] text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.src}
              alt={`${s.t} — 결과 화면 예시 (일부 흐림)`}
              width={800}
              height={1000}
              loading={i < 2 ? "eager" : "lazy"}
              className="block aspect-[4/5] w-full object-cover object-top"
            />
            <span className="absolute left-2.5 top-2.5 rounded-full bg-[#7a2335] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[#f7f0e8]">
              {i + 1} · {s.t}
            </span>
            <span className="absolute inset-x-0 bottom-0 block bg-gradient-to-t from-[#0c0b0d] via-[#0c0b0d]/90 to-transparent px-3.5 pb-3 pt-10">
              <span className="block text-[0.8rem] leading-[1.5] text-[#f7f0e8]">{s.d}</span>
              <span className="mt-1 block text-[0.72rem] text-[#cfc4bd]">🔒 결제 후 내 사연으로 열려요</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-burgundy/40 bg-[#f6e9ec] px-4 py-3">
        <p className="text-[0.86rem] leading-[1.7] text-ivory">
          {who} 미리보기 기준은 <b className="text-burgundy">{stanceLabel}</b>
          {period ? ` · ${period}` : ""}.
        </p>
        <p className="mt-1 text-[0.8rem] leading-[1.7] text-ivory-dim">
          전체 결과에서는 {who} 사연으로 24시간 할 일, 7일 원칙, 연락 순서, 21일 여정을 새로 써 드려요.
        </p>
      </div>
    </div>
  );
}
