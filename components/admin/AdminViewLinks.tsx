"use client";

/**
 * 11/17 운영자 요청: 관리자 화면에서 손님이 본 미리보기·전체 결과를 그대로 열어 보기.
 * - 미리보기: 서명된 미리보기 링크 + admin=1 (관리자가 연 것은 방문·결제 통계에 남기지 않음)
 * - 전체 결과: 결과가 만들어진 주문만 (결제 후 생성)
 * - 운영자(테스트) 이메일의 결제 전 주문: 결제 없이 전체 결과 만들기
 */
import { useState } from "react";

export default function AdminViewLinks({
  orderNumber,
  previewHref,
  resultHref,
  canFree,
}: {
  orderNumber: string;
  previewHref: string | null;
  resultHref: string | null;
  canFree: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const free = async () => {
    if (busy) return;
    if (!confirm("이 테스트 주문을 결제 없이 결제 완료로 바꾸고 전체 결과를 만들까요?")) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/free-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber }),
      });
      const j = await r.json().catch(() => null);
      if (j?.ok && j.redirect) window.open(j.redirect, "_blank", "noopener");
      else setMsg(j?.error === "not_operator_order" ? "손님 주문은 무료로 바꿀 수 없어요 (운영자 테스트 이메일 주문만)." : "처리하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };
  const btn = "inline-flex h-9 items-center rounded-full border border-gold/50 px-4 text-xs text-gold hover:bg-gold/10";
  return (
    <div className="mt-3 rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-3.5">
      <p className="text-[0.68rem] tracking-wide text-gold/80">관리자로 보기 (손님 화면 그대로)</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {previewHref ? (
          <a href={previewHref} target="_blank" rel="noopener" className={btn}>
            미리보기 열기
          </a>
        ) : (
          <span className="text-xs text-ivory-dim">미리보기 링크를 만들 수 없어요</span>
        )}
        {resultHref ? (
          <a href={resultHref} target="_blank" rel="noopener" className={btn}>
            전체 결과 열기
          </a>
        ) : (
          <span className="self-center text-xs text-ivory-dim">전체 결과: 결제 후 만들어져요</span>
        )}
        {canFree && (
          <button type="button" onClick={free} disabled={busy} className={`${btn} border-dashed border-thread/60 text-thread`}>
            {busy ? "처리 중…" : "결제 없이 전체 결과 만들기 (테스트 주문)"}
          </button>
        )}
      </div>
      {msg && <p className="mt-2 text-xs text-thread">{msg}</p>}
    </div>
  );
}
