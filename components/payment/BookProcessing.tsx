"use client";

/**
 * 결제 완료 후 개인화 책 제작 (책 단품: 화면 표시 / 패키지: 조용히 백그라운드 시작).
 * 서명된 processToken으로 /api/books/process 를 호출하고, 준비되면 다운로드 버튼을 보여준다.
 * 화면을 닫아도 서버에서 제작이 이어지고, 완성되면 메일로도 링크가 간다.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function BookProcessing({
  orderNumber,
  processToken,
  applicantName,
  silent = false,
}: {
  orderNumber: string;
  processToken: string;
  applicantName: string | null;
  silent?: boolean;
}) {
  const [state, setState] = useState<"working" | "ready" | "delayed">("working");
  const [path, setPath] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let tries = 0;
    const run = async () => {
      tries += 1;
      try {
        const res = await fetch("/api/books/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber, processToken }),
          keepalive: silent,
        });
        const j = await res.json().catch(() => null);
        if (j?.status === "ready" && typeof j.downloadPath === "string") {
          setPath(j.downloadPath);
          setState("ready");
          return;
        }
      } catch {
        /* 네트워크 끊김 — 아래 재시도 */
      }
      if (tries < 12) setTimeout(run, 10_000);
      else setState("delayed");
    };
    run();
  }, [orderNumber, processToken, silent]);

  if (silent) return null;

  const name = applicantName?.trim();
  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-xs tracking-[0.35em] text-gold/90">月下緣</p>
      {state === "ready" && path ? (
        <>
          <h1 className="font-display mt-6 text-2xl font-semibold leading-[1.55] text-ivory">
            {name ? `${name}님을 위한 책이` : "당신을 위한 책이"}
            <br />
            완성되었어요.
          </h1>
          <p className="mt-5 text-[0.9rem] font-light leading-[2] text-ivory-dim">
            《헤어진 뒤, 연락하지 말아야 할 때》
            <br />
            같은 링크를 메일로도 보내드렸어요. (60일 동안 열려요)
          </p>
          <a
            href={path}
            className="cta-glow mt-9 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory"
          >
            내 책 PDF 받기
          </a>
        </>
      ) : state === "delayed" ? (
        <>
          <h1 className="font-display mt-6 text-2xl font-semibold leading-[1.55] text-ivory">
            책을 마무리하는 데
            <br />
            조금 더 걸리고 있어요.
          </h1>
          <p className="mt-5 text-[0.9rem] font-light leading-[2] text-ivory-dim">
            완성되는 대로 신청서에 적어주신 이메일로
            <br />
            다운로드 링크를 보내드릴게요.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-display mt-6 text-2xl font-semibold leading-[1.55] text-ivory">
            {name ? `${name}님의 이야기로` : "당신의 이야기로"}
            <br />
            한 권을 엮고 있어요.
          </h1>
          <p className="mt-5 text-[0.9rem] font-light leading-[2] text-ivory-dim">
            표지와 편지, 지금의 판정과 메시지 초안을
            <br />
            쓰는 데 1~3분 정도 걸려요.
            <br />
            화면을 닫아도 완성되면 메일로 보내드려요.
          </p>
          <div className="mt-9 h-1 w-40 overflow-hidden rounded-full bg-gold-dim/20">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-gold/60" />
          </div>
        </>
      )}
      <p className="mt-10 text-[0.7rem] text-ivory-dim/50">주문번호 {orderNumber}</p>
      <Link href="/" className="mt-4 text-xs text-ivory-dim/60 underline underline-offset-4">
        홈으로
      </Link>
    </main>
  );
}
