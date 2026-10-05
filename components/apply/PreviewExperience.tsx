"use client";

/**
 * 결제 전 무료 미리보기 화면 (읽기 몰입판).
 * 흐름: 읽는 중(loop 영상) → 같은 화면에서 fade 전환 → 개인화 preview → 처음으로 가격 노출.
 * - 개인화 preview가 ready일 때만 미리보기+결제 CTA 표시.
 *   실패 시에는 loop 영상 + "다시 읽어보기"만 (결제 버튼 절대 없음).
 * - 특정 시간 약속 / 가짜 진행률 / 가짜 단계 없음.
 * - 일시적 생성 실패(failed)는 짧게 자동 재시도 후에만 실패 화면으로.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  getOrCreateSubmissionId,
  loadApplication,
} from "@/lib/ritual-storage";
import {
  RITUAL_PRICE_KRW,
  RITUAL_REGULAR_PRICE_KRW,
  APOLOGY_PRICE_KRW,
  isAllowedPrice,
  listPriceKRW,
  priceBadge,
  PROMO_DEADLINE_TEXT,
  isPromoActive,
  BOOK_PRICE_KRW,
  BUNDLE_REGULAR_PRICE_KRW,
  bundlePrice,
} from "@/lib/ritual-types";
import DevPaymentNotice from "@/components/apply/DevPaymentNotice";
import { PAYMENTS_OPEN, BOOK_SALES_OPEN } from "@/lib/payment-availability";
import BookPackageCard from "@/components/apply/BookPackageCard";
import PreviewWaiting from "@/components/apply/PreviewWaiting";
import SceneBreak from "@/components/apply/SceneBreak";
import { rememberOrder } from "@/components/book/ResumeOrder";
import { logPayEvent } from "@/lib/pay-events";
import { loadWant, type WantProduct } from "@/lib/purchase-intent";
import { trackEvent } from "@/lib/analytics";
import { CONTENT_VIEW_LINE } from "@/lib/content-access-policy";
import { REFUND_WINDOW_DAYS } from "@/lib/refund-policy";
import {
  NOW_STANCE_LABELS,
  PAID_DEEP_ITEMS,
} from "@/lib/preview-display";

interface Preview {
  intro_lines: string[];
  preview_letter_excerpt: string[];
  relationship_state: { label: string; text: string };
  partner_reading: { modes: string[]; text: string };
  cautions: { action: string; why: string }[];
  now_plan: {
    stance: "wait" | "light_contact" | "hold_boundary";
    period: string;
    why: string;
    watch: string[];
    decide_rule: string;
  };
  love100: string[];
  cta_lead_text: string;
}

/* CTA 버튼·보조 문구는 고정 (AI가 선택하지 않음) */
const CTA_BUTTON = "내 이야기의 다음 장 열기";
/* 결제 직전 안심 문구 — 실제 운영 기준(최근 결제 결과 도착 1~4분, 환불정책 7일)에 맞춘 고정 문구 */
const CTA_ASSURANCES = [
  { icon: "✉", text: "결제 후 보통 5분 안에 이메일로 도착" },
  { icon: "₩", text: "1회 결제 · 추가 결제 없음" },
  { icon: "↺", text: `결과를 열어보기 전이면 ${REFUND_WINDOW_DAYS}일 안에 전액 환불` },
];

/** 흐림 처리용 자리표시 문장 (실제 결과 아님 — 유출 불가) */
const BLUR_LINES = [
  "달빛이 스며드는 밤, 두 사람의 이야기는 조용히 이어지고 있었습니다. 그날의 말들과 마음의 온도, 그리고 아직 전하지 못한",
  "관계의 흐름 속에서 반복되던 순간들을 하나씩 짚어보면, 그 안에 남아 있던 진짜 마음의 방향이 천천히 드러나기 시작합니다.",
  "붉은 실을 손에 감고 준비된 문장을 읽는 다섯 번의 호흡, 그 시간 동안 정리되는 것들과 내려놓게 되는 것들에 대하여",
  "그날 밤의 마지막 대화를 다시 펼쳐 보면, 말이 되지 못하고 남아 있던 마음이 어느 줄에 숨어 있었는지 보이기 시작하고",
  "멀어진 순서를 거꾸로 되짚어 가다 보면, 두 사람이 각자 지키고 싶었던 것이 사실은 같은 자리에 있었다는 것도",
  "기다림과 연락 사이에서 흔들리는 마음에게, 지금 필요한 건 답이 아니라 순서라는 것을 먼저 전하고 싶었습니다",
];

/** full-bleed 몰입형 루프 배경 — 플레이어/카드처럼 보이지 않게.
 *  상하단은 ink로 녹아들고, 텍스트 가독성용 하단 오버레이 포함 */
function FullBleedReading({
  src,
  poster,
  minH = "min-h-[88svh]",
  children,
}: {
  src: string | null;
  poster: string | null;
  minH?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`relative ${minH} overflow-hidden`}>
      <div className="absolute inset-0" aria-hidden>
        {src ? (
          <video
            className="h-full w-full object-cover object-[50%_26%]"
            src={src}
            poster={poster ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-b from-[#141019] via-ink-soft to-ink" />
        )}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink via-ink/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-ink via-ink/85 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(13,13,15,0.5)_100%)]" />
      </div>
      <div className={`relative flex ${minH} flex-col justify-end px-6 pb-12`}>
        {children}
      </div>
    </section>
  );
}

export default function PreviewExperience({
  orderNumber,
  previewToken,
  continueToken,
  readingVideo,
  readingPoster,
}: {
  orderNumber: string;
  previewToken: string | null;
  continueToken: string | null;
  readingVideo: string | null;
  readingPoster: string | null;
}) {
  const [phase, setPhase] = useState<"loading" | "ready" | "delayed" | "expired">(
    "loading"
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [name, setName] = useState<string>("");
  /* 주문별 결제 금액 — 사과 쿠폰 적용 주문이면 쿠폰가 */
  const [price, setPrice] = useState<number>(() => listPriceKRW());
  const [showLoading, setShowLoading] = useState(false);
  const [slowNote, setSlowNote] = useState(false); // 15초 이상 걸릴 때 안심 문구
  const tries = useRef(0); // pending 폴링 횟수
  const genFails = useRef(0); // 생성 실패(failed) 자동 재시도 횟수
  const fallbackRetries = useRef(0); // 템플릿 폴백 수신 시 AI 재시도 횟수
  const started = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    /* 같은 브라우저 세션의 신청 데이터에서 표시용 이름만 */
    try {
      setName(loadApplication().applicant_name?.trim() ?? "");
    } catch {
      /* 이름 없이 진행 */
    }
  }, []);

  const scheduleRetry = (delayMs: number) => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(() => {
      retryTimer.current = null;
      fetchPreview();
    }, delayMs);
  };

  const fetchPreview = async () => {
    tries.current += 1;
    const startedAt = Date.now();
    try {
      const res = await fetch("/api/rituals/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber,
          submissionId: getOrCreateSubmissionId(),
          previewToken,
          continueToken,
        }),
      });
      const json = await res.json().catch(() => null);
      if (json?.status === "ready" && json.preview) {
        /* 템플릿 폴백(generated === false)이면 화면에 바로 보여주지 않고
           읽는 화면을 유지한 채 AI 생성을 한 번 더 기다린다.
           - 폴백은 서버에 저장되지 않으므로 재요청 시 AI를 다시 시도한다.
           - 한 번 더 실패하면 그때는 폴백이라도 보여준다 (화면이 비면 안 됨). */
        /* 첫 시도가 오래 걸렸으면(AI가 느린 상황) 손님을 또 기다리게 하지 않고 바로 보여준다 */
        if (json.generated === false && fallbackRetries.current < 1 && Date.now() - startedAt < 20_000) {
          fallbackRetries.current += 1;
          scheduleRetry(1500);
          return;
        }
        if (typeof json.applicantName === "string" && json.applicantName.trim()) {
          setName(json.applicantName.trim());
        }
        if (isAllowedPrice(json.paymentAmount)) setPrice(json.paymentAmount);
        setPreview(json.preview as Preview);
        setPhase("ready");
        try {
          const key = `wh_ev_preview_${orderNumber}`;
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, "1");
            trackEvent("preview_view", { order: orderNumber });
          }
        } catch {
          /* storage 사용 불가 시 중복보다 이벤트 누락을 선택 */
        }
        return;
      }
      if (json?.status === "pending") {
        if (tries.current < 14) {
          scheduleRetry(2500);
          return;
        }
        /* 안내 화면으로 바뀌어도 자동 폴링을 계속한다.
           stale claim(70초)을 넘길 수 있도록 여유를 둔다. */
        if (tries.current < 32) {
          setPhase("delayed");
          scheduleRetry(2500);
          return;
        }
        setPhase("delayed");
        return;
      }

      /* 링크(접근 토큰)가 만료된 경우 — 재시도해도 소용없으니 바로 안내 화면으로 */
      if (res.status === 404 || json?.error === "not_found") {
        setPhase("expired");
        return;
      }

      const transientFailure =
        json?.status === "failed" ||
        json?.error === "failed" ||
        json?.status === "server_error" ||
        json?.error === "server_error" ||
        [500, 502, 503, 504].includes(res.status);

      if (transientFailure && genFails.current < 2) {
        genFails.current += 1;
        scheduleRetry(3000);
        return;
      }
      setPhase("delayed");
    } catch {
      if (tries.current < 4) {
        scheduleRetry(2500);
      } else {
        setPhase("delayed");
        if (tries.current < 32) scheduleRetry(2500);
      }
    }
  };

  useEffect(() => {
    if (started.current) return; // StrictMode/재마운트 중복 호출 방지
    started.current = true;

    /* 직전 확인 화면에서 주문 저장과 동시에 만들어 둔 preview가 있으면
       두 번째 네트워크 왕복 없이 바로 공개한다. */
    try {
      const key = `wolhayeon_preview_prefetch:${orderNumber}`;
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const cached = JSON.parse(raw);
        if (
          cached?.preview &&
          Array.isArray(cached.preview.intro_lines) &&
          cached.preview.intro_lines.length === 3 &&
          Array.isArray(cached.preview.preview_letter_excerpt) &&
          Array.isArray(cached.preview.cautions) &&
          !!cached.preview.now_plan &&
          Array.isArray(cached.preview.love100)
        ) {
          if (
            typeof cached.applicantName === "string" &&
            cached.applicantName.trim()
          ) {
            setName(cached.applicantName.trim());
          }
          setPreview(cached.preview as Preview);
          setPhase("ready");
          sessionStorage.removeItem(key);
          return;
        }
      }
    } catch {
      /* cache가 없거나 손상되면 기존 서버 조회로 안전하게 fallback */
    }

    fetchPreview();

    /* 정상적인 빠른 응답에서는 로딩 문구 자체가 보이지 않게 하고,
       350ms 이상 걸릴 때만 영상 로딩 화면을 표시한다. */
    const loadingTimer = setTimeout(() => setShowLoading(true), 350);
    /* AI 생성이 길어지는 경우(사연이 길수록) 15초부터 안심 문구 추가 */
    const slowTimer = setTimeout(() => setSlowNote(true), 15_000);

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(slowTimer);
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  /* 하단 고정 결제 버튼 — 02번 카드를 지나고, 본문 결제 버튼이 안 보일 때만 */
  const [showSticky, setShowSticky] = useState(false);
  /* 책 소개 페이지에서 책·패키지를 고르고 온 손님 → 그 상품으로 결제 이어가기 */
  const [want, setWant] = useState<WantProduct | null>(null);
  useEffect(() => {
    if (!BOOK_SALES_OPEN) return;
    const w = loadWant();
    if (w) {
      setWant(w);
    }
  }, []);
  /* 미리보기까지 마친 주문을 이 기기에 기억 → /book·홈에서 다시 와도 사연 그대로 결제 */
  useEffect(() => {
    if (phase === "ready") rememberOrder(orderNumber, name);
  }, [phase, orderNumber, name]);
  const stickyStartRef = useRef<HTMLDivElement>(null);
  const mainCtaRef = useRef<HTMLDivElement>(null);
  /* 책 소개가 보이는 동안엔 하단 고정 버튼(메시지 결제)을 숨겨 책 버튼을 가리지 않게 */
  const bookRef = useRef<HTMLDivElement>(null);
  const endSeen = useRef(false);
  useEffect(() => {
    if (phase !== "ready" || !PAYMENTS_OPEN) return;
    const onScroll = () => {
      const s0 = stickyStartRef.current?.getBoundingClientRect();
      const m = mainCtaRef.current?.getBoundingClientRect();
      const pastStart = !!s0 && s0.top < 0;
      const ctaVisible = !!m && m.top < window.innerHeight && m.bottom > 0;
      const bk = bookRef.current?.getBoundingClientRect();
      const bookVisible = !!bk && bk.top < window.innerHeight && bk.bottom > 0;
      /* 결제 안내까지 읽은 손님 수 측정 (주문당 1회) — "도달"과 "결정" 중 어디가 문제인지 보기 위함 */
      if (ctaVisible && !endSeen.current) {
        endSeen.current = true;
        logPayEvent(orderNumber, "preview_end_seen");
      }
      setShowSticky(pastStart && !ctaVisible && !bookVisible);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [phase]);

  /* ---------- 오래된 링크: 미리보기는 메일 링크로, 결제·책은 바로 이어서 ---------- */
  if (phase === "expired") {
    const o = encodeURIComponent(orderNumber);
    return (
      <div className="fade-in">
        <FullBleedReading src={readingVideo} poster={readingPoster} minH="min-h-[92svh]">
          <p className="text-xs tracking-[0.35em] text-gold/90">月下緣</p>
          <p className="font-display mt-5 text-[1.2rem] leading-[1.8] text-ivory">
            이 미리보기 링크는
            <br />
            보안을 위해 시간이 지나 닫혔어요.
          </p>
          <p className="mt-3 text-[0.86rem] font-light leading-[1.95] text-ivory-dim">
            사연은 그대로 저장돼 있어요.
            <br />
            신청할 때 받은 메일 <span className="text-ivory">「이야기가 저장되었어요」</span>의 링크로
            <br />
            언제든 다시 열 수 있어요.
          </p>
          <div className="mt-7 flex flex-col gap-2.5">
            <Link
              href={`/apply/complete?order=${o}`}
              className="cta-glow inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory"
            >
              저장된 사연으로 바로 결제하기
            </Link>
            {BOOK_SALES_OPEN && (
              <Link
                href={`/book?order=${o}`}
                className="inline-flex h-12 w-full items-center justify-center rounded-full border border-gold-dim/40 text-[0.88rem] text-gold"
              >
                책 자세히 보기
              </Link>
            )}
          </div>
        </FullBleedReading>
      </div>
    );
  }

  /* ---------- 실패: full-bleed 유지 + 재시도만 (개인화 실패 시 결제 버튼 금지) ---------- */
  if (phase === "delayed") {
    return (
      <div className="fade-in">
        <FullBleedReading src={readingVideo} poster={readingPoster} minH="min-h-[86svh]">
          <p className="text-xs tracking-[0.35em] text-gold/90">月下緣</p>
          <p className="font-display mt-5 text-[1.15rem] leading-[1.85] text-ivory">
            월화가 이야기를 읽는 과정이
            <br />
            조금 늦어지고 있어요.
          </p>
          <p className="mt-3 text-[0.85rem] font-light leading-[1.95] text-ivory-dim">
            입력하신 내용은 그대로 남아 있어요.
            <br />
            잠시 후 다시 읽어볼게요.
          </p>
          <button
            type="button"
            onClick={() => {
              if (retryTimer.current) {
                clearTimeout(retryTimer.current);
                retryTimer.current = null;
              }
              tries.current = 0;
              genFails.current = 0;
              setPhase("loading");
              fetchPreview();
            }}
            className="mt-7 inline-flex h-13 w-full items-center justify-center rounded-full border border-gold-dim/40 text-sm text-ivory active:opacity-85"
          >
            다시 읽어보기
          </button>
        </FullBleedReading>
      </div>
    );
  }

  /* ---------- 읽는 중: full-bleed 몰입 전환 (응답 오면 즉시 전환) ---------- */
  if (phase === "loading") {
    if (!showLoading) {
      return <div className="min-h-[100svh] bg-ink" />;
    }
    return <PreviewWaiting name={name} slow={slowNote} />;
  }

  /* ---------- ready: 같은 화면에서 fade로 preview 공개 ---------- */
  if (!preview) return null;
  const leadText = preview.cta_lead_text;
  const payHref = `/apply/complete?order=${encodeURIComponent(orderNumber)}`;
  /* 메시지 결제는 항상 product=message 를 명시 (책·패키지를 봤다가 돌아와도 메시지 가격으로) */
  const messageHref = `${payHref}&product=message`;
  const bundleNow = bundlePrice();

  const priceText = `${price.toLocaleString()}원`;
  const wantPrice = want === "book" ? BOOK_PRICE_KRW : want === "bundle" ? bundleNow : price;
  const mainHref = want ? `${payHref}&product=${want}` : messageHref;
  const mainLabel =
    want === "book"
      ? `${name ? `${name}님의 ` : "나의 "}책 받기 · ${BOOK_PRICE_KRW.toLocaleString()}원`
      : want === "bundle"
        ? `메시지 + 책 함께 받기 · ${bundleNow.toLocaleString()}원`
        : null;
  const isApologyCoupon = price === APOLOGY_PRICE_KRW;
  const onCtaClick = (where: string) => {
    trackEvent("payment_cta_click", { order: orderNumber });
    logPayEvent(orderNumber, "preview_cta_click", where);
  };
  /* 결제하면 바로 열리는 것 — 이 사람의 미리보기에서 잠가 둔 부분과 1:1로 연결 */
  const stanceLabel = NOW_STANCE_LABELS[preview.now_plan.stance] ?? "";
  const unlockItems = [
    stanceLabel
      ? `‘${stanceLabel}’ — 언제까지, 무엇을 보고 다음 행동을 정할지`
      : "언제까지, 무엇을 보고 다음 행동을 정할지",
    preview.partner_reading.modes[0]
      ? `그 사람의 ‘${preview.partner_reading.modes[0]}’ 반응 뒤의 감정과, 답장 유형별 대응`
      : "그 사람의 반응별 대응 — 반가운 답 · 단답 · 무응답",
    "연락한다면 첫 메시지의 방향과 피해야 할 말",
    "월화의 첫 편지 전문 + 24시간 · 7일 · 21일 가이드",
  ];

  /* 카드 사이 장면 — 이 사람의 미리보기 내용(상대 반응·지금 할 일)에 맞춰 고른다 */
  const firstMode = preview.partner_reading.modes[0] ?? "";
  const scene =
    preview.now_plan.stance === "hold_boundary"
      ? { v: "alone", eyebrow: "혼자 견딘 밤", line: "혼자 견디는 밤이\n길었다면" }
      : firstMode === "방어" || firstMode === "감정소진"
      ? { v: "fight", eyebrow: "그날의 장면", line: "그날의 말들이\n아직 귓가에 남아 있다면" }
      : firstMode === "거리두기" || firstMode === "부담"
        ? { v: "cry", eyebrow: "멀어지는 뒷모습", line: "붙잡고 싶었는데,\n뒷모습만 남았다면" }
        : { v: "night", eyebrow: "새벽의 불빛", line: "연락할까 말까,\n화면만 켰다 껐다 했다면" };
  const stance = preview.now_plan.stance;
  const stanceScene =
    stance === "light_contact"
      ? { v: "w-thread", line: "끊어지지 않은 실을,\n서두르지 않고 천천히" }
      : stance === "hold_boundary"
        ? { v: "w-mirror", line: "나를 지키는 거리도\n이 관계를 아끼는 방법이에요" }
        : { v: "w-phone", line: "지금은, 휴대폰을\n한 번 내려놓을 때" };

  return (
    <div className="fade-in pb-28">
      {/* ---------- full-bleed: 이름 제목 + 월화의 개인화 문장 3줄 ---------- */}
      <FullBleedReading src={readingVideo} poster={readingPoster} minH="min-h-[88svh]">
        <p className="text-xs tracking-[0.35em] text-gold/90">月下緣</p>
        <p className="mt-4 text-[0.66rem] tracking-[0.3em] text-thread/90">
          무료 개인화 미리보기
        </p>
        <p className="font-display mt-2 text-[1.35rem] font-semibold leading-snug text-ivory">
          {name ? `${name}님에게 먼저 보인 흐름` : "당신에게 먼저 보인 흐름"}
        </p>
        <div className="mt-5 flex flex-col gap-3.5">
          {preview.intro_lines.map((line, i) => (
            <p
              key={i}
              className="text-[0.95rem] font-light leading-[2.05] text-ivory"
            >
              {line}
            </p>
          ))}
        </div>
        <p className="mt-4 text-right text-[0.78rem] text-gold/80">— 월화 月華</p>
      </FullBleedReading>

      {/* 개인화 3문장 다음에는 바로 첫 편지와 잠긴 결과로 이어진다.
          가격/결제는 충분한 무료 미리보기를 본 뒤 처음 노출한다. */}

      {/* ---------- 첫 편지: 실제 서두 노출 + 페이드 ---------- */}
      <section className="mt-10 px-6">
        <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-gold/25 bg-ink-soft">
          <div className="px-6 pt-7">
            <p className="text-[0.7rem] font-medium tracking-wider text-gold/80">01</p>
            <p className="font-display mt-1 text-[1.05rem] font-semibold text-ivory">
              월화의 첫 편지
            </p>
          </div>
          <div className="relative px-6 pb-6 pt-4">
            <div className="flex flex-col gap-3">
              {preview.preview_letter_excerpt.map((line, i) => (
                <p
                  key={i}
                  className="text-[0.92rem] font-light leading-[2.05] text-ivory"
                >
                  {line}
                </p>
              ))}
            </div>
            {/* 이어지는 부분: 자리표시 문장 흐림 + 그라데이션 페이드 */}
            <p
              aria-hidden
              className="mt-3 select-none text-[0.92rem] font-light leading-[2.05] text-ivory-dim blur-[4px]"
            >
              {BLUR_LINES[0]}
            </p>
            <p
              aria-hidden
              className="mt-2 select-none text-[0.92rem] font-light leading-[2.05] text-ivory-dim/70 blur-[7px]"
            >
              {BLUR_LINES[1]}
            </p>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink-soft via-ink-soft/80 to-transparent"
            />
          </div>
          <div className="border-t border-gold-dim/20 px-6 py-3.5 text-center">
            <p className="text-[0.72rem] text-gold/80">이 편지는 전체 결과에서 이어집니다</p>
          </div>
        </div>
      </section>

      <SceneBreak
        video={`/book/v3/${scene.v}.mp4`}
        poster={`/book/v3/${scene.v}.webp`}
        eyebrow={scene.eyebrow}
        line={scene.line}
      />

      {/* ---------- A. 지금 두 사람의 자리 ---------- */}
      <section className="mt-2 px-6">
        <div className="mx-auto max-w-md rounded-2xl border border-gold-dim/25 bg-ink-soft px-6 py-6">
          <p className="text-[0.7rem] font-medium tracking-wider text-gold/80">02 · 지금 두 사람의 자리</p>
          <p className="font-display mt-2 text-[1.08rem] font-semibold leading-snug text-ivory">
            {preview.relationship_state.label}
          </p>
          <p className="mt-3 text-[0.9rem] font-light leading-[2] text-ivory">
            {preview.relationship_state.text}
          </p>
        </div>
      </section>
      <div ref={stickyStartRef} aria-hidden />

      {/* ---------- B. 상대 반응 해석 ---------- */}
      <section className="mt-4 px-6">
        <div className="mx-auto max-w-md rounded-2xl border border-gold-dim/25 bg-ink-soft px-6 py-6">
          <p className="text-[0.7rem] font-medium tracking-wider text-gold/80">03 · 그 사람의 반응, 이렇게 읽혀요</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {preview.partner_reading.modes.map((m) => (
              <span
                key={m}
                className="rounded-full border border-thread/40 bg-thread/10 px-2.5 py-0.5 text-[0.72rem] text-thread"
              >
                {m}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[0.9rem] font-light leading-[2] text-ivory">
            {preview.partner_reading.text}
          </p>
        </div>
      </section>

      <SceneBreak
        video="/book/v3/bed.mp4"
        poster="/book/v3/bed.webp"
        eyebrow="보내기 직전"
        line={"썼다 지운 그 한 줄이,\n지금 가장 위험해요"}
      />

      {/* ---------- C. 지금 가장 조심할 행동 ---------- */}
      <section className="mt-2 px-6">
        <div className="mx-auto max-w-md rounded-2xl border border-gold-dim/25 bg-ink-soft px-6 py-6">
          <p className="text-[0.7rem] font-medium tracking-wider text-gold/80">04 · 지금 가장 조심할 행동</p>
          <ol className="mt-3 flex flex-col gap-3.5">
            {preview.cautions.map((c, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-thread/50 text-[0.68rem] text-thread">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[0.9rem] font-medium leading-[1.7] text-ivory">{c.action}</p>
                  <p className="mt-0.5 text-[0.82rem] font-light leading-[1.85] text-ivory-dim">{c.why}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <SceneBreak
        video={`/book/v3/${stanceScene.v}.mp4`}
        poster={`/book/v3/${stanceScene.v}.webp`}
        eyebrow="월화가 건네는 방향"
        line={stanceScene.line}
      />

      {/* ---------- D. 지금 해야 할 행동 ---------- */}
      <section className="mt-2 px-6">
        <div className="mx-auto max-w-md rounded-2xl border border-gold/35 bg-gradient-to-b from-ink-soft to-ink px-6 py-6">
          <p className="text-[0.7rem] font-medium tracking-wider text-gold/80">05 · 지금 해야 할 행동</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gold/15 px-3 py-1 text-[0.8rem] font-medium text-gold">
              {NOW_STANCE_LABELS[preview.now_plan.stance] ?? ""}
            </span>
            <span className="text-[0.76rem] text-ivory-dim/80">🔒 기간은 전체 결과에서</span>
          </div>
          <p className="mt-3 text-[0.9rem] font-light leading-[2] text-ivory">{preview.now_plan.why}</p>
          {/* 언제까지·무엇을 보고·어떻게 다음 행동을 정할지는 유료 결과에서 (자리표시 문장만 흐림) */}
          <div className="relative mt-4 overflow-hidden rounded-xl border border-gold-dim/25 bg-ink/60 px-4 py-3">
            <p className="text-[0.72rem] tracking-wider text-gold/70">이 기간에 볼 것 · 다음 행동을 정하는 기준</p>
            <div aria-hidden className="mt-2 select-none blur-[5px]">
              <p className="text-[0.85rem] font-light leading-[1.8] text-ivory-dim">· 상대의 반응이 바뀌는 신호와 그때의 거리</p>
              <p className="text-[0.85rem] font-light leading-[1.8] text-ivory-dim">· 먼저 움직여도 되는 조건과 멈춰야 하는 조건</p>
              <p className="mt-1 text-[0.86rem] leading-[1.85] text-ivory-dim">이 기준이 채워지면 그때 한 번, 짧고 가볍게</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-ink/40">
              {PAYMENTS_OPEN ? (
                <Link
                  href={mainHref}
                  onClick={() => onCtaClick("lock05")}
                  className="rounded-full border border-gold/40 bg-ink/85 px-4 py-1.5 text-[0.74rem] text-gold underline-offset-4 active:opacity-80"
                >
                  🔒 언제까지·무엇을 보고 정할지 열어보기 ›
                </Link>
              ) : (
                <p className="rounded-full border border-gold/30 bg-ink/80 px-4 py-1.5 text-[0.74rem] text-gold">
                  🔒 언제까지·무엇을 보고 정할지는 전체 결과에서
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <SceneBreak image="/wolhwa/wolhwa-gaze.webp" eyebrow="月華" line={"그 마음이 100이라는 것,\n월화는 알고 있어요"} />

      {/* ---------- 월하연의 관점: 사랑의 총량 100 (약 20%) ---------- */}
      <section className="mt-2 px-6">
        <div className="mx-auto max-w-md rounded-2xl border border-thread/25 bg-[#140c0e] px-6 py-6">
          <p className="text-[0.7rem] tracking-[0.25em] text-thread/90">월화가 보는 당신의 100</p>
          <div className="mt-3 flex flex-col gap-2.5">
            {preview.love100.map((l, i) => (
              <p
                key={i}
                className={`text-[0.9rem] leading-[2] ${
                  i === 0 ? "font-display text-ivory" : "font-light text-ivory"
                }`}
              >
                {l}
              </p>
            ))}
          </div>
        </div>
      </section>

      <SceneBreak
        image="/wolhwa/result-cards.webp"
        eyebrow="전체 결과"
        line={"상대의 반응부터\n지금 해야 할 행동까지"}
        position="object-center"
      />

      {/* ---------- E. 전체 결과에서 더 깊게 보는 것 (고정 목록) ---------- */}
      <section className="mt-4 px-6">
        <p className="font-display text-center text-[1.02rem] font-medium text-ivory">
          전체 결과에서 더 깊게 보는 것
        </p>
        <p className="mt-2 text-center text-[0.78rem] font-light text-ivory-dim">
          방향은 봤어요. 이제 남은 건 언제·어떻게예요
        </p>
        <ul className="mx-auto mt-4 flex max-w-md flex-col gap-2">
          {PAID_DEEP_ITEMS.map((item) => (
            <li
              key={item}
              className="flex items-center justify-between gap-3 rounded-xl border border-gold-dim/20 bg-ink-soft px-4 py-3"
            >
              <span className="text-[0.86rem] text-ivory">{item}</span>
              <span aria-hidden className="shrink-0 text-[0.7rem] text-gold-dim/80">🔒</span>
            </li>
          ))}
        </ul>
      </section>

      <SceneBreak
        video="/book/v3/w-final.mp4"
        poster="/book/v3/w-final.webp"
        eyebrow="다음 장"
        line={name ? `여기서부터는,\n${name}님만의 이야기예요` : "여기서부터는,\n당신만의 이야기예요"}
      />

      {/* ---------- 가격은 여기서 처음 등장 ---------- */}
      <section className="mt-4 px-6 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-thread/30 bg-gradient-to-b from-[#160d10] to-ink-soft px-6 py-7">
          <p className="text-[0.65rem] tracking-[0.3em] text-thread/90">
            여기까지가 월화가 먼저 전한 이야기예요
          </p>
          <p className="mt-4 whitespace-pre-line text-[0.9rem] font-light leading-[2] text-ivory">
            {leadText}
          </p>
          <p className="mt-5 text-[0.85rem] font-light leading-[1.9] text-gold">
            {name
              ? `여기서 멈추면, ${name}님 이야기는 이 페이지에서 끝나요.`
              : "여기서 멈추면, 이야기는 이 페이지에서 끝나요."}
            <br />
            다음 장부터는 오직 당신의 사연으로만 쓰여요.
          </p>
          <div className="mt-6 rounded-xl border border-gold-dim/25 bg-ink/50 px-4 py-4 text-left">
            <p className="text-[0.7rem] tracking-wider text-gold/80">결제하면 바로 열리는 것</p>
            <ul className="mt-2.5 flex flex-col gap-2">
              {unlockItems.map((t) => (
                <li key={t} className="flex gap-2.5 text-[0.84rem] leading-[1.75] text-ivory">
                  <span aria-hidden className="mt-[0.15rem] shrink-0 text-[0.7rem] text-thread">✦</span>
                  <span className="min-w-0">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          {want ? (
            <p className="mt-4 text-[0.78rem] text-ivory-dim">
              {want === "book" ? "고르신 상품 · 개인화 PDF 책" : "고르신 상품 · 메시지 + 책 패키지"}
              <span className="ml-2 text-thread">{wantPrice.toLocaleString()}원</span>
              {want === "bundle" && isPromoActive() && (
                <span className="mt-1 block text-[0.74rem] text-gold/90">
                  패키지 특가 {PROMO_DEADLINE_TEXT} · 이후 {BUNDLE_REGULAR_PRICE_KRW.toLocaleString()}원
                </span>
              )}
            </p>
          ) : (
          <p className="mt-5 text-[0.78rem] text-ivory-dim">
            {priceBadge(price).strike !== null && (
              <span className="line-through opacity-60">
                {priceBadge(price).strike!.toLocaleString()}원
              </span>
            )}
            <span className="ml-2 text-thread">
              {priceBadge(price).label ? `${priceBadge(price).label} ` : ""}
            </span>
            <span className="font-display ml-1 text-[1.25rem] font-semibold text-ivory">
              {price.toLocaleString()}원
            </span>
            <span className="ml-1.5 text-[0.74rem] text-ivory-dim/80">· 1회</span>
          </p>
          )}
          {!want && isPromoActive() && price < RITUAL_REGULAR_PRICE_KRW && (
            <p className="mt-2 text-[0.74rem] text-gold/90">
              10월 5일부터는 {RITUAL_REGULAR_PRICE_KRW.toLocaleString()}원으로 올라요
            </p>
          )}
        </div>
        {PAYMENTS_OPEN ? (
          <>
            <div ref={mainCtaRef} />
            <Link
              href={mainHref}
              onClick={() => onCtaClick("main")}
              className="cta-glow mt-7 inline-flex h-14 w-full max-w-md items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85"
            >
              {mainLabel ??
                (name
                  ? `${name}님의 다음 장 이어서 읽기 · ${priceText}`
                  : `${CTA_BUTTON} · ${priceText}`)}
            </Link>
            {want && (
              <Link
                href={messageHref}
                className="mx-auto mt-3 block max-w-md text-[0.76rem] text-ivory-dim underline underline-offset-4"
              >
                메시지만 받기 · {priceText}
              </Link>
            )}
            <ul className="mx-auto mt-5 flex max-w-md flex-col gap-1.5 text-left">
              {CTA_ASSURANCES.map((a) => (
                <li key={a.text} className="flex items-center justify-center gap-2 text-[0.76rem] text-ivory-dim">
                  <span aria-hidden className="w-4 text-center text-gold/80">{a.icon}</span>
                  <span>{a.text}</span>
                </li>
              ))}
            </ul>
            <p className="mx-auto mt-2.5 max-w-md text-[0.7rem] text-ivory-dim/70">
              카드 · 간편결제 · {CONTENT_VIEW_LINE} ·{" "}
              <Link href="/refund" className="underline underline-offset-2">환불정책</Link>
            </p>

            {/* ---------- 월화가 함께 건네는 책 (패키지 소개) ---------- */}
            {BOOK_SALES_OPEN && (
              <div ref={bookRef}>
              <BookPackageCard
                orderNumber={orderNumber}
                name={name}
                price={price}
                bundleHref={`${payHref}&product=bundle`}
                bookHref={`${payHref}&product=book`}
                onBundleClick={() => onCtaClick("bundle")}
              />
              </div>
            )}
          </>
        ) : (
          <>
            {/* 결제 오픈 준비 중 — 카드사 심사 완료까지 결제를 닫아 둔 상태 */}
            <div className="mx-auto mt-7 max-w-md rounded-2xl border border-gold-dim/35 bg-ink-soft/70 px-6 py-6 text-center">
              <p className="text-[0.66rem] tracking-[0.3em] text-thread/90">
                결제 오픈 준비 중
              </p>
              <p className="mt-3 text-[0.92rem] leading-[2] text-ivory">
                {name ? `${name}님의 다음 장은 준비되어 있어요.` : "다음 장은 준비되어 있어요."}
                <br />
                카드·간편결제 심사가 끝나는 대로 열립니다.
              </p>
              <p className="mt-3 text-[0.8rem] font-light leading-[1.95] text-ivory-dim">
                열리는 날, 입력하신 이메일로 가장 먼저 알려드릴게요.
                <br />
                {isPromoActive()
                  ? `재오픈 기념 특가 ${RITUAL_PRICE_KRW.toLocaleString()}원은 ${PROMO_DEADLINE_TEXT}예요.`
                  : "지금 신청하신 가격은 그대로 지켜둡니다."}
              </p>
            </div>
            <p className="mx-auto mt-4 max-w-md text-[0.72rem] text-ivory-dim/70">
              들려주신 이야기와 이 미리보기는 안전하게 보관돼요.
            </p>
          </>
        )}
        {/* 테스트 결제 모드 안내 (라이브 키 전환 시 컴포넌트 내부에서 끔) */}
        <DevPaymentNotice />
      </section>
      {PAYMENTS_OPEN && typeof document !== "undefined" && createPortal(
        <div
          className={`fixed inset-x-0 bottom-0 z-40 border-t border-gold-dim/25 bg-ink/95 px-4 pt-3 backdrop-blur transition-transform duration-300 ${
            showSticky ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
          aria-hidden={!showSticky}
        >
          <Link
            href={mainHref}
            tabIndex={showSticky ? 0 : -1}
            onClick={() => onCtaClick("sticky")}
            className="mx-auto flex h-12 w-full max-w-md items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.9rem] font-medium text-ivory active:opacity-85"
          >
            {mainLabel ?? `${name ? `${name}님의 다음 장 이어서 보기` : "다음 장 이어서 보기"} · ${priceText}`}
          </Link>
          <p className="mx-auto mt-1.5 max-w-md text-center text-[0.68rem] text-ivory-dim/80">
            보통 5분 안에 이메일로 · 열어보기 전이면 {REFUND_WINDOW_DAYS}일 안에 전액 환불
          </p>
        </div>,
        document.body
      )}
    </div>
  );
}
