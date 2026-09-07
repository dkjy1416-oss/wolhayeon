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
}: {
  orderNumber: string;
  readingVideo: string | null;
  readingPoster: string | null;
}) {
  const [phase, setPhase] = useState<"loading" | "ready" | "delayed">(
    "loading"
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [name, setName] = useState<string>("");
  const tries = useRef(0); // pending 폴링 횟수
  const genFails = useRef(0); // 생성 실패(failed) 자동 재시도 횟수
  const started = useRef(false);

  useEffect(() => {
    /* 같은 브라우저 세션의 신청 데이터에서 표시용 이름만 */
    try {
      setName(loadApplication().applicant_name?.trim() ?? "");
    } catch {
      /* 이름 없이 진행 */
    }
  }, []);

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
        setPreview(json.preview as Preview);
        setPhase("ready");
        return;
      }
      if (json?.status === "pending" && tries.current < 14) {
        setTimeout(fetchPreview, 2500);
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
        setTimeout(fetchPreview, 3000);
        return;
      }
      setPhase("delayed");
    } catch {
      if (tries.current < 4) setTimeout(fetchPreview, 2500);
      else setPhase("delayed");
    }
  };

  useEffect(() => {
    if (started.current) return; // StrictMode/재마운트 중복 호출 방지
    started.current = true;
    fetchPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  /* ---------- 실패: loop 영상 유지 + 재시도만 (결제 버튼 없음) ---------- */
  if (phase === "delayed") {
    return (
      <div className="fade-in flex min-h-[80svh] flex-col items-center justify-center px-6 py-10 text-center">
        <ReadingVideo src={readingVideo} poster={readingPoster} />
        <p className="font-display mt-8 text-lg leading-relaxed text-ivory">
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
            tries.current = 0;
            genFails.current = 0;
            setPhase("loading");
            fetchPreview();
          }}
          className="mt-8 inline-flex h-13 items-center justify-center rounded-full border border-gold-dim/40 px-8 text-sm text-ivory hover:border-gold/60"
        >
          다시 읽어보기
        </button>
      </div>
    );
  }

  /* ---------- 읽는 중: 아주 짧은 전환 연출 (오래 보여주는 용도 아님).
       reading-loop만 사용 — 대기영상 01~05는 결제 후 대기 화면 전용 ---------- */
  if (phase === "loading") {
    return (
      <div className="fade-in flex min-h-[70svh] flex-col items-center justify-center px-6 py-10 text-center">
        <ReadingVideo src={readingVideo} poster={readingPoster} short />
        <p className="font-display mt-7 text-[1.02rem] leading-[1.9] text-ivory">
          월화가 {name ? `${name}님의` : "당신의"} 이야기를
          <br />
          잠깐 읽어보고 있어요.
        </p>
        <p className="mt-3 text-[0.8rem] font-light leading-relaxed text-ivory-dim">
          월화가 먼저 전할 말을 고르고 있어요.
        </p>
      </div>
    );
  }

  /* ---------- ready: 같은 화면에서 fade로 preview 공개 ---------- */
  if (!preview) return null;
  const cards = preview.preview_cards;
  const leadText = preview.cta_lead_text;
  const payHref = `/apply/complete?order=${encodeURIComponent(orderNumber)}`;

  return (
    <div className="fade-in pb-16">
      {/* ---------- 월화가 먼저 읽은 마음 (AI 3문장) ---------- */}
      <section className="px-6 pt-4">
        <div className="mx-auto max-w-md rounded-2xl border border-gold/25 bg-ink-soft px-6 py-8">
          <p className="text-center text-[0.65rem] tracking-[0.3em] text-gold/80">
            월화가 먼저 읽은 마음
          </p>
          <div className="mx-auto mt-5 h-px w-10 bg-gold/40" />
          <div className="mt-6 flex flex-col gap-4">
            {preview.intro_lines.map((line, i) => (
              <p
                key={i}
                className="text-[0.95rem] font-light leading-[2.05] text-ivory"
              >
                {line}
              </p>
            ))}
          </div>
          <p className="mt-6 text-right text-[0.78rem] text-gold/80">— 월화 月華</p>
        </div>
      </section>

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
              className="mt-3 select-none text-[0.92rem] font-light leading-[2.05] text-ivory-dim blur-[5px]"
            >
              {BLUR_LINES[0]}
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
        <p className="text-center text-[0.65rem] tracking-[0.3em] text-thread/90">
          전체 결과에서 이어지는 이야기
        </p>
        <div className="mx-auto mt-4 flex max-w-md flex-col gap-2.5">
          {cards.slice(0, 5).map((c) => (
            <div
              key={c.key}
              className="rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-3.5"
            >
              <p className="text-[0.93rem] font-medium text-ivory">{c.title}</p>
              <p className="mt-1 text-[0.82rem] font-light leading-[1.85] text-ivory-dim">
                {c.summary}
              </p>
            </div>
          ))}
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
          className="cta-glow mt-7 inline-flex h-14 w-full max-w-md items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85"
        >
          {CTA_BUTTON} · {RITUAL_PRICE_KRW.toLocaleString()}원
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
