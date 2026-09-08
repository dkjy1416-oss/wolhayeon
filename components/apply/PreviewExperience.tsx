"use client";

/**
 * 결제 전 무료 미리보기 화면 (읽기 몰입판).
 * 흐름: 읽는 중(loop 영상) → 같은 화면에서 fade 전환 → 개인화 preview → 처음으로 가격 노출.
 * - 정상 흐름은 preview ready → 무료 미리보기 → 그 다음에만 결제 CTA.
 * - preview가 늦어지면 결제를 먼저 보여주지 않는다. 대기영상 05→01→02→03→04를
 *   풀스크린 루프형으로 보여주며 preview 생성/재시도를 뒤에서 계속한다.
 * - preview가 준비되면 현재 영상이 끝나기를 기다리지 않고 즉시 무료 미리보기로 전환.
 * - 특정 시간 약속 / 가짜 진행률 / 가짜 단계 없음.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getOrCreateSubmissionId,
  loadApplication,
} from "@/lib/ritual-storage";
import { RITUAL_PRICE_KRW } from "@/lib/ritual-types";
import DevPaymentNotice from "@/components/apply/DevPaymentNotice";
import WaitingContent, { type WaitingVideoItem } from "@/components/payment/WaitingContent";

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

/** 읽는 중 / 실패 화면 공용 — 월화 reading loop 영상 */
function ReadingVideo({
  src,
  poster,
  short = false,
}: {
  src: string | null;
  poster: string | null;
  short?: boolean;
}) {
  if (!src && !poster) return null;
  return (
    <div
      className={`relative mx-auto w-full max-w-[300px] overflow-hidden rounded-sm ${
        short ? "aspect-[16/10]" : "aspect-[9/16] max-w-[260px]"
      }`}
    >
      {src ? (
        <video
          className={`h-full w-full object-cover ${short ? "object-[50%_18%]" : ""}`}
          src={src}
          poster={poster ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster!}
          alt=""
          className="h-full w-full object-cover"
          aria-hidden
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-ink/15" />
    </div>
  );
}

export default function PreviewExperience({
  orderNumber,
  readingVideo,
  readingPoster,
  waitingVideos = [],
}: {
  orderNumber: string;
  readingVideo: string | null;
  readingPoster: string | null;
  waitingVideos?: WaitingVideoItem[];
}) {
  const [phase, setPhase] = useState<"loading" | "ready" | "delayed">(
    "loading"
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [name, setName] = useState<string>("");
  const tries = useRef(0); // pending 폴링 횟수
  const genFails = useRef(0); // 생성 실패(failed) 자동 재시도 횟수
  const started = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const softWaitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    /* 같은 브라우저 세션의 신청 데이터에서 표시용 이름만 */
    try {
      setName(loadApplication().applicant_name?.trim() ?? "");
    } catch {
      /* 이름 없이 진행 */
    }
  }, []);

  const startSoftWaitTimer = () => {
    if (softWaitTimer.current) clearTimeout(softWaitTimer.current);
    softWaitTimer.current = setTimeout(() => {
      softWaitTimer.current = null;
      /* 무료 preview 때문에 결제 전 사용자를 오래 묶어두지 않는다.
         API 요청은 취소하지 않고 계속 진행시키며, 화면만 non-blocking fallback으로 전환한다. */
      setPhase((current) => (current === "loading" ? "delayed" : current));
    }, 3500);
  };

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
        }),
      });
      const json = await res.json().catch(() => null);
      if (json?.status === "ready" && json.preview) {
        if (softWaitTimer.current) {
          clearTimeout(softWaitTimer.current);
          softWaitTimer.current = null;
        }
        setPreview(json.preview as Preview);
        setPhase("ready");
        return;
      }
      if (json?.status === "pending") {
        if (tries.current < 14) {
          scheduleRetry(2500);
          return;
        }
        /* 오래 걸리면 안내 화면은 보여주되 자동 재시도는 계속한다.
           stale claim(70초) 복구 뒤 다음 요청이 다시 생성할 수 있도록
           약 80초 이상 폴링 여유를 둔다. 사용자가 버튼을 누르지 않아도
           ready가 오면 자동으로 preview 화면으로 넘어간다. */
        if (tries.current < 32) {
          setPhase("delayed");
          scheduleRetry(2500);
          return;
        }
        setPhase("delayed");
        return;
      }
      /* 일시적 생성 실패/서버 타임아웃은 선점이 해제되거나 곧 stale 처리될 수 있음.
         API는 HTTP 오류일 때 error 필드를 쓰므로 status/error 둘 다 본다. */
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
      if (tries.current < 4) scheduleRetry(2500);
      else setPhase("delayed");
    }
  };

  useEffect(() => {
    if (started.current) return; // StrictMode/재마운트 중복 호출 방지
    started.current = true;
    startSoftWaitTimer();
    fetchPreview();
    return () => {
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      if (softWaitTimer.current) {
        clearTimeout(softWaitTimer.current);
        softWaitTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  const payHref = `/apply/complete?order=${encodeURIComponent(orderNumber)}`;

  /* ---------- preview 생성이 조금 늦는 경우 ----------
       여기는 결제 유도 화면이 아니라 "무료 미리보기를 준비하는 몰입 구간".
       결제는 preview가 실제로 공개된 뒤에만 등장한다. ---------- */
  if (phase === "delayed") {
    return (
      <div className="relative h-[100svh] w-full overflow-hidden bg-black">
        <WaitingContent videos={waitingVideos} immersive />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-6 pt-[max(1.4rem,env(safe-area-inset-top))] text-center">
          <p className="text-[0.68rem] tracking-[0.36em] text-gold/90">月下緣</p>
          <div className="mt-6 inline-block rounded-full border border-white/15 bg-black/30 px-4 py-2 backdrop-blur">
            <p className="text-[0.72rem] text-ivory/90">
              월화가 {name ? `${name}님의` : "당신의"} 이야기를 읽고 있어요
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 px-7 text-center">
          <p className="text-[0.78rem] font-light leading-[1.8] text-ivory/80">
            무료 미리보기가 준비되면
            <br />
            이 화면에서 바로 이어집니다.
          </p>
        </div>

        {tries.current >= 32 ? (
          <button
            type="button"
            onClick={() => {
              if (retryTimer.current) {
                clearTimeout(retryTimer.current);
                retryTimer.current = null;
              }
              tries.current = 0;
              genFails.current = 0;
              fetchPreview();
            }}
            className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/25 bg-black/45 px-5 py-2.5 text-[0.72rem] text-ivory backdrop-blur"
          >
            미리보기 다시 준비하기
          </button>
        ) : null}
      </div>
    );
  }

  /* ---------- 처음 3.5초: reading-loop를 풀스크린으로 짧게 보여주는 전환 ---------- */
  if (phase === "loading") {
    return (
      <div className="relative h-[100svh] w-full overflow-hidden bg-black">
        {readingVideo ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={readingVideo}
            poster={readingPoster ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        ) : readingPoster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={readingPoster}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80"
        />

        <div className="absolute inset-x-0 top-0 z-10 px-6 pt-[max(1.4rem,env(safe-area-inset-top))] text-center">
          <p className="text-[0.68rem] tracking-[0.36em] text-gold/90">月下緣</p>
        </div>

        <div className="absolute inset-x-0 bottom-[max(3rem,env(safe-area-inset-bottom))] z-10 px-7 text-center">
          <p className="font-display text-[1.25rem] font-medium leading-[1.7] text-ivory">
            월화가 {name ? `${name}님의` : "당신의"} 이야기를
            <br />
            먼저 읽고 있어요.
          </p>
          <p className="mt-3 text-[0.78rem] font-light leading-[1.8] text-ivory/70">
            결제 전에, 지금 이 자리에서
            <br />
            개인화 미리보기를 먼저 보여드릴게요.
          </p>
        </div>
      </div>
    );
  }

  /* ---------- ready: 무료 개인화 미리보기 공개 ----------
       이 구간이 결제를 결정하는 핵심 구간.
       실제 사연에 대한 구체적인 "맞다"는 감각을 주되 전체 해석은 열지 않는다. ---------- */
  if (!preview) return null;
  const cards = preview.preview_cards;
  const leadText = preview.cta_lead_text;

  return (
    <div className="fade-in min-h-[100svh] bg-ink pb-16">
      <div className="px-6 pt-[max(1.5rem,env(safe-area-inset-top))] text-center">
        <p className="text-[0.68rem] tracking-[0.36em] text-gold/90">月下緣</p>
        <p className="mt-7 text-[0.7rem] tracking-[0.2em] text-thread/90">
          무료 개인화 미리보기
        </p>
        <h1 className="font-display mt-3 text-[1.45rem] font-semibold leading-[1.6] text-ivory">
          월화가 먼저 읽은
          <br />
          두 사람 사이의 흐름
        </h1>
      </div>

      {/* 1. "내 얘기 맞네"를 만드는 핵심 3문장 */}
      <section className="px-6 pt-7">
        <div className="mx-auto max-w-md border-y border-gold-dim/25 py-7">
          <div className="flex flex-col gap-4">
            {preview.intro_lines.map((line, i) => (
              <p
                key={i}
                className={`font-light leading-[2.05] ${
                  i === 0
                    ? "font-display text-[1.05rem] font-medium text-ivory"
                    : "text-[0.92rem] text-ivory/90"
                }`}
              >
                {line}
              </p>
            ))}
          </div>
          <p className="mt-6 text-right text-[0.75rem] text-gold/80">— 월화 月華</p>
        </div>
      </section>

      {/* 2. 첫 편지 일부를 실제로 무료 공개 */}
      <section className="mt-9 px-6">
        <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-b from-[#17100f] to-ink-soft">
          <div className="px-6 pt-7">
            <p className="text-[0.66rem] tracking-[0.25em] text-gold/75">
              FIRST LETTER
            </p>
            <p className="font-display mt-2 text-[1.12rem] font-semibold text-ivory">
              월화의 첫 편지
            </p>
          </div>

          <div className="relative px-6 pb-7 pt-5">
            <div className="flex flex-col gap-3.5">
              {preview.preview_letter_excerpt.map((line, i) => (
                <p
                  key={i}
                  className="text-[0.92rem] font-light leading-[2.05] text-ivory"
                >
                  {line}
                </p>
              ))}
            </div>

            <p
              aria-hidden
              className="mt-4 select-none text-[0.9rem] font-light leading-[2.05] text-ivory-dim blur-[5px]"
            >
              {BLUR_LINES[0]}
            </p>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink-soft via-ink-soft/85 to-transparent"
            />
          </div>

          <div className="border-t border-gold-dim/20 px-6 py-4 text-center">
            <p className="text-[0.72rem] leading-[1.7] text-gold/85">
              여기서부터는 아직 열지 않은 이야기예요.
            </p>
          </div>
        </div>
      </section>

      {/* 3. 결제하면 무엇을 얻는지: 답은 숨기고 "내 사연에 맞는 질문"만 보여줌 */}
      <section className="mt-10 px-6">
        <p className="text-center text-[0.68rem] tracking-[0.26em] text-thread/90">
          전체 결과에서 이어서 읽는 것
        </p>
        <p className="mx-auto mt-3 max-w-sm text-center text-[0.78rem] font-light leading-[1.85] text-ivory-dim">
          일반적인 연애 조언이 아니라,
          <br />
          방금 들려준 이야기 안에서 이어집니다.
        </p>

        <div className="mx-auto mt-5 flex max-w-md flex-col gap-2.5">
          {cards.slice(0, 5).map((c, i) => (
            <div
              key={c.key}
              className="relative overflow-hidden rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-[0.72rem] text-gold/70">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.94rem] font-medium text-ivory">{c.title}</p>
                  <p className="mt-1.5 text-[0.81rem] font-light leading-[1.8] text-ivory-dim">
                    {c.summary}
                  </p>
                </div>
                <span aria-hidden className="text-[0.78rem] text-gold/55">잠금</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. 결제 전환: 무료 미리보기를 충분히 본 뒤 처음 가격 등장 */}
      <section className="mt-11 px-6 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-thread/30 bg-gradient-to-b from-[#1d0d12] to-[#0d0b0c] px-6 py-7">
          <p className="text-[0.68rem] tracking-[0.25em] text-thread/90">
            무료 미리보기는 여기까지
          </p>
          <p className="font-display mt-4 text-[1.15rem] font-semibold leading-[1.75] text-ivory">
            이제 가장 궁금한 부분부터
            <br />
            끝까지 이어서 읽을 수 있어요.
          </p>
          <p className="mt-4 whitespace-pre-line text-[0.86rem] font-light leading-[1.95] text-ivory-dim">
            {leadText}
          </p>

          <div className="mt-6 border-t border-gold-dim/20 pt-5">
            <p className="font-display text-[1.65rem] font-semibold text-gold">
              {RITUAL_PRICE_KRW.toLocaleString()}원
            </p>
            <p className="mt-1.5 text-[0.72rem] text-ivory-dim/70">
              1회 결제 · 추가 결제 없음
            </p>
          </div>

          <Link
            href={payHref}
            className="cta-glow mt-6 inline-flex h-15 w-full items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-burgundy to-burgundy-deep px-4 text-[0.96rem] font-semibold text-ivory transition-opacity active:opacity-85"
          >
            지금 내 전체 이야기 이어보기
          </Link>

          <div className="mt-4 flex flex-col gap-1.5">
            <p className="text-[0.72rem] text-ivory-dim/75">
              관계 흐름 · 반복된 패턴 · 지금 할 수 있는 행동
            </p>
            <p className="text-[0.72rem] text-ivory-dim/75">
              개인 리추얼 · 24시간/7일/21일 가이드 포함
            </p>
          </div>
          <DevPaymentNotice />
        </div>
      </section>
    </div>
  );
}

