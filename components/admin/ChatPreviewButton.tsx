"use client";
import { useState } from "react";

export default function ChatPreviewButton({ orderNumber, again = false }: { orderNumber: string; again?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setMsg("AI가 대화를 읽는 중이에요 (1~2분)…");
    try {
      const r = await fetch("/api/admin/chat/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber }) });
      const j = (await r.json()) as { ok: boolean; status?: string };
      if (j.ok) return void window.location.reload();
      setMsg(j.status === "no_input" ? "올린 대화·캡처가 없어요 (삭제됐거나 업로드 전)." : "생성에 실패했어요. 다시 눌러 주세요.");
    } catch {
      setMsg("시간이 오래 걸리고 있어요. 1~2분 뒤 새로고침해 보세요.");
    }
    setBusy(false);
  };
  return (
    <div>
      <button type="button" disabled={busy} onClick={run} className="rounded-full border border-gold/50 px-4 py-2 text-[0.82rem] text-gold disabled:opacity-50">
        {busy ? "만드는 중…" : again ? "AI 결과 다시 만들기" : "결제 없이 AI 결과 미리 만들기"}
      </button>
      {msg && <p className="mt-2 text-[0.8rem] text-ivory-dim">{msg}</p>}
    </div>
  );
}
