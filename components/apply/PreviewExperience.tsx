"use client";

/**
 * 결제 전 무료 미리보기 화면.
 * - 로딩: "월화가 잠시 이야기를 읽고 있어요…"
 * - 미리보기(무료): headline / comfort / insight
 * - 블러 티저: 전체 결과 소제목은 보이고 본문은 placeholder를 흐림 처리
 *   (실제 결과 텍스트가 아니라 자리표시 문장 — 전체 결과는 결제 후 생성)
 * - CTA → 기존 결제 화면(/apply/complete)으로 연결
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getOrCreateSubmissionId } from "@/lib/ritual-storage";
import { RITUAL_PRICE_KRW } from "@/lib/ritual-types";

interface Preview {
  headline: string;
  comfort: string[];
  insight: string;
  teaser_sections: Array<{ number: string; title: string }>;
}

/** 블러 자리표시 문장 (실제 결과 아님 — 유출 불가) */
const BLUR_LINES = [
  "달빛이 스며드는 밤, 두 사람의 이야기는 조용히 이어지고 있었습니다. 그날의 말들과 마음의 온도, 그리고 아직 전하지 못한",
  "관계의 흐름 속에서 반복되던 순간들을 하나씩 짚어보면, 그 안에 남아 있던 진짜 마음의 방향이 천천히 드러나기 시작합니다.",
  "붉은 실을 손에 감고 준비된 문장을 읽는 다섯 번의 호흡, 그 시간 동안 정리되는 것들과 내려놓게 되는 것들에 대하여",
];

/** 전체 결과 기본 소제목 (미리보기 실패 시 폴백) */
const FALLBACK_SECTIONS = [
  { number: "01", title: "월화의 첫 편지" },
  { number: "02", title: "두 사람의 관계 이야기" },
  { number: "03", title: "지금 내 마음 들여다보기" },
  { number: "04", title: "반복되어 온 흐름" },
  { number: "05", title: "내가 정말 원하는 것" },
  { number: "06", title: "나만의 붉은 실 리추얼" },
  { number: "07", title: "리추얼 이후 24시간 · 7일" },
  { number: "08", title: "21일 마음 회복 여정" },
];

export default function PreviewExperience({
  orderNumber,
}: {
  orderNumber: string;
}) {
  const [phase, setPhase] = useState<"loading" | "ready" | "fallback">(
    "loading"
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const tries = useRef(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

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
        setPhase("fallback");
      } catch {
        if (tries.current < 3) setTimeout(fetchPreview, 2500);
        else setPhase("fallback");
      }
    };
    fetchPreview();
  }, [orderNumber]);

  /* ---------- 로딩 ---------- */
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

  const sections =
    phase === "ready" && preview && preview.teaser_sections.length >= 4
      ? preview.teaser_sections
      : FALLBACK_SECTIONS;

  return (
    <div className="pb-16">
      {/* ---------- 무료 미리보기 ---------- */}
      {phase === "ready" && preview ? (
        <section className="px-6 pt-4">
          <div className="mx-auto max-w-md rounded-2xl border border-gold/25 bg-ink-soft px-6 py-8">
            <p className="text-center text-[0.65rem] tracking-[0.3em] text-gold/80">
              월화가 먼저 전하는 말
            </p>
            <h2 className="font-display mt-4 text-center text-xl font-semibold leading-snug text-ivory">
              {preview.headline}
            </h2>
            <div className="mx-auto mt-6 h-px w-10 bg-gold/40" />
            <div className="mt-6 flex flex-col gap-4">
              {preview.comfort.map((line, i) => (
                <p
                  key={i}
                  className="text-[0.92rem] font-light leading-[2.05] text-ivory"
                >
                  {line}
                </p>
              ))}
            </div>
            <p className="mt-6 border-l-2 border-thread/50 pl-4 text-[0.88rem] font-light leading-[2] text-ivory-dim">
              {preview.insight}
            </p>
            <p className="mt-6 text-right text-[0.78rem] text-gold/80">
              — 월화 月華
            </p>
          </div>
        </section>
      ) : (
        <section className="px-6 pt-4">
          <div className="mx-auto max-w-md rounded-2xl border border-gold/25 bg-ink-soft px-6 py-8 text-center">
            <p className="text-[0.65rem] tracking-[0.3em] text-gold/80">
              월화가 먼저 전하는 말
            </p>
            <p className="mt-5 text-[0.92rem] font-light leading-[2.05] text-ivory">
              당신의 이야기는 안전하게 도착했습니다.
              <br />
              월화가 그 마음을 오래, 깊게 읽고
              <br />
              전체 리추얼에서 답해드릴 준비를 하고 있어요.
            </p>
          </div>
        </section>
      )}

      {/* ---------- 블러 티저 ---------- */}
      <section className="mt-10 px-6">
        <p className="text-center text-[0.65rem] tracking-[0.3em] text-thread/90">
          전체 결과 미리보기
        </p>
        <h3 className="font-display mt-3 text-center text-lg font-semibold text-ivory">
          전체 리추얼에서 이어질 이야기
        </h3>
        <div className="mx-auto mt-6 flex max-w-md flex-col gap-3">
          {sections.map((s, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4"
            >
              <p className="text-[0.7rem] font-medium tracking-wider text-gold/80">
                {s.number}
              </p>
              <p className="mt-1 text-[0.95rem] font-medium text-ivory">
                {s.title}
              </p>
              <p
                aria-hidden
                className="mt-2 select-none text-[0.82rem] font-light leading-[1.9] text-ivory-dim blur-[6px]"
              >
                {BLUR_LINES[i % BLUR_LINES.length]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mt-12 px-6 text-center">
        <p className="text-[0.95rem] font-light leading-[2] text-ivory">
          월화가 당신의 이야기에서
          <br />
          첫 번째 흐름을 먼저 읽어보았습니다.
        </p>
        <p className="mt-3 text-[0.88rem] font-light leading-[2] text-ivory-dim">
          지금 보이지 않는 나머지 이야기는
          <br />
          전체 리추얼에서 이어집니다.
        </p>

        <Link
          href={`/apply/complete?order=${encodeURIComponent(orderNumber)}`}
          className="mt-8 inline-flex h-14 w-full max-w-md items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85"
        >
          내 이야기 전체 결과 확인하기 · {RITUAL_PRICE_KRW.toLocaleString()}원
        </Link>
        <p className="mt-4 text-[0.7rem] text-ivory-dim/60">
          1회 결제 · 정기결제 없음
        </p>
      </section>
    </div>
  );
}
