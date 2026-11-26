"use client";

/** 11/27 운영자 요청: 후기 전체보기 — 아바타·이름·별점 카드, 상품별 탭 */
import { useState } from "react";
import { REVIEW_PRODUCTS } from "@/lib/home/reviews-saved";
import { ReviewCard, PRODUCT_HREF, type ReviewView } from "@/components/home4/ReviewCard";

export type ReviewItem = ReviewView;

export default function ReviewList({ items }: { items: ReviewItem[] }) {
  const [tab, setTab] = useState("전체");
  const tabs = ["전체", ...REVIEW_PRODUCTS];
  const list = tab === "전체" ? items : items.filter((r) => r.product === tab);
  return (
    <div className="px-4 pt-2">
      <p className="m-0 text-[13px] text-[#E4627B]">실시간 이용 후기</p>
      <h2 className="m-0 mt-1 text-[22px] font-extrabold tracking-[-0.02em]">먼저 열어 본 분들의 이야기</h2>
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] px-4 py-3">
        <span className="text-[28px] font-black text-[#F5B83D]">5.0</span>
        <span>
          <span className="flex">
            {Array.from({ length: 5 }, (_, i) => (
              <svg key={i} width="18" height="18" viewBox="0 0 24 24" aria-hidden><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" fill="#F5B83D" /></svg>
            ))}
          </span>
          <span className="block text-[12.5px] text-[#B5B5BA]">후기 {items.length}개</span>
        </span>
      </div>
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
          <li key={r.key}>
            <ReviewCard r={r} clamp={20} href={PRODUCT_HREF[r.product]} />
          </li>
        ))}
      </ul>
    </div>
  );
}
