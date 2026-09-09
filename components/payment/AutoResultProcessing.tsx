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
import WaitingContent, {
  type WaitingVideoItem,
} from "@/components/payment/WaitingContent";

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
  applicantName,
  introLines,
  waitingVideos = [],
}: {
  orderNumber: string;
  processToken: string;
  /** 대기 화면 개인화용 (없으면 일반 문구) — 표시 전용 */
  applicantName?: string | null;
  /** 결제 전 미리보기에서 이미 본 3문장 (검증된 경우에만 전달됨) */
  introLines?: string[] | null;
  /** 대기 중 재생할 월화 영상 (서버에서 존재 확인 후 전달, 순서 고정) */
  waitingVideos?: WaitingVideoItem[];
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"working" | "delayed">("working");
  const [msgIdx, setMsgIdx] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startedAt = useRef<number>(Date.now());
  const active = useRef(true);
  const inflight = useRef(false);
  const failRetries = useRef(0);

  /* 문구 순환 */
  useEffect(() => {
    if (phase !== "working") return;
    const id = setInterval(
      () => setMsgIdx((i) => (i + 1) % MESSAGES.length),
      4200
    );
    return () => clearInterval(id);
  }, [phase]);

  /* 실제 경과 시간만 표시한다. 가짜 진행률/퍼센트는 사용하지 않는다. */
  useEffect(() => {
    if (phase !== "working") return;
    const tick = () =>
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - startedAt.current) / 1000))
      );
    tick();
    const id = setInterval(tick, 1000);
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
        failRetries.current = 0;
        // 자동 처리 완료 후에만 세션 정리 → 결과 페이지로
        clearApplication();
        active.current = false;
        router.replace(json.resultPath);
        return;
      }
      if (
        json?.status === "processing" ||
        res.status === 504 ||
        (res.status === 502 && json === null)
      ) {
        failRetries.current = 0;
        scheduleNext();
        return;
      }

      /* 결제 후 transient failure는 사용자를 즉시 막지 않고 최대 3회 자동 복구.
         not_paid만 재시도하지 않는다. */
      if (json?.status !== "not_paid" && failRetries.current < 3) {
        failRetries.current += 1;
        setTimeout(callProcess, 6000);
        return;
      }
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
            setElapsedSeconds(0);
            active.current = true;
            failRetries.current = 0;
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

  const name = applicantName?.trim();
  const elapsedMin = Math.floor(elapsedSeconds / 60);
  const elapsedSec = elapsedSeconds % 60;
  const elapsedLabel =
    elapsedMin > 0
      ? `${elapsedMin}분 ${String(elapsedSec).padStart(2, "0")}초`
      : `${elapsedSec}초`;
  const longWait = elapsedSeconds >= 300;

  return (
    <main className="relative mx-auto h-[100svh] w-full max-w-md overflow-hidden bg-black">
      {/* 결제 후에만 노출되는 대기1~5 영상.
          native controls 없이 05→01→02→03→04가 자동으로 이어진다. */}
      <WaitingContent videos={waitingVideos} immersive />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-6 pt-[max(1.2rem,env(safe-area-inset-top))] text-center">
        <p className="text-[0.65rem] tracking-[0.34em] text-gold/90">月下緣</p>
        <div className="mt-4 inline-block rounded-full border border-white/15 bg-black/35 px-4 py-2 backdrop-blur">
          <p className="text-[0.68rem] tracking-[0.14em] text-thread/95">
            결제가 완료되었습니다
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-[15%] z-30 px-7 text-center">
        <p className="font-display text-[1.15rem] font-medium leading-[1.8] text-ivory">
          {name
            ? `${name}님의 전체 이야기를 이어서 읽고 있어요.`
            : "월화가 전체 이야기를 이어서 읽고 있어요."}
        </p>

        <div className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-2 backdrop-blur">
          <span className="text-[0.72rem] font-medium text-gold/95">
            예상 소요 약 2~5분
          </span>
          <span className="text-white/30">·</span>
          <span className="text-[0.72rem] text-ivory/80">
            현재 {elapsedLabel}
          </span>
        </div>

        <p
          key={msgIdx}
          className="mt-3 whitespace-pre-line text-[0.76rem] font-light leading-[1.8] text-ivory/75"
        >
          {longWait
            ? "평소보다 조금 오래 걸리고 있어요.\n생성 상태를 자동으로 다시 확인하고 있습니다."
            : MESSAGES[msgIdx]}
        </p>

        <p className="mt-2 text-[0.68rem] font-light leading-[1.7] text-ivory/55">
          전체 결과는 14개 파트와 21일 가이드까지 한 번에 준비해
          <br />
          무료 미리보기보다 시간이 더 필요합니다.
        </p>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-[max(6.8rem,calc(env(safe-area-inset-bottom)+5rem))] z-30 px-7 text-center">
        <p className="text-[0.72rem] font-light leading-[1.8] text-ivory/80">
          결과가 완성되면 영상이 끝나기를 기다리지 않고
          <br />
          자동으로 전체 결과가 열립니다.
        </p>
        <p className="mt-2 text-[0.66rem] leading-[1.7] text-ivory/50">
          결제는 이미 정상 완료되었으며 다시 청구되지 않습니다.
          <br />
          결과 완성 후 신청 이메일로도 안내됩니다.
        </p>
      </div>
    </main>
  );

}
