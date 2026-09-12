"use client";

/**
 * 모바일 sticky CTA — 일정 스크롤 후 하단에 얇게 표시,
 * FINAL CTA/footer 부근에서는 자연스럽게 사라짐. 결제 문구 없음.
 */
import { useEffect, useState } from "react";
import TrackedCtaLink from "@/components/TrackedCtaLink";

export default function StickyMobileCta() {
  const [show, setShow] = useState(false);
  const [nearEnd, setNearEnd] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const target = document.getElementById("final-cta");
    let io: IntersectionObserver | null = null;
    if (target) {
      io = new IntersectionObserver(
        (entries) => setNearEnd(entries.some((e) => e.isIntersecting)),
        { rootMargin: "0px 0px -20% 0px" }
      );
      io.observe(target);
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      io?.disconnect();
    };
  }, []);

  const visible = show && !nearEnd;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[500px] px-4 pb-4 transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <TrackedCtaLink
        event="home_cta_click"
        placement="sticky"
        href="/apply"
        tabIndex={visible ? 0 : -1}
        className="flex h-12 w-full items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.9rem] font-medium text-ivory shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
      >
        내 이야기 먼저 들려주기
      </TrackedCtaLink>
    </div>
  );
}
