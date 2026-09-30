"use client";

import { useState } from "react";

interface Recipient {
  order: string;
  name: string;
  email: string;
}

export default function ApologyConsole({
  defaultOrders,
}: {
  defaultOrders: string[];
}) {
  const [text, setText] = useState(defaultOrders.join("\n"));
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{
    recipients: Recipient[];
    found: number;
    alreadyPaidOrOther: number;
  } | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const orders = () =>
    text
      .split(/[\s,]+/)
      .map((v) => v.trim())
      .filter(Boolean);

  const call = async (mode: "preview" | "send") => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/apology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumbers: orders(), mode }),
      });
      const j = await res.json();
      if (!j.ok) {
        setResult(`실패: ${j.error ?? res.status}`);
      } else if (mode === "preview") {
        setPreview({
          recipients: j.recipients,
          found: j.found,
          alreadyPaidOrOther: j.alreadyPaidOrOther,
        });
      } else {
        setResult(
          `완료 — 쿠폰 적용 주문 ${j.couponApplied}건 · 메일 발송 ${j.sent}통 · 실패 ${j.failed}통`
        );
      }
    } catch {
      setResult("요청 중 오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6">
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setPreview(null);
        }}
        rows={8}
        className="w-full rounded-xl border border-ivory/20 bg-ink/60 p-3 font-mono text-[0.78rem] text-ivory"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => call("preview")}
          className="rounded-full border border-gold-dim/50 px-5 py-2.5 text-[0.85rem] text-ivory disabled:opacity-50"
        >
          대상 확인
        </button>
        <button
          type="button"
          disabled={busy || !preview || preview.recipients.length === 0}
          onClick={() => call("send")}
          className="rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep px-5 py-2.5 text-[0.85rem] text-ivory disabled:opacity-40"
        >
          쿠폰 적용 + 메일 발송
        </button>
      </div>

      {preview && (
        <div className="mt-5 rounded-xl border border-gold-dim/25 bg-ink-soft/50 px-5 py-4 text-[0.82rem] leading-[1.9]">
          <p>
            주문 {preview.found}건 조회 · 발송 대상{" "}
            <b className="text-gold">{preview.recipients.length}명</b>
            {preview.alreadyPaidOrOther > 0 && (
              <span className="text-ivory-dim">
                {" "}
                (결제완료·이메일 오류 등 제외 {preview.alreadyPaidOrOther}건)
              </span>
            )}
          </p>
          <ul className="mt-2">
            {preview.recipients.map((r) => (
              <li key={r.order} className="flex justify-between gap-3">
                <span>{r.name || "(이름 없음)"}</span>
                <span className="text-ivory-dim">{r.email}</span>
                <span className="font-mono text-[0.72rem] text-ivory-dim/70">
                  {r.order}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <p className="mt-4 text-[0.85rem] text-gold">{result}</p>
      )}
    </div>
  );
}
