"use client";

/**
 * 11/17 운영자 요청 — 결제 시트 X·토스 결제 취소 뒤 붙잡는 카드를 '월화 영상 + 큰 타이머 + 큰 할인 금액' 형태로.
 * 문구는 사실만: 첫 구매 할인은 실제 종료 시각(offerEndsAt)까지 유지된다 → "지금 나가면 사라진다"가 아니라
 * "이 시간이 지나면 사라진다"로 쓰고, 남은 시간을 1초 단위로 실제로 보여 준다.
 */
import { useEffect, useState, type ReactNode } from "react";

function parts(ms: number): string[] {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.min(99, Math.floor(s / 3600));
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0"));
}

function Digits({ ms }: { ms: number }) {
  const [h, m, s] = parts(ms);
  const box = (v: string, k: string) => (
    <span key={k} className="flex gap-[3px]">
      {v.split("").map((c, i) => (
        <span
          key={i}
          className="flex h-[1.9rem] w-[1.45rem] items-center justify-center rounded-md bg-black text-[1.15rem] font-extrabold tabular-nums text-[#ff7a9a]"
        >
          {c}
        </span>
      ))}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3a1a22] py-1.5 pl-3 pr-2" role="timer" aria-label={`남은 시간 ${h}시간 ${m}분 ${s}초`}>
      <svg viewBox="0 0 24 24" aria-hidden className="mr-0.5 h-5 w-5 text-[#ff7a9a]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2M9 2h6" />
      </svg>
      {box(h, "h")}
      <span className="font-bold text-[#ff7a9a]">:</span>
      {box(m, "m")}
      <span className="font-bold text-[#ff7a9a]">:</span>
      {box(s, "s")}
    </span>
  );
}

export default function HoldCard({
  saved,
  offerEndsAt,
  regular,
  title,
  stayLabel = "할인 받고 계속하기",
  leaveLabel = "나가기",
  onStay,
  onLeave,
  onClose,
  children,
}: {
  /** 할인 금액 (원) */
  saved: number;
  offerEndsAt?: number | null;
  regular?: number;
  /** 할인이 없을 때 쓸 제목 */
  title?: ReactNode;
  stayLabel?: string;
  leaveLabel?: string;
  onStay: () => void;
  onLeave: () => void;
  onClose?: () => void;
  children?: ReactNode;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = offerEndsAt ? offerEndsAt - now : 0;
  const offerOn = !!offerEndsAt && left > 0 && saved > 0;

  return (
    <div className="w-full max-w-[360px] overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#19161a] text-left shadow-[0_24px_70px_rgba(0,0,0,0.65)]">
      <div className="relative aspect-[5/4] w-full overflow-hidden bg-black">
        <video
          src="/wolhwa/v4/wait.mp4"
          poster="/wolhwa/v4/wait.webp"
          autoPlay
          muted
          loop
          playsInline
          aria-label="말을 건네는 월화"
          className="h-full w-full object-cover object-[50%_18%]"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-[#19161a]" />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-[1rem] text-white"
          >
            ✕
          </button>
        )}
      </div>
      <div className="relative z-10 -mt-6 px-6 pb-6">
        {offerOn && <Digits ms={left} />}
        <p className="mt-4 break-keep text-[1.6rem] font-extrabold leading-[1.35] tracking-[-0.02em] text-[#f7f0e8]">
          {offerOn ? (
            <>
              받은{" "}
              <span className="rounded-lg bg-[#3a1a22] px-2 py-0.5 text-[#ff7a9a]">{saved.toLocaleString()}원</span>
              <br />
              할인이 곧 사라져요
            </>
          ) : (
            title ?? "잠깐, 이대로 나가시겠어요?"
          )}
        </p>
        {offerOn && regular ? (
          <p className="mt-2 text-[0.82rem] leading-[1.7] text-[#cfc4bd]">
            첫 구매 할인은 신청하고 24시간만 적용돼요. 시간이 지나면 {regular.toLocaleString()}원이에요.
          </p>
        ) : null}
        {children}
        <button
          type="button"
          onClick={onStay}
          className="mt-6 flex h-[56px] w-full items-center justify-center rounded-full bg-[#ff2d6f] text-[1.05rem] font-bold text-white shadow-[0_10px_30px_rgba(255,45,111,0.35)] active:scale-[0.99]"
        >
          {stayLabel}
        </button>
        <button type="button" onClick={onLeave} className="mt-3 w-full py-2 text-center text-[0.95rem] text-[#9d938c]">
          {leaveLabel}
        </button>
      </div>
    </div>
  );
}
