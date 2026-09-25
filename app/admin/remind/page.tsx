"use client";

/**
 * /admin/remind — 미결제 리마인드 메일 발송 콘솔 (관리자 전용)
 *
 * 1) 관리자 비밀번호 입력 → "대상 확인"으로 발송 대상 인원 조회
 * 2) 인원 확인 후 "발송하기" → 실제 발송 (주문당 1회만, 재실행해도 중복 없음)
 */
import { useState } from "react";

type ApiResult = {
  ok: boolean;
  error?: string;
  code?: string;
  eligible?: number;
  sent?: number;
  failed?: number;
  errors?: string[];
};

export default function AdminRemindPage() {
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [lastMode, setLastMode] = useState<"count" | "send" | null>(null);

  const call = async (mode: "count" | "send") => {
    if (!secret.trim()) return;
    if (
      mode === "send" &&
      !window.confirm(
        `정말 발송할까요?\n대상: 미결제 + 수신동의 + 미발송자 (주문당 1회)`
      )
    )
      return;
    setBusy(true);
    setResult(null);
    setLastMode(mode);
    try {
      const res = await fetch("/api/admin/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret: secret, mode }),
      });
      setResult((await res.json()) as ApiResult);
    } catch {
      setResult({ ok: false, error: "network_error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-md px-6 py-16 text-ivory">
      <h1 className="font-display text-xl font-semibold">
        리마인드 메일 발송
      </h1>
      <p className="mt-3 text-[0.85rem] leading-[1.9] text-ivory-dim">
        미결제 + 수신동의 + 아직 안 보낸 신청자에게
        &ldquo;이어보기&rdquo; 메일을 보냅니다. (신청 12시간~14일 경과자)
      </p>

      <label className="mt-8 block text-[0.8rem] text-ivory-dim">
        관리자 비밀번호
      </label>
      <input
        type="password"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        className="mt-2 w-full rounded-lg border border-gold-dim/30 bg-ink-soft px-4 py-3 text-[0.95rem] text-ivory outline-none"
        placeholder="RITUAL_ADMIN_SECRET"
        autoComplete="off"
      />

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => call("count")}
          disabled={busy || !secret.trim()}
          className="h-12 flex-1 rounded-full border border-gold-dim/40 text-[0.9rem] disabled:opacity-40"
        >
          {busy && lastMode === "count" ? "확인 중…" : "대상 확인"}
        </button>
        <button
          onClick={() => call("send")}
          disabled={busy || !secret.trim()}
          className="h-12 flex-1 rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.9rem] text-ivory disabled:opacity-40"
        >
          {busy && lastMode === "send" ? "발송 중…" : "발송하기"}
        </button>
      </div>

      {result && (
        <div className="mt-8 rounded-xl border border-gold-dim/25 bg-ink-soft/70 px-5 py-5 text-[0.88rem] leading-[1.9]">
          {result.ok ? (
            <>
              <p>발송 대상: {result.eligible}명</p>
              {typeof result.sent === "number" && (
                <>
                  <p className="text-gold">발송 완료: {result.sent}명</p>
                  {result.failed ? (
                    <p className="text-thread">실패: {result.failed}명</p>
                  ) : null}
                </>
              )}
            </>
          ) : (
            <p className="text-thread">
              오류: {result.error}
              {result.code === "42703"
                ? " — Supabase에서 remind_sent_at 컬럼 SQL을 먼저 실행하세요."
                : result.error === "unauthorized"
                  ? " — 비밀번호가 일치하지 않습니다."
                  : ""}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
