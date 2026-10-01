"use client";

/** 주문 고객에게 운영자 안내 메일 보내기 (공식 발신자 · 화면 안 확인 단계, 브라우저 팝업 없음) */
import { useState } from "react";

export default function CustomerEmailForm({
  orderNumber,
  toEmail,
}: {
  orderNumber: string;
  toEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const send = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/customer-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, subject, body }),
      });
      const json = await res.json().catch(() => null);
      if (json?.ok) setMsg("✓ 메일을 보냈습니다.");
      else if (json?.error === "invalid_content") setMsg("제목과 내용을 확인해주세요.");
      else if (json?.error === "invalid_recipient") setMsg("고객 이메일 주소가 올바르지 않습니다.");
      else if (json?.error === "config_missing") setMsg("발송 설정(RESEND)이 없습니다.");
      else setMsg("발송에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } catch {
      setMsg("요청 중 문제가 발생했습니다.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 rounded-full border border-gold-dim/40 px-4 py-1.5 text-xs text-ivory-dim hover:text-gold"
      >
        ✉ 고객에게 메일 보내기
      </button>
    );
  }

  const ready = subject.trim().length > 0 && body.trim().length > 0;

  return (
    <div className="mt-4 rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
      <p className="text-xs tracking-wide text-gold/85">고객에게 메일 보내기</p>
      <p className="mt-1 text-[0.72rem] text-ivory-dim">
        받는 사람: <span className="text-ivory">{toEmail}</span> · 보내는 사람: 월화 (공식 주소)
      </p>
      <input
        name="customer-email-subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="제목"
        className="mt-3 w-full rounded-lg border border-gold-dim/30 bg-ink px-3 py-2 text-sm text-ivory"
      />
      <textarea
        name="customer-email-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="내용"
        rows={12}
        className="mt-2 w-full rounded-lg border border-gold-dim/30 bg-ink px-3 py-2 text-sm leading-relaxed text-ivory"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        {!confirming ? (
          <button
            type="button"
            disabled={!ready || busy}
            onClick={() => setConfirming(true)}
            className="rounded-full border border-gold/50 px-4 py-1.5 text-xs text-gold disabled:opacity-40"
          >
            보내기
          </button>
        ) : (
          <>
            <span className="text-xs text-ivory">{toEmail} 로 보낼까요?</span>
            <button
              type="button"
              disabled={busy}
              onClick={send}
              className="rounded-full bg-gold/90 px-4 py-1.5 text-xs text-ink disabled:opacity-40"
            >
              {busy ? "보내는 중…" : "네, 보내기"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="rounded-full border border-gold-dim/40 px-4 py-1.5 text-xs text-ivory-dim"
            >
              취소
            </button>
          </>
        )}
        {msg && <span className="text-xs text-ivory-dim">{msg}</span>}
      </div>
    </div>
  );
}
