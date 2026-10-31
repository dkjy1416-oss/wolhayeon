"use client";

/** 결제 후 분석 진행 화면 — /api/chat/process 를 불러 결과가 나오면 결과 화면으로 */
import { useEffect, useRef, useState } from "react";

const LINES = [
  "캡처를 순서대로 읽고 있어요",
  "누가 먼저, 얼마나 길게 말했는지 보고 있어요",
  "답장이 달라지기 시작한 지점을 찾고 있어요",
  "지금 보내면 안 되는 말을 고르고 있어요",
  "다음에 보낼 메시지를 다듬고 있어요",
];

export default function ChatProcessing({ orderNumber, token }: { orderNumber: string; token: string }) {
  const [i, setI] = useState(0);
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % LINES.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let tries = 0;
    const run = async () => {
      tries++;
      try {
        const r = await fetch("/api/chat/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber, t: token }),
        });
        const j = (await r.json()) as { status?: string; resultPath?: string };
        if (j.status === "ready" && j.resultPath) return void window.location.replace(j.resultPath);
        if (j.status === "failed") return setFailed(true);
      } catch {
        /* 네트워크 끊김 — 다시 시도 */
      }
      if (tries < 40) setTimeout(run, 6000);
      else setFailed(true);
    };
    run();
  }, [orderNumber, token]);

  return (
    <div className="mx-auto flex min-h-[80svh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-xs tracking-[0.35em] text-gold">月下緣</p>
      {failed ? (
        <>
          <h1 className="font-display mt-6 text-[1.4rem] font-semibold text-ivory">분석이 조금 늦어지고 있어요</h1>
          <p className="mt-4 text-[0.92rem] leading-[1.9] text-ivory-dim">
            결제는 정상적으로 완료됐어요. 운영자에게 자동으로 알림이 갔고,
            <br />
            완성되면 적어 주신 이메일로 결과 링크를 보내 드려요.
            <br />
            주문번호 {orderNumber}
          </p>
        </>
      ) : (
        <>
          <div className="mt-8 h-10 w-10 animate-spin rounded-full border-2 border-[#e46b8a]/70 border-t-transparent" />
          <h1 className="font-display mt-6 text-[1.35rem] font-semibold text-ivory">결제가 완료됐어요</h1>
          <p className="mt-3 text-[0.95rem] text-ivory">{LINES[i]}</p>
          <p className="mt-2 text-[0.8rem] text-ivory-dim">보통 1~2분 걸려요. 창을 닫아도 결과는 메일로 보내 드려요.</p>
        </>
      )}
    </div>
  );
}
