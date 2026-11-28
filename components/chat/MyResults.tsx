"use client";

import { useState } from "react";
import Link from "next/link";

export default function MyResults() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const send = async () => {
    setMsg(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setMsg({ ok: false, text: "이메일을 확인해 주세요." });
    setBusy(true);
    try {
      const r = await fetch("/api/chat/my", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      setMsg({ ok: !!j.ok, text: j.message ?? "잠시 후 다시 시도해 주세요." });
    } catch {
      setMsg({ ok: false, text: "잠시 후 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <p className="fx-kicker text-gold">My report</p>
      <h1 className="font-display mt-3 text-[1.6rem] font-bold leading-snug text-ivory">
        내 카톡 분석 결과
        <br />
        다시 보기
      </h1>
      <p className="mt-3 text-[0.9rem] leading-[1.8] text-ivory-dim">결제할 때 적은 이메일을 넣으면, 결과 링크를 메일로 다시 보내 드려요. 결과는 결제일부터 30일 동안 열 수 있어요.</p>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="example@naver.com"
        className="mt-6 h-13 w-full rounded-xl border border-gold-dim bg-ink px-4 py-3.5 text-ivory placeholder:text-ivory-dim/50"
      />
      <button type="button" onClick={send} disabled={busy} className="mt-3 flex min-h-14 w-full items-center justify-center rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep font-semibold text-ivory disabled:opacity-60">
        {busy ? "보내는 중…" : "결과 링크 메일로 받기"}
      </button>
      {msg && <p className={`mt-3 text-[0.86rem] leading-[1.7] ${msg.ok ? "text-ivory" : "text-thread"}`}>{msg.text}</p>}
      <p className="mt-8 text-[0.8rem] leading-[1.8] text-ivory-dim">
        메일이 안 오면 오른쪽 아래 고객센터로 알려 주세요. · <Link href="/chat" className="underline">카톡 분석 처음으로</Link>
      </p>
    </div>
  );
}
