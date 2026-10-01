"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminReview } from "@/lib/reviews";

const LABEL: Record<string, string> = { message: "메시지", book: "책", bundle: "메시지 + 책" };
const STATUS: Record<AdminReview["status"], string> = {
  pending: "확인 전",
  approved: "공개 중",
  hidden: "숨김",
};

export default function ReviewAdminList({ initial }: { initial: AdminReview[] }) {
  const [list, setList] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const act = async (id: number, action: "approve" | "hide" | "pending") => {
    setBusy(id);
    setErr(null);
    try {
      const r = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const j = await r.json().catch(() => null);
      if (!j?.ok) throw new Error();
      const status = action === "approve" ? "approved" : action === "hide" ? "hidden" : "pending";
      setList((l) => l.map((x) => (x.id === id ? { ...x, status } : x)));
    } catch {
      setErr("바꾸지 못했어요. 다시 눌러 주세요.");
    } finally {
      setBusy(null);
    }
  };

  if (list.length === 0) {
    return (
      <p className="rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-6 text-sm text-ivory-dim">
        아직 들어온 후기가 없어요. 손님이 남기면 여기에 쌓여요.
      </p>
    );
  }

  const pending = list.filter((x) => x.status === "pending").length;
  return (
    <div className="space-y-3">
      <p className="text-[0.8rem] text-ivory-dim">
        전체 {list.length}개 · 확인 전 <b className="text-gold">{pending}</b>개 · 공개 중{" "}
        {list.filter((x) => x.status === "approved" && x.consent_public).length}개
      </p>
      {err && <p className="text-xs text-thread">{err}</p>}
      {list.map((r) => (
        <div key={r.id} className="rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.76rem] text-ivory-dim">
            <span className="text-gold">{"★".repeat(r.rating)}<span className="text-ivory-dim/30">{"★".repeat(5 - r.rating)}</span></span>
            <span>{r.display_name?.trim() || "익명"}</span>
            <span>{LABEL[r.product] ?? r.product}</span>
            <Link href={`/admin/orders/${r.order_number}`} className="underline underline-offset-2">
              {r.order_number}
            </Link>
            <span>{new Date(r.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</span>
            <span
              className={`rounded-full px-2 py-0.5 ${
                r.status === "approved" ? "bg-gold/15 text-gold" : r.status === "hidden" ? "bg-ink text-ivory-dim" : "bg-thread/15 text-thread"
              }`}
            >
              {STATUS[r.status]}
            </span>
            {!r.consent_public && <span className="text-thread">공개 동의 안 함 (공개 불가)</span>}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[0.88rem] leading-[1.85] text-ivory">{r.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {r.status !== "approved" && r.consent_public && (
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => act(r.id, "approve")}
                className="rounded-full border border-gold/50 px-4 py-1.5 text-xs text-gold disabled:opacity-50"
              >
                공개
              </button>
            )}
            {r.status !== "hidden" && (
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => act(r.id, "hide")}
                className="rounded-full border border-gold-dim/40 px-4 py-1.5 text-xs text-ivory-dim disabled:opacity-50"
              >
                숨김
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
