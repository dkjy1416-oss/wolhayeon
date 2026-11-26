"use client";

/** 11/26 운영자 요청: 후기 더 보기 — 상품별로 골라 보기 */
import { useState } from "react";
import Link from "next/link";
import { REVIEW_PRODUCTS } from "@/lib/home/reviews-saved";

export type ReviewItem = { key: string; product: string; who: string; body: string };

const HREF: Record<string, string> = { "관계 리추얼": "/apply", "카톡 대화 분석": "/chat", "월화의 책": "/book", "메시지 + 책": "/book" };

export default function ReviewList({ items }: { items: ReviewItem[] }) {
  const [tab, setTab] = useState("전체");
  const tabs = ["전체", ...REVIEW_PRODUCTS];
  const list = tab === "전체" ? items : items.filter((r) => r.product === tab);
  return (
    <div className="px-4 pt-2">
      <p className="m-0 text-[13px] text-[#E4627B]">후기</p>
      <h2 className="m-0 mt-1 text-[22px] font-extrabold tracking-[-0.02em]">먼저 열어 본 분들의 이야기</h2>
      <p className="m-0 mt-1 text-[13px] text-[#B5B5BA]">후기 {items.length}개</p>
      <div className="scrollbar-none -mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`h-[34px] shrink-0 rounded-full px-3.5 text-[13.5px] ${tab === t ? "bg-[#2A0D15] font-bold text-white ring-1 ring-[#8E2338]" : "bg-[#18181B] text-[#B5B5BA]"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <ul className="m-0 mt-4 flex list-none flex-col gap-2.5 p-0">
        {list.map((r) => (
          <li key={r.key} className="rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] text-[#B5B5BA]">{r.who}</span>
              <Link href={HREF[r.product] ?? "/apply"} className="rounded-full bg-[#2A0D15] px-2.5 py-0.5 text-[11.5px] font-bold text-[#F3B6C2]">
                {r.product}
              </Link>
            </div>
            <p className="m-0 mt-2 text-[15px] leading-[1.7] text-[#F5F5F5] [word-break:keep-all]">{r.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
