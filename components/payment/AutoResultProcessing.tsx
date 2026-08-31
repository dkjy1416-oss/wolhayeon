"use client";

/**
 * 결제 완료 후 자동 처리 화면.
 * - 서명된 processToken으로 /api/rituals/process 를 호출.
 * - 응답: ready → (세션 정리 후) 결과 페이지로 이동
 *         processing → 잠시 후 재호출 (AI 중복 실행 없음, 서버가 보장)
 *         delayed/오류 → 안내 + [결과 준비 다시 시도] (같은 API 재호출)
 * - 진행률 숫자는 표시하지 않음 (허위 진행률 금지).
 * - 결제 페이지로는 절대 되돌리지 않음.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearApplication } from "@/lib/ritual-storage";

const MESSAGES = [
  "월화가 당신의 이야기를 다시 천천히 읽고 있어요.",
  "두 사람 사이에 남아 있는 흐름을 정리하고 있어요.",
  "당신에게 필요한 이야기를 하나씩 준비하고 있어요.",
  "조금만 기다려주세요.\n결과가 완성되면 자동으로 열어드릴게요.",
];

const POLL_MS = 5000;
const MAX_WAIT_MS = 10 * 60 * 1000;

export default function AutoResultProcessing({
  orderNumber,
  processToken,
}: {
  orderNumber: string;
  processToken: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"working" | "delayed">("working");
  const [msgIdx, setMsgIdx] = useState(0);
  const startedAt = useRef<number>(Date.now());
  const active = useRef(true);
  const inflight = useRef(false);

  /* 문구 순환 */
  useEffect(() => {
    if (phase !== "working") return;
    const id = setInterval(
      () => setMsgIdx((i) => (i + 1) % MESSAGES.length),
      4200
    );
    return () => clearInterval(id);
  }, [phase]);

  const callProcess = async () => {
    if (inflight.current || !active.current) return;
    inflight.current = true;
    try {
      const res = await fetch("/api/rituals/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, processToken }),
      });
      const json = await res.json().catch(() => null);

      if (json?.status === "ready" && typeof json.resultPath === "string") {
        // 자동 처리 완료 후에만 세션 정리 → 결과 페이지로
        clearApplication();
        active.current = false;
        router.replace(json.resultPath);
        return;
      }
      if (json?.status === "processing" || res.status === 504 || res.status === 502 && json === null) {
        scheduleNext();
        return;
      }
      /* delayed / not_paid / server_error 등 */
      setPhase("delayed");
    } catch {
      /* 네트워크/타임아웃 — 서버는 계속 처리 중일 수 있으므로 재확인 */
      scheduleNext();
    } finally {
      inflight.current = false;
    }
  };

  const scheduleNext = () => {
    if (!active.current) return;
    if (Date.now() - startedAt.current > MAX_WAIT_MS) {
      setPhase("delayed");
      return;
    }
    setTimeout(callProcess, POLL_MS);
  };

  useEffect(() => {
    active.current = true;
    callProcess();
    return () => {
      active.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "delayed") {
    return (
      <main className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col items-center justify-center px-6 py-20 text-center">
        <p className="text-xs tracking-[0.35em] text-gold/90">月下緣</p>
        <h1 className="font-display mt-6 text-xl font-semibold leading-relaxed text-ivory">
          결제는 정상적으로 완료되었습니다.
        </h1>
        <p className="mt-5 text-[0.92rem] font-light leading-[2] text-ivory-dim">
          결과를 준비하는 과정이 조금 늦어지고 있어요.
          <br />
          결제가 다시 이루어지지는 않습니다.
        </p>
        <div className="mt-8 w-full rounded-2xl border border-gold-dim/30 bg-ink-soft px-6 py-5">
          <p className="text-xs tracking-wide text-ivory-dim">주문번호</p>
          <p className="font-display mt-2 text-lg font-semibold tracking-wider text-gold">
            {orderNumber}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            startedAt.current = Date.now();
            active.current = true;
            setPhase("working");
            callProcess();
          }}
          className="mt-9 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory active:opacity-85"
        >
          결과 준비 다시 시도
        </button>
        <p className="mt-5 text-[0.72rem] leading-relaxed text-ivory-dim/60">
          결과가 완성되면 신청서에 적어주신 이메일로도 안내드립니다.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-xs tracking-[0.35em] text-gold/90">月下緣</p>
      <p className="mt-6 text-[0.72rem] tracking-[0.25em] text-thread/90">
        결제가 완료되었습니다
      </p>
      <span
        aria-hidden
        className="mt-10 block h-12 w-px animate-pulse bg-gradient-to-b from-transparent via-thread/80 to-thread/20"
      />
      <p
        key={msgIdx}
        className="font-display mt-8 min-h-[3.6rem] whitespace-pre-line text-[1.05rem] leading-[1.9] text-ivory"
      >
        {MESSAGES[msgIdx]}
      </p>
      <p className="mt-8 text-[0.78rem] font-light leading-[1.9] text-ivory-dim">
        보통 1~3분 정도 걸립니다.
        <br />
        이 화면을 닫지 말고 잠시만 기다려주세요.
      </p>
      <div className="mt-10 w-full rounded-2xl border border-gold-dim/25 bg-ink-soft px-6 py-4">
        <p className="text-[0.68rem] tracking-wide text-ivory-dim">주문번호</p>
        <p className="font-display mt-1 text-base tracking-wider text-gold">
          {orderNumber}
        </p>
      </div>
    </main>
  );
}
