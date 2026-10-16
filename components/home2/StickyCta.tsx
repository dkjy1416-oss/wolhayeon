"use client";

/** 모바일 하단 고정 CTA — 첫 화면을 지난 뒤에만, 최종 CTA 근처에서는 숨김
 *  10/16: 이 기기에 미리보기를 마친 주문이 있고 첫 구매 혜택(서버 기준 마감)이 남아 있으면
 *  '할인혜택 종료까지 HH:MM:SS' + 이어서 결제 버튼. 마감이 없는 방문자에게는 타이머를 보이지 않는다(가짜 마감 없음). */
import { useEffect, useState } from "react";
import TrackedCtaLink from "@/components/TrackedCtaLink";
import { readOrder } from "@/components/book/ResumeOrder";

function hms(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(t / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`;
}

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
  const [offer, setOffer] = useState<{ o: string; ends: number; skew: number } | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const s = readOrder();
    if (!s) return;
    let stop = false;
    fetch(`/api/orders/price?order=${encodeURIComponent(s.o)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!stop && j?.ok && j.status === "pending" && j.offerEndsAt) setOffer({ o: s.o, ends: j.offerEndsAt, skew: (j.serverNow ?? Date.now()) - Date.now() });
      })
      .catch(() => {});
    return () => {
      stop = true;
    };
  }, []);
  useEffect(() => {
    if (!offer) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [offer]);
  const left = offer ? offer.ends - (now + offer.skew) : 0;
  const timer = offer && now > 0 && left > 0;
  const visible = show && !nearEnd;
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-gold-dim bg-ink/95 px-4 pt-2.5 backdrop-blur transition-transform duration-300 ${visible ? "translate-y-0" : "translate-y-full"}`}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.6rem)" }}
      aria-hidden={!visible}
    >
      {timer && (
        <p className="mb-1.5 text-center text-[0.86rem] font-semibold text-ivory">
          할인혜택 종료까지 <span className="tabular-nums text-[#ffd84d]">{hms(left)}</span>
        </p>
      )}
      <TrackedCtaLink
        event="home_cta_click"
        placement={timer ? "sticky_offer" : "sticky"}
        href={timer && offer ? `/apply/complete?order=${encodeURIComponent(offer.o)}&product=message` : "/apply"}
        tabIndex={visible ? 0 : -1}
        className="flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.96rem] font-semibold"
      >
        {timer ? "할인가로 이어서 받기" : "내 사연으로 무료 미리보기"}
      </TrackedCtaLink>
      <p className="mt-1 text-center text-[0.72rem] text-ivory-dim">
        {timer ? "미리보기를 마친 사연 그대로 · 다시 쓰지 않아도 돼요" : "미리보기 무료 · 미리보기 후 24시간 첫 구매 할인"}
      </p>
    </div>
  );
}
