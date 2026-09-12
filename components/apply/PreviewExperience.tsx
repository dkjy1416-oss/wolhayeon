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
import Link from "next/link";
import {
  getOrCreateSubmissionId,
  loadApplication,
} from "@/lib/ritual-storage";
import { RITUAL_PRICE_KRW } from "@/lib/ritual-types";
import DevPaymentNotice from "@/components/apply/DevPaymentNotice";
import { trackEvent } from "@/lib/analytics";

interface PreviewCard {
  key: string;
  title: string;
  summary: string;
}
interface Preview {
  intro_lines: string[];
  preview_letter_excerpt: string[];
  preview_cards: PreviewCard[];
  cta_lead_text: string;
}

/* CTA 버튼·보조 문구는 고정 (AI가 선택하지 않음) */
const CTA_BUTTON = "내 이야기 전체 결과 열기";
const CTA_HELPERS = [
  "1회 결제 · 추가 결제 없음",
  "개인 리추얼 · 24시간/7일/21일 가이드 포함",
];

/** 흐림 처리용 자리표시 문장 (실제 결과 아님 — 유출 불가) */
const BLUR_LINES = [
  "달빛이 스며드는 밤, 두 사람의 이야기는 조용히 이어지고 있었습니다. 그날의 말들과 마음의 온도, 그리고 아직 전하지 못한",
  "관계의 흐름 속에서 반복되던 순간들을 하나씩 짚어보면, 그 안에 남아 있던 진짜 마음의 방향이 천천히 드러나기 시작합니다.",
  "붉은 실을 손에 감고 준비된 문장을 읽는 다섯 번의 호흡, 그 시간 동안 정리되는 것들과 내려놓게 되는 것들에 대하여",
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
  const [phase, setPhase] = useState<"loading" | "ready" | "delayed">(
    "loading"
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [name, setName] = useState<string>("");
  const [showLoading, setShowLoading] = useState(false);
  const tries = useRef(0); // pending 폴링 횟수
  const genFails = useRef(0); // 생성 실패(failed) 자동 재시도 횟수
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
        if (typeof json.applicantName === "string" && json.applicantName.trim()) {
          setName(json.applicantName.trim());
        }
        setPreview(json.preview as Preview);
        setPhase("ready");
        try {
          const key = `wh_ev_preview_${orderNumber}`;
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, "1");
            trackEvent("preview_view");
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
          Array.isArray(cached.preview.preview_cards)
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

    return () => {
      clearTimeout(loadingTimer);
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

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
    return (
      <div className="fade-in">
        <FullBleedReading src={readingVideo} poster={readingPoster} minH="min-h-[92svh]">
          <p className="text-xs tracking-[0.35em] text-gold/90">月下緣</p>
          <p className="font-display mt-5 text-[1.15rem] leading-[1.9] text-ivory">
            월화가 {name ? `${name}님의` : "당신의"} 이야기를
            <br />
            먼저 읽고 있어요.
          </p>
          <p className="mt-3 text-[0.82rem] font-light leading-[1.95] text-ivory-dim">
            조금만 기다리면
            <br />
            무료 개인화 미리보기가 바로 이어집니다.
          </p>
        </FullBleedReading>
      </div>
    );
  }

  /* ---------- ready: 같은 화면에서 fade로 preview 공개 ---------- */
  if (!preview) return null;
  const cards = preview.preview_cards;
  const leadText = preview.cta_lead_text;
  const payHref = `/apply/complete?order=${encodeURIComponent(orderNumber)}`;

  const priceText = `${RITUAL_PRICE_KRW.toLocaleString()}원`;
  const ctaLabel = `내 전체 이야기 이어서 보기 · ${priceText}`;

  return (
    <div className="fade-in pb-16">
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

      {/* ---------- 전체 결과 teaser: 3~5개만 컴팩트하게 (읽을거리 아님) ---------- */}
      <section className="mt-6 px-6">
        <p className="font-display text-center text-[1.02rem] font-medium text-ivory">
          전체 결과에서 이어지는 이야기
        </p>
        <div className="mx-auto mt-4 flex max-w-md flex-col gap-2.5">
          {cards.slice(0, 5).map((c, i) => {
            /* 진행형 잠금: 앞 카드는 선명, 뒤로 갈수록 흐려지고 잠금 표시 */
            const lockLevel = i < 2 ? 0 : i - 1; // 0,0,1,2,3
            return (
              <div
                key={c.key}
                className="relative overflow-hidden rounded-xl border border-gold-dim/25 bg-ink-soft px-5 pb-6 pt-3.5"
                style={lockLevel ? { opacity: 1 - lockLevel * 0.08 } : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[0.93rem] font-medium text-ivory">
                    {c.title}
                  </p>
                  {lockLevel > 0 && (
                    <span
                      aria-hidden
                      className="mt-0.5 shrink-0 text-[0.68rem] text-gold-dim/80"
                    >
                      🔒
                    </span>
                  )}
                </div>
                <p
                  className={`mt-1 text-[0.82rem] font-light leading-[1.85] text-ivory-dim ${
                    lockLevel >= 2 ? "blur-[1.5px]" : ""
                  }`}
                >
                  {c.summary}
                </p>
                <p
                  aria-hidden
                  className="mt-1.5 select-none text-[0.78rem] font-light leading-[1.85] text-ivory-dim/60"
                  style={{ filter: `blur(${4 + lockLevel * 1.5}px)` }}
                >
                  {BLUR_LINES[i % BLUR_LINES.length]}
                </p>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-ink-soft to-transparent"
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- 가격은 여기서 처음 등장 ---------- */}
      <section className="mt-12 px-6 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-thread/30 bg-gradient-to-b from-[#160d10] to-ink-soft px-6 py-7">
          <p className="text-[0.65rem] tracking-[0.3em] text-thread/90">
            여기까지가 월화가 먼저 전한 이야기예요
          </p>
          <p className="mt-4 whitespace-pre-line text-[0.9rem] font-light leading-[2] text-ivory">
            {leadText}
          </p>
        </div>
        <Link
          href={payHref}
          onClick={() => trackEvent("payment_cta_click")}
          className="cta-glow mt-7 inline-flex h-14 w-full max-w-md items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85"
        >
          {name
            ? `${name}님의 전체 이야기 이어서 보기 · ${RITUAL_PRICE_KRW.toLocaleString()}원`
            : `${CTA_BUTTON} · ${RITUAL_PRICE_KRW.toLocaleString()}원`}
        </Link>
        <div className="mx-auto mt-4 flex max-w-md flex-col gap-1">
          {CTA_HELPERS.map((h, i) => (
            <p key={i} className="text-[0.72rem] text-ivory-dim/70">
              {h}
            </p>
          ))}
        </div>
        {/* 테스트 결제 모드 안내 (라이브 키 전환 시 컴포넌트 내부에서 끔) */}
        <DevPaymentNotice />
      </section>
    </div>
  );
}
