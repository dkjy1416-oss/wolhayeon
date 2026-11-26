"use client";

/**
 * 11/26 새 홈(/home) 하위 화면 공통 틀 — 칼럼·영상·무료 테스트.
 * 상단: 뒤로(홈) + 제목, 하단: 홈 / 무료 / 칼럼 / 영상 / 보관함 (홈 화면과 같은 메뉴).
 */
import { useState } from "react";
import Link from "next/link";

export type Tab = "home" | "free" | "column" | "watch";

const ICON: Record<string, React.ReactNode> = {
  home: <path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" />,
  free: (
    <g>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 12l3 3 5-6" />
    </g>
  ),
  column: (
    <g>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M9 11h7M9 15h7M9 7h4" />
    </g>
  ),
  watch: (
    <g>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M10 9l5 3-5 3z" />
    </g>
  ),
  box: (
    <g>
      <path d="M4 8l8-4 8 4v8l-8 4-8-4z" />
      <path d="M4 8l8 4 8-4M12 12v8" />
    </g>
  ),
};

export const NAV: Array<{ id: Tab | "box"; label: string; href?: string }> = [
  { id: "home", label: "홈", href: "/home" },
  { id: "free", label: "무료", href: "/home?cat=free" },
  { id: "column", label: "칼럼", href: "/column" },
  { id: "watch", label: "영상", href: "/watch" },
  { id: "box", label: "보관함" },
];

export function NavIcon({ id }: { id: string }) {
  return (
    <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {ICON[id]}
    </svg>
  );
}

export function BottomNav({ active, onSoon, onTab }: { active: Tab; onSoon: (w: string) => void; onTab?: (t: Tab) => boolean }) {
  return (
    <nav aria-label="하단 메뉴" className="pointer-events-auto grid h-[60px] grid-cols-5 border-t border-[#2A2A2E] bg-[#0B0B0C] text-[11px]">
      {NAV.map((n) => {
        const on = n.id === active;
        const cls = `flex flex-col items-center justify-center gap-1 ${on ? "font-bold text-[#E4627B]" : "text-[#B5B5BA]"}`;
        if (!n.href)
          return (
            <button key={n.id} type="button" onClick={() => onSoon(n.label)} className={cls}>
              <NavIcon id={n.id} />
              {n.label}
            </button>
          );
        return (
          <Link
            key={n.id}
            href={n.href}
            aria-current={on ? "page" : undefined}
            onClick={(e) => {
              if (onTab && onTab(n.id as Tab)) e.preventDefault();
            }}
            className={cls}
          >
            <NavIcon id={n.id} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function SubShell({ title, active, children, back = "/home" }: { title: string; active: Tab; children: React.ReactNode; back?: string }) {
  const [toast, setToast] = useState<string | null>(null);
  const soon = (w: string) => {
    setToast(`${w}은(는) 준비 중이에요. 곧 열려요.`);
    window.setTimeout(() => setToast(null), 2200);
  };
  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="relative mx-auto min-h-screen w-full max-w-[480px] overflow-x-hidden bg-[#0B0B0C] pb-[90px] text-[#F5F5F5]">
        <header className="sticky top-0 z-30 flex h-[52px] items-center justify-between bg-[#0B0B0C]/95 px-2 backdrop-blur">
          <Link href={back} aria-label="뒤로" className="flex h-11 w-11 items-center justify-center text-[#F5F5F5]">
            <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
          <h1 className="m-0 text-[17px] font-extrabold">{title}</h1>
          <Link href="/home" className="font-display flex h-11 w-11 items-center justify-center text-[13px] text-[#E4627B]">
            월하연
          </Link>
        </header>
        {children}
        <p className="m-0 px-5 pb-6 pt-10 text-center text-[11px] leading-[1.7] text-[#8f8f96] [word-break:keep-all]">
          월하연은 특정 상대방의 감정·연락·재회·행동 또는 미래의 결과를 보장하지 않습니다.
        </p>
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px]">
          <BottomNav active={active} onSoon={soon} />
        </div>
        {toast && (
          <div role="status" className="fixed inset-x-0 bottom-[80px] z-50 mx-auto w-fit max-w-[90%] rounded-full bg-black/85 px-4 py-2.5 text-[13px] text-white">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
