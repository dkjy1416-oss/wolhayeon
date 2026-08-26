"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy || secret.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      if (res.ok) {
        router.replace("/admin/orders");
        return;
      }
      setError("비밀번호가 올바르지 않습니다.");
    } catch {
      setError("로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(false);
      setSecret("");
    }
  };

  return (
    <div className="w-full max-w-sm">
      <input
        type="password"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="관리자 비밀번호"
        autoFocus
        className="h-14 w-full rounded-xl border border-gold-dim/30 bg-ink-soft px-5 text-base text-ivory placeholder:text-ivory-dim/40 focus:border-gold/60 focus:outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={busy || secret.length === 0}
        className="mt-4 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory active:opacity-85 disabled:opacity-50"
      >
        {busy ? "확인 중…" : "로그인"}
      </button>
      {error && <p className="mt-4 text-center text-sm text-thread">{error}</p>}
    </div>
  );
}
