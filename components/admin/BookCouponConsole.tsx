"use client";

/** 책 출간 안내 + 3,000원 책 쿠폰 메일 — 대상 확인 → 메일 미리보기 → 발송 */
import { useState } from "react";

interface Recipient {
  order: string;
  name: string;
  email: string;
  paid: boolean;
}

export default function BookCouponConsole({ defaultOrders }: { defaultOrders: string[] }) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ recipients: Recipient[]; subject: string | null; html: string | null } | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const call = async (mode: "preview" | "send") => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/apology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumbers: defaultOrders, mode, campaign: "book" }),
      });
      const j = await res.json();
      if (!j.ok) setResult(`실패: ${j.error ?? res.status}`);
      else if (mode === "preview") setPreview({ recipients: j.recipients, subject: j.sampleSubject, html: j.sampleHtml });
      else setResult(`완료 — 책 쿠폰 주문 생성 ${j.created}건 · 메일 발송 ${j.sent}통 · 실패 ${j.failed}통`);
    } catch {
      setResult("요청 중 오류가 발생했어요.");
    } finally {
      setBusy(false);
      setConfirmSend(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => call("preview")}
          className="rounded-full border border-gold-dim/50 px-5 py-2.5 text-[0.85rem] text-ivory disabled:opacity-50"
        >
          대상 확인 · 메일 미리보기
        </button>
        {!confirmSend ? (
          <button
            type="button"
            disabled={busy || !preview || preview.recipients.length === 0}
            onClick={() => setConfirmSend(true)}
            className="rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep px-5 py-2.5 text-[0.85rem] text-ivory disabled:opacity-40"
          >
            책 쿠폰 메일 발송
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => call("send")}
            className="rounded-full bg-thread px-5 py-2.5 text-[0.85rem] text-ivory disabled:opacity-40"
          >
            {busy ? "보내는 중…" : `정말 ${preview?.recipients.length ?? 0}명에게 보낼게요`}
          </button>
        )}
      </div>

      {preview && (
        <div className="mt-5 rounded-xl border border-gold-dim/25 bg-ink-soft/50 px-5 py-4 text-[0.82rem] leading-[1.9]">
          <p>
            발송 대상 <b className="text-gold">{preview.recipients.length}명</b> (같은 사람의 여러 주문은 1통)
          </p>
          <ul className="mt-2">
            {preview.recipients.map((r) => (
              <li key={r.order} className="flex justify-between gap-3">
                <span>{r.name || "(이름 없음)"}</span>
                <span className="text-ivory-dim">{r.email}</span>
                <span className={r.paid ? "text-emerald-400" : "text-ivory-dim/70"}>{r.paid ? "메시지 결제함" : "미결제 · 메시지 쿠폰도 안내"}</span>
              </li>
            ))}
          </ul>
          {preview.html && (
            <>
              <p className="mt-4 text-[0.75rem] text-gold">메일 미리보기 — 제목: {preview.subject}</p>
              <iframe
                title="메일 미리보기"
                srcDoc={preview.html}
                className="mt-2 h-[640px] w-full rounded-lg border border-gold-dim/25 bg-black"
              />
            </>
          )}
        </div>
      )}

      {result && <p className="mt-4 text-[0.85rem] text-gold">{result}</p>}
    </div>
  );
}
