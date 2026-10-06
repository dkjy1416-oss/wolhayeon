"use client";

/**
 * 인스타그램·카카오톡 등 앱 안 브라우저로 결제 화면에 온 손님 안내 + 기록.
 * 앱 안 브라우저는 카드사 앱·간편결제 앱으로 넘어갔다 돌아오는 과정이 막히는 경우가 있어,
 * 막혔을 때 바로 빠져나갈 길을 알려준다. (주문번호가 주소에 있어 외부 브라우저에서도 그대로 이어짐)
 */
import { useEffect, useRef, useState } from "react";
import { logPayEvent } from "@/lib/pay-events";

function detectInApp(ua: string): string | null {
  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "facebook";
  if (/KAKAOTALK/i.test(ua)) return "kakaotalk";
  if (/NAVER\(inapp|NAVER\//i.test(ua)) return "naver";
  if (/ Line\//i.test(ua)) return "line";
  if (/Threads|Barcelona/i.test(ua)) return "threads";
  return null;
}

const LABEL: Record<string, string> = {
  instagram: "인스타그램",
  facebook: "페이스북",
  kakaotalk: "카카오톡",
  naver: "네이버 앱",
  line: "라인",
  threads: "스레드",
};

export default function InAppBrowserNotice({ orderNumber }: { orderNumber: string }) {
  const [app, setApp] = useState<string | null>(null);
  const sent = useRef(false);
  useEffect(() => {
    const a = detectInApp(navigator.userAgent || "");
    setApp(a);
    if (!sent.current) {
      sent.current = true;
      logPayEvent(orderNumber, "inapp_browser", a ?? "none");
    }
  }, [orderNumber]);
  if (!app) return null;
  return (
    <div className="mt-4 rounded-xl border border-gold-dim/25 bg-ink-soft/70 px-4 py-3 text-[0.76rem] leading-[1.8] text-ivory-dim">
      {LABEL[app]} 안에서 결제창이 열리지 않거나 멈추면,
      <br />
      오른쪽 위 <b className="text-ivory">⋯</b> → <b className="text-ivory">외부 브라우저로 열기</b>를 누른 뒤 다시 결제해 주세요.
      <br />
      사연과 주문은 그대로 이어져요.
    </div>
  );
}
