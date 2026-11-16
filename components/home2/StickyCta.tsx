"use client";

/** 모바일 하단 고정 CTA — 첫 화면부터 바로 보임(10/30: 프로필 링크 유입이 첫 화면에서 행동·가격 조건을 못 봄), 최종 CTA 근처에서는 숨김 */
import { useEffect, useState } from "react";
import TrackedCtaLink from "@/components/TrackedCtaLink";

export default function StickyCta() {
  const [nearEnd, setNearEnd] = useState(false);
  /* 11/16: 첫 화면의 큰 버튼이 보이는 동안은 숨기고, 지나간 뒤부터 따라다님 */
  const [heroVisible, setHeroVisible] = useState(true);
  useEffect(() => {
    const t = document.getElementById("final-cta");
    const io = t ? new IntersectionObserver((es) => setNearEnd(es.some((e) => e.isIntersecting))) : null;
    if (t && io) io.observe(t);
    const h = document.getElementById("hero-cta");
    const io2 = h
      ? new IntersectionObserver((es) => setHeroVisible(es.some((e) => e.isIntersecting || e.boundingClientRect.top > 0)))
      : null;
    if (h && io2) io2.observe(h);
    else setHeroVisible(false);
    return () => {
      io?.disconnect();
      io2?.disconnect();
    };
  }, []);
  const visible = !nearEnd && !heroVisible;
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
        내 사연으로 무료 미리보기
      </TrackedCtaLink>
      <p className="mt-1 text-center text-[0.72rem] text-ivory-dim">5분 정도 · 미리보기 무료 · 정기결제 없음</p>
    </div>
  );
}
