"use client";

/**
 * 인스타그램·카카오톡 등 앱 안 브라우저로 결제 화면에 온 손님 안내 + 기록.
 * 앱 안 브라우저는 카드사 앱·간편결제 앱으로 넘어갔다 돌아오는 과정이 막히는 경우가 있어,
 * 결제 버튼보다 먼저 '외부 브라우저로 열기'를 보여준다. (주문번호가 주소에 있어 외부 브라우저에서도 그대로 이어짐)
 *
 * 10/30: 결제 화면 앱 안 브라우저 24명 → 결제창 11명.
 * - 카카오톡: 외부 브라우저로 자동 전환 (카카오 공식 스킴, 같은 화면에서 한 번만)
 * - 라인: openExternalBrowser=1 로 자동 전환
 * - 안드로이드(인스타·페이스북·스레드·네이버): 크롬으로 열기 버튼 (intent 주소)
 * - 아이폰(인스타 등): 앱이 외부 열기를 막아 자동 전환 불가 → 링크 복사 + ⋯ 메뉴 안내
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

/** 결제 기록용: 지금 앱 안 브라우저 이름 (없으면 none) */
export function inAppName(): string {
  try {
    return detectInApp(navigator.userAgent || "") ?? "none";
  } catch {
    return "none";
  }
}

const LABEL: Record<string, string> = {
  instagram: "인스타그램",
  facebook: "페이스북",
  kakaotalk: "카카오톡",
  naver: "네이버 앱",
  line: "라인",
  threads: "스레드",
};

const AUTO_KEY = "wh_ext_tried";

function androidChromeUrl(href: string): string {
  const u = new URL(href);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`;
}

function externalUrl(app: string, href: string): string | null {
  if (app === "kakaotalk") return `kakaotalk://web/openExternal?url=${encodeURIComponent(href)}`;
  if (app === "line") {
    const u = new URL(href);
    u.searchParams.set("openExternalBrowser", "1");
    return u.toString();
  }
  return null;
}

export default function InAppBrowserNotice({ orderNumber }: { orderNumber: string }) {
  const [app, setApp] = useState<string | null>(null);
  const [isAndroid, setIsAndroid] = useState(false);
  const [copied, setCopied] = useState<"ok" | "manual" | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const a = detectInApp(ua);
    setApp(a);
    setIsAndroid(/Android/i.test(ua));
    if (!sent.current) {
      sent.current = true;
      logPayEvent(orderNumber, "inapp_browser", a ?? "none");
    }
    /* 카카오톡·라인은 공식 방법으로 외부 브라우저 자동 전환 (같은 화면에서 한 번만 시도) */
    if (a === "kakaotalk" || a === "line") {
      let tried = false;
      try {
        tried = sessionStorage.getItem(AUTO_KEY) === location.pathname + location.search;
        sessionStorage.setItem(AUTO_KEY, location.pathname + location.search);
      } catch {
        tried = true; // 저장 불가면 반복 전환 위험 → 자동 전환 생략, 버튼만
      }
      const to = externalUrl(a, location.href);
      if (!tried && to) {
        logPayEvent(orderNumber, "external_open_click", a === "kakaotalk" ? "kakao_auto" : "line_auto");
        location.href = to;
      }
    }
  }, [orderNumber]);

  if (!app) return null;

  const canOpen = app === "kakaotalk" || app === "line" || isAndroid;

  const openExternal = () => {
    const href = location.href;
    const to = externalUrl(app, href);
    if (to) {
      logPayEvent(orderNumber, "external_open_click", app === "kakaotalk" ? "kakao" : "line");
      location.href = to;
    } else if (isAndroid) {
      logPayEvent(orderNumber, "external_open_click", "android_chrome");
      location.href = androidChromeUrl(href);
    }
  };

  const copyLink = async () => {
    logPayEvent(orderNumber, "external_open_click", "copy");
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied("ok");
    } catch {
      setCopied("manual");
    }
  };

  return (
    <div className="mb-5 rounded-xl border border-burgundy/40 bg-[#f6e9ec] px-4 py-3.5 text-[0.8rem] leading-[1.75] text-ivory">
      <p className="font-semibold text-burgundy">{LABEL[app]} 안에서는 결제창이 막힐 수 있어요</p>
      <p className="mt-1 text-ivory-dim">
        {canOpen ? (
          "아래 버튼으로 외부 브라우저에서 열면 바로 결제할 수 있어요. 신청 내용과 금액은 그대로 이어집니다."
        ) : (
          <>
            오른쪽 위 <b className="text-ivory">⋯</b> → <b className="text-ivory">외부 브라우저로 열기</b>
            (또는 Safari로 열기)를 누르거나, 링크를 복사해 사파리에 붙여넣어 주세요. 신청 내용과 금액은 그대로 이어집니다.
          </>
        )}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {canOpen && (
          <button
            type="button"
            onClick={openExternal}
            className="h-10 rounded-full bg-burgundy px-4 text-[0.82rem] font-medium text-white"
          >
            외부 브라우저로 열기
          </button>
        )}
        <button
          type="button"
          onClick={copyLink}
          className="h-10 rounded-full border border-burgundy/50 px-4 text-[0.82rem] text-burgundy"
        >
          {copied === "ok" ? "복사됨 — 사파리·크롬에 붙여넣기" : "결제 링크 복사"}
        </button>
      </div>
      {copied === "manual" && (
        <p className="mt-2 select-all break-all rounded-lg bg-white/70 px-3 py-2 text-[0.72rem] text-ivory">
          {typeof location !== "undefined" ? location.href : ""}
        </p>
      )}
    </div>
  );
}
