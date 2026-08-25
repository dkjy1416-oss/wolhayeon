"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  loadApplication,
  hasMeaningfulData,
  clearApplication,
  getOrCreateSubmissionId,
} from "@/lib/ritual-storage";
import DevPaymentNotice from "@/components/apply/DevPaymentNotice";
import RitualAccordion from "@/components/RitualAccordion";

export default function ReadyPage() {
  const router = useRouter();
  const [guard, setGuard] = useState<"loading" | "ok" | "empty">("loading");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setGuard(hasMeaningfulData(loadApplication()) ? "ok" : "empty");
  }, []);

  /* 주문 생성 — 클릭 즉시 잠금, 요청 중 재클릭 차단 */
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: getOrCreateSubmissionId(),
          application: loadApplication(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok && typeof json.order_number === "string") {
        // 성공: 세션의 신청 데이터 삭제 후 완료 페이지로
        clearApplication();
        router.push(
          `/apply/complete?order=${encodeURIComponent(json.order_number)}`
        );
        return; // submitting 유지 (이동 중 재클릭 방지)
      }
      // 실패: 입력 데이터는 세션에 그대로 유지
      setErrorMsg(
        json?.message ??
          "신청을 저장하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
      setSubmitting(false);
    } catch {
      setErrorMsg(
        "신청을 저장하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
      setSubmitting(false);
    }
  };

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
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-8 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85 disabled:opacity-50"
      >
        {submitting
          ? "저장하고 있습니다…"
          : errorMsg
            ? "다시 시도"
            : "신청 준비 완료"}
      </button>

      {errorMsg && (
        <p className="mt-4 text-center text-sm leading-relaxed text-thread">
          {errorMsg}
        </p>
      )}

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
