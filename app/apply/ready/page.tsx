"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadApplication, hasMeaningfulData } from "@/lib/ritual-storage";

/**
 * 개발용 안내 표시 여부.
 * 결제 기능이 연결되면 이 값을 false로 바꾸거나 해당 블록을 삭제하세요.
 */
const SHOW_DEV_NOTICE = true;

const DELIVERABLES = [
  "월화의 개인 편지",
  "두 사람의 관계 이야기",
  "현재 마음 분석",
  "개인화된 붉은 인연의 실 리추얼",
  "당신만을 위한 리추얼 문장",
  "리추얼 이후 24시간 가이드",
  "7일 행동 가이드",
  "21일 마음 회복 플랜",
  "개인 마음 기록 질문",
];

export default function ReadyPage() {
  const [guard, setGuard] = useState<"loading" | "ok" | "empty">("loading");

  useEffect(() => {
    setGuard(hasMeaningfulData(loadApplication()) ? "ok" : "empty");
  }, []);

  if (guard === "loading") return <main className="min-h-[100svh]" />;

  if (guard === "empty") {
    return (
      <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-xl text-ivory">
          아직 들려주신 이야기가 없습니다.
        </p>
        <Link
          href="/apply"
          className="mt-8 inline-flex h-13 items-center justify-center rounded-full border border-gold-dim/40 px-8 text-sm text-ivory"
        >
          신청서 작성하기
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-6 pb-14 pt-24">
      <h1 className="font-display text-center text-2xl font-semibold text-ivory">
        이야기를 모두 들었습니다.
      </h1>
      <p className="mt-6 text-center text-[0.92rem] font-light leading-[2] text-ivory-dim">
        다음 단계에서 신청을 완료하면
        <br />
        월화가 당신이 들려준 이야기를 바탕으로
        <br />
        개인 리추얼을 준비합니다.
      </p>

      <section className="mt-10 rounded-2xl border border-gold-dim/30 bg-gradient-to-b from-ink-soft to-ink px-7 py-8">
        <h2 className="font-display text-center text-base font-semibold text-gold">
          준비되는 내용
        </h2>
        <ul className="mt-6 flex flex-col gap-3">
          {DELIVERABLES.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-thread"
              />
              <span className="text-[0.88rem] font-light text-ivory-dim">
                {item}
              </span>
            </li>
          ))}
        </ul>

        <div
          aria-hidden
          className="mx-auto mt-8 h-px w-16 bg-gold-dim/50"
        />

        <p className="font-display mt-7 text-center text-3xl font-semibold text-gold">
          16,900<span className="ml-1 text-lg text-ivory-dim">원</span>
        </p>
        <p className="mt-2 text-center text-xs tracking-wide text-ivory-dim">
          1회 결제 / 정기결제 없음
        </p>
      </section>

      <button
        type="button"
        className="mt-8 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory active:opacity-85"
      >
        신청 준비 완료
      </button>

      {SHOW_DEV_NOTICE && (
        <p className="mt-4 text-center text-xs text-ivory-dim/50">
          결제 기능은 다음 개발 단계에서 연결됩니다.
        </p>
      )}

      <Link
        href="/apply/confirm"
        className="mt-8 text-center text-xs text-ivory-dim/60 underline underline-offset-4"
      >
        입력 내용 다시 보기
      </Link>
    </main>
  );
}
