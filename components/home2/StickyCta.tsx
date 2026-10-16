"use client";

/** 모바일 하단 고정 CTA — 첫 화면을 지난 뒤에만, 최종 CTA 근처에서는 숨김 */
import { useEffect, useState } from "react";
import TrackedCtaLink from "@/components/TrackedCtaLink";

export default function StickyCta() {
  const [show, setShow] = useState(false);
  const [nearEnd, setNearEnd] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 640);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const t = document.getElementById("final-cta");
    const io = t ? new IntersectionObserver((es) => setNearEnd(es.some((e) => e.isIntersecting))) : null;
    if (t && io) io.observe(t);
    return () => {
      window.removeEventListener("scroll", onScroll);
      io?.disconnect();
    };
  }, []);
  const visible = show && !nearEnd;
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-gold-dim bg-ink/95 px-4 pt-2.5 backdrop-blur transition-transform duration-300 ${visible ? "translate-y-0" : "translate-y-full"}`}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.6rem)" }}
      aria-hidden={!visible}
    >
      <TrackedCtaLink
        event="home_cta_click"
        placement="sticky"
        href="/apply"
        tabIndex={visible ? 0 : -1}
        className="flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.96rem] font-semibold"
      >
        월화에게 이야기하기
      </TrackedCtaLink>
      <p className="mt-1 text-center text-[0.72rem] text-ivory-dim">사연 입력 후 바로 · 미리보기 무료</p>
    </div>
  );
}
