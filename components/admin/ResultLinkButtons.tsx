"use client";

/**
 * 승인 완료된 결과의 고객 링크 (관리자 전용).
 * result_token은 승인된 링크 생성 용도로만 사용 — 서버 secret은
 * 클라이언트에 전달되지 않습니다.
 */
import { useState } from "react";

export default function ResultLinkButtons({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/result/${token}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard 권한이 없으면 선택 안내
      window.prompt("아래 링크를 복사하세요:", `${window.location.origin}${path}`);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={path}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border border-gold/50 px-4 py-1.5 text-xs text-gold hover:border-gold"
      >
        고객 결과 열기 ↗
      </a>
      <button
        type="button"
        onClick={copy}
        className="rounded-full border border-gold-dim/40 px-4 py-1.5 text-xs text-ivory-dim hover:border-gold/60 hover:text-ivory"
      >
        {copied ? "✓ 복사됨" : "고객 링크 복사"}
      </button>
    </div>
  );
}
