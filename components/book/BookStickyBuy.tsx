"use client";

/** 책 소개 페이지 하단 고정 구매 버튼 — 첫 화면을 지나고, 가격 카드가 안 보일 때만 */
import Link from "next/link";
import { useEffect, useState } from "react";

export default function BookStickyBuy({ href, label }: { href: string; label: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const pick = document.getElementById("pick");
      const last = document.getElementById("pick-last");
      const inView = (el: HTMLElement | null) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.top < window.innerHeight && r.bottom > 0;
      };
      setShow(window.scrollY > 520 && !inView(pick) && !inView(last));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-gold-dim/25 bg-ink/95 px-4 pt-3 backdrop-blur transition-transform duration-300 ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
      aria-hidden={!show}
    >
      <Link
        href={href}
        tabIndex={show ? 0 : -1}
        className="mx-auto flex h-12 w-full max-w-[460px] items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.9rem] font-medium text-ivory active:opacity-85"
      >
        {label}
      </Link>
    </div>
  );
}
