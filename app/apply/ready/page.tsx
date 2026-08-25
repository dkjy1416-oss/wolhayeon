"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadApplication, hasMeaningfulData } from "@/lib/ritual-storage";
import DevPaymentNotice from "@/components/apply/DevPaymentNotice";
import RitualAccordion from "@/components/RitualAccordion";

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

      <section className="mt-10 rounded-2xl border border-gold-dim/30 bg-gradient-to-b from-ink-soft to-ink px-5 py-7">
        <h2 className="font-display text-center text-base font-semibold text-gold">
          월화가 준비하는 9가지 이야기
        </h2>
        <p className="mt-3 text-center text-[0.75rem] font-light text-ivory-dim/70">
          항목을 누르면 자세한 내용을 볼 수 있습니다.
        </p>
        <div className="mt-5">
          <RitualAccordion compact />
        </div>

        <div aria-hidden className="mx-auto mt-8 h-px w-16 bg-gold-dim/50" />

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

      {/* 개발 단계 전용 — 결제 연결 시 아래 한 줄과 상단 import를 삭제 */}
      <DevPaymentNotice />

      <Link
        href="/apply/confirm"
        className="mt-8 text-center text-xs text-ivory-dim/60 underline underline-offset-4"
      >
        입력 내용 다시 보기
      </Link>
    </main>
  );
}
