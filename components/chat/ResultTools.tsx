"use client";

/** 11/28 (경쟁사 비교): 결과 PDF 저장 · 다른 기기에서 다시 보기 */
import Link from "next/link";

export default function ResultTools() {
  return (
    <div data-noprint className="mx-auto mt-10 grid max-w-[620px] grid-cols-2 gap-2">
      <style>{`@media print{[data-noprint],nav[aria-label="리포트 목차"],#ask,iframe{display:none!important}html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#0e0b0d!important}.reveal{opacity:1!important;transform:none!important}}`}</style>
      <button type="button" onClick={() => window.print()} className="flex min-h-12 items-center justify-center rounded-full border border-white/20 text-[0.88rem] text-ivory">
        PDF로 저장하기
      </button>
      <Link href="/chat/my" className="flex min-h-12 items-center justify-center rounded-full border border-white/20 text-[0.88rem] text-ivory">
        다른 기기에서 다시 보기
      </Link>
      <p className="col-span-2 text-center text-[0.72rem] text-ivory-dim">PDF 저장: 인쇄 화면에서 &lsquo;PDF로 저장&rsquo;을 고르세요 · 링크를 잃어버려도 이메일로 다시 받을 수 있어요</p>
    </div>
  );
}
