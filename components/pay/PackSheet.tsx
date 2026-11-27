"use client";

/**
 * 11/28 운영자 요청: 결제 버튼을 누르면 뜨는 3단 패키지 팝업 (청월당 결제 화면 구성 참고, 월하연은 흰 바탕 + 버건디).
 * - 맨 위: 서비스별 월화 배너 + 상품 이름
 * - 선택지 3개: ① 단품 ② 추천 묶음 ③ 전부 — 할인율이 점점 커지게 (취소선 = 실제 정가 합계)
 * - 아래: "N% 할인받고 결제하기"
 * 이 파일은 화면만 그린다. 금액은 서버가 정하고, 결제는 부르는 쪽(onPay)이 한다.
 */
import { useEffect } from "react";

export type PackOption = {
  key: string;
  name: string;
  desc?: string;
  price: number;
  regular: number;
  badge?: string;
};

export type PackService = "ritual" | "chat" | "book";

const BANNER: Record<PackService, { src: string; kicker: string; title: string }> = {
  ritual: { src: "https://d2ol7oe51mr4n9.cloudfront.net/user_3DbVBBUg293N8F55dosRpqwEfb6/f94e9aee-52ab-4e2b-a0f5-e059ce7cf3e0.webp", kicker: "月下緣 · 월화의", title: "재회 분석" },
  chat: { src: "https://d2ol7oe51mr4n9.cloudfront.net/user_3DbVBBUg293N8F55dosRpqwEfb6/5b34da31-de16-44d2-9f93-f43af8160f6a.webp", kicker: "月下緣 · 월화의", title: "카톡 분석" },
  book: { src: "https://d2ol7oe51mr4n9.cloudfront.net/user_3DbVBBUg293N8F55dosRpqwEfb6/b1cd4fe1-adad-4750-90e5-1de2bbf92cc0.webp", kicker: "月下緣 · 내 사연으로 쓴", title: "심층 리포트" },
};

export const pct = (price: number, regular: number) => (regular > price ? Math.round((1 - price / regular) * 100) : 0);
const won = (n: number) => `${n.toLocaleString()}원`;

export default function PackSheet({
  open,
  onClose,
  service,
  options,
  selected,
  onSelect,
  onPay,
  busy = false,
  children,
  note = "1회 결제 · 정기결제 없음 · 결과 열기 전 7일 안 전액 환불",
}: {
  open: boolean;
  onClose: () => void;
  service: PackService;
  options: PackOption[];
  selected: string;
  onSelect: (key: string) => void;
  onPay?: () => void;
  busy?: boolean;
  /** 결제수단 영역 등 (있으면 버튼 위에 그림) */
  children?: React.ReactNode;
  note?: string;
}) {
  const b = BANNER[service];
  const cur = options.find((o) => o.key === selected) ?? options[0];
  const off = cur ? pct(cur.price, cur.regular) : 0;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 sm:items-center" role="dialog" aria-modal="true" aria-label="결제하기" onClick={onClose}>
      <div
        className="flex max-h-[92svh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[1.6rem] bg-white text-[#1d1418] shadow-[0_-20px_60px_rgba(0,0,0,0.35)] sm:rounded-[1.6rem]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 머리 */}
        <div className="relative flex items-center justify-center px-5 py-4">
          <button type="button" onClick={onClose} aria-label="닫기" className="absolute left-3 flex h-10 w-10 items-center justify-center text-[1.6rem] leading-none text-[#1d1418]">
            ‹
          </button>
          <p className="text-[1.05rem] font-bold">결제하기</p>
        </div>

        <div className="overflow-y-auto">
          {/* 배너 */}
          <div className="relative aspect-[1200/514] w-full overflow-hidden bg-[#2a0f18]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.src} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-y-0 left-0 flex w-[58%] flex-col justify-center bg-gradient-to-r from-[#1a070d]/85 via-[#1a070d]/55 to-transparent pl-5">
              <p className="text-[0.72rem] font-semibold tracking-[0.08em] text-[#e8c98a]">{b.kicker}</p>
              <p className="font-display mt-1 text-[1.75rem] font-black leading-tight text-[#fff4e6] [text-shadow:0_2px_14px_rgba(228,107,138,0.55)]">{b.title}</p>
            </div>
          </div>

          {/* 선택지 3개 */}
          <div className="flex flex-col gap-3 px-5 pb-2 pt-5">
            {options.map((o) => {
              const on = o.key === cur?.key;
              const p = pct(o.price, o.regular);
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => onSelect(o.key)}
                  aria-pressed={on}
                  className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-colors ${on ? "border-[#7a1f3d] bg-[#fbf3f5]" : "border-[#eee6e8] bg-white"}`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-[#7a1f3d]" : "border-[#d9cfd2]"}`}>
                    {on && <span className="h-3 w-3 rounded-full bg-[#7a1f3d]" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {o.badge && <span className="rounded-full bg-[#f6e3e8] px-2 py-0.5 text-[0.72rem] font-bold text-[#7a1f3d]">{o.badge}</span>}
                      <span className="text-[0.98rem] font-bold leading-snug">{o.name}</span>
                    </span>
                    {o.desc && <span className="mt-1 block text-[0.78rem] leading-snug text-[#8a7f83]">{o.desc}</span>}
                  </span>
                  <span className="shrink-0 text-right">
                    {p > 0 && (
                      <span className="block whitespace-nowrap text-[0.78rem]">
                        <b className="text-[#c2304f]">{p}%</b> <s className="text-[#a79da0]">{won(o.regular)}</s>
                      </span>
                    )}
                    <span className="block whitespace-nowrap text-[1.15rem] font-extrabold">{won(o.price)}</span>
                  </span>
                </button>
              );
            })}
            <p className="text-center text-[0.74rem] text-[#9a8f93]">{note}</p>
          </div>

          {children && <div className="px-5 pt-3">{children}</div>}
        </div>

        {/* 결제 버튼 */}
        <div className="border-t border-[#f1eaec] bg-white px-5 pb-[calc(env(safe-area-inset-bottom,0px)+0.9rem)] pt-3">
          <button
            type="button"
            onClick={onPay}
            disabled={busy || !onPay}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#7a1f3d] text-[1.05rem] font-bold text-white shadow-[0_8px_24px_rgba(122,31,61,0.35)] active:opacity-85 disabled:opacity-60"
          >
            {busy ? "준비하고 있어요…" : off > 0 ? `${off}% 할인받고 결제하기` : `${cur ? won(cur.price) : ""} 결제하기`}
          </button>
        </div>
      </div>
    </div>
  );
}
