"use client";

/** 11/23: 카톡 결과 예시 페이지 하단 고정 버튼 + 누적 고객 말풍선 (홈과 같은 수 · 100명 미만이면 숨김) */
import { useEffect, useState } from "react";
import Link from "next/link";
import RollingCount from "@/components/home3/RollingCount";

export default function ChatSampleSticky({ href, label, customers = 0 }: { href: string; label: string; customers?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let nearEnd = false;
    const t = document.getElementById("sample-final-cta");
    const io = t ? new IntersectionObserver((es) => { nearEnd = es.some((e) => e.isIntersecting); onScroll(); }) : null;
    if (t && io) io.observe(t);
    function onScroll() {
      setShow(window.scrollY > 300 && !nearEnd);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-gold-dim bg-[#0e0b0d]/95 px-4 pt-2.5 backdrop-blur transition-transform duration-300 ${show ? "translate-y-0" : "translate-y-full"}`}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.6rem)" }}
      aria-hidden={!show}
    >
      {customers >= 100 && (
        <div className={`pointer-events-none absolute inset-x-0 -top-11 flex justify-center transition-opacity duration-300 ${show ? "opacity-100" : "opacity-0"}`}>
          <p className="relative rounded-full border border-[#e46b8a]/40 bg-[#1d181b]/95 px-3.5 py-1.5 text-[0.8rem] font-semibold text-ivory shadow-[0_6px_20px_rgba(0,0,0,0.45)]">
            누적 고객{" "}
            <b className="mx-0.5 text-[1.02rem] text-[#ff8fab] [text-shadow:0_0_12px_rgba(255,143,171,0.5)]">
              <RollingCount value={customers} />
            </b>
            명이 월화를 찾았어요
            <span aria-hidden className="absolute -bottom-[5px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-[#e46b8a]/40 bg-[#1d181b]" />
          </p>
        </div>
      )}
      <Link
        href={href}
        tabIndex={show ? 0 : -1}
        className="flex h-12 w-full items-center justify-center rounded-full bg-[#e46b8a] text-[0.95rem] font-bold text-white active:opacity-85"
      >
        {label}
      </Link>
      <p className="mt-1 text-center text-[0.72rem] text-ivory-dim">숫자 분석은 무료로 먼저 · 1회 결제 · 정기결제 없음</p>
    </div>
  );
}
