"use client";

/**
 * 결제 전 무료 미리보기 화면 (개인화 강화판).
 * - 개인화 preview가 ready일 때만 미리보기+결제 CTA 표시.
 *   실패 시에는 범용 문구/결제 버튼 없이 "다시 읽어보기"만 제공.
 * - 월화가 먼저 전하는 말: AI 생성 3문장 (고정 문구 없음)
 * - 첫 편지: 실제 서두 3~4문장 노출 + 아래 페이드/블러 (전체 편지는 결제 후)
 * - 카드 7개: 각 1~2줄 개인화 요약 + 흐린 자리표시 (전체 결과는 브라우저로 오지 않음)
 * - CTA 직전 설득 문구 · 버튼 · 보조 문구
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getOrCreateSubmissionId } from "@/lib/ritual-storage";
import { RITUAL_PRICE_KRW } from "@/lib/ritual-types";

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
const CTA_BUTTON = "내 이야기 전체 결과 바로 열기";
const CTA_HELPERS = [
  "1회 결제 · 추가 결제 없음",
  "결제 후 바로 전체 결과가 이어집니다",
  "개인 리추얼 · 24시간/7일/21일 가이드 포함",
];

/** 흐림 처리용 자리표시 문장 (실제 결과 아님 — 유출 불가) */
const BLUR_LINES = [
  "달빛이 스며드는 밤, 두 사람의 이야기는 조용히 이어지고 있었습니다. 그날의 말들과 마음의 온도, 그리고 아직 전하지 못한",
  "관계의 흐름 속에서 반복되던 순간들을 하나씩 짚어보면, 그 안에 남아 있던 진짜 마음의 방향이 천천히 드러나기 시작합니다.",
  "붉은 실을 손에 감고 준비된 문장을 읽는 다섯 번의 호흡, 그 시간 동안 정리되는 것들과 내려놓게 되는 것들에 대하여",
];

export default function PreviewExperience({
  orderNumber,
}: {
  orderNumber: string;
}) {
  const [phase, setPhase] = useState<"loading" | "ready" | "delayed">(
    "loading"
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const tries = useRef(0);
  const started = useRef(false);

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
        if (json?.status === "pending" && tries.current < 12) {
          setTimeout(fetchPreview, 2500);
          return;
        }
        setPhase("delayed");
      } catch {
        if (tries.current < 3) setTimeout(fetchPreview, 2500);
        else setPhase("delayed");
      }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetchPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  /* 개인화 미리보기 실패 → 범용 문구/결제 CTA 대신 재시도 안내만 */
  if (phase === "delayed") {
    return (
      <div className="flex min-h-[60svh] flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-lg leading-relaxed text-ivory">
          월화가 이야기를 읽는 과정이
          <br />
          조금 늦어지고 있어요.
        </p>
        <p className="mt-3 text-[0.85rem] font-light leading-relaxed text-ivory-dim">
          잠시 후 다시 읽어볼게요.
        </p>
        <button
          type="button"
          onClick={() => {
            tries.current = 0;
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

  if (phase === "loading") {
    return (
      <div className="flex min-h-[60svh] flex-col items-center justify-center px-6 text-center">
        <span
          aria-hidden
          className="block h-10 w-px animate-pulse bg-gradient-to-b from-transparent via-thread/80 to-thread/20"
        />
        <p className="font-display mt-8 text-lg text-ivory">
          월화가 잠시 당신의 이야기를 읽고 있어요…
        </p>
        <p className="mt-3 text-[0.8rem] font-light leading-relaxed text-ivory-dim">
          적어주신 마음을 천천히 살피고 있습니다.
          <br />
          잠시만 그대로 계세요.
        </p>
      </div>
    );
  }

  /* 여기부터는 개인화 preview가 ready인 경우에만 렌더 */
  if (!preview) return null;
  const cards = preview.preview_cards;
  const leadText = preview.cta_lead_text;
  const payHref = `/apply/complete?order=${encodeURIComponent(orderNumber)}`;

  return (
    <div className="pb-16">
      {/* ---------- 월화가 먼저 전하는 말 (AI 3문장) ---------- */}
      <section className="px-6 pt-4">
        <div className="mx-auto max-w-md rounded-2xl border border-gold/25 bg-ink-soft px-6 py-8">
          <p className="text-center text-[0.65rem] tracking-[0.3em] text-gold/80">
            월화가 먼저 전하는 말
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
      <section className="mt-8 px-6">
        <p className="text-center text-[0.65rem] tracking-[0.3em] text-thread/90">
          전체 리추얼에서 이어질 이야기
        </p>
        <div className="mx-auto mt-5 max-w-md overflow-hidden rounded-2xl border border-gold/25 bg-ink-soft">
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
            <p className="mt-1 text-[0.68rem] text-ivory-dim/60">
              관계의 흐름과 지금의 마음은 아래 전체 결과에서 더 깊게 이어집니다
            </p>
          </div>
        </div>
      </section>

      {/* ---------- 카드 7개: 개인화 요약 + 흐림 ---------- */}
      <section className="mt-4 px-6">
        <div className="mx-auto flex max-w-md flex-col gap-3">
          {cards.map((c, i) => (
            <div
              key={c.key}
              className="overflow-hidden rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4"
            >
              <p className="text-[0.7rem] font-medium tracking-wider text-gold/80">
                {String(i + 2).padStart(2, "0")}
              </p>
              <p className="mt-1 text-[0.95rem] font-medium text-ivory">{c.title}</p>
              <p className="mt-1.5 text-[0.85rem] font-light leading-[1.9] text-ivory-dim">
                {c.summary}
              </p>
              <p
                aria-hidden
                className="mt-2 select-none text-[0.8rem] font-light leading-[1.9] text-ivory-dim/70 blur-[6px]"
              >
                {BLUR_LINES[(i + 1) % BLUR_LINES.length]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mt-12 px-6 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-thread/30 bg-gradient-to-b from-[#160d10] to-ink-soft px-6 py-7">
          <p className="text-[0.65rem] tracking-[0.3em] text-thread/90">
            월화는 지금 여기까지 읽었습니다
          </p>
          <p className="mt-4 whitespace-pre-line text-[0.9rem] font-light leading-[2] text-ivory">
            {leadText}
          </p>
        </div>
        <Link
          href={payHref}
          className="mt-7 inline-flex h-14 w-full max-w-md items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85"
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
      </section>
    </div>
  );
}
