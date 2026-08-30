"use client";

/** 관리자 상세: AI 결과 생성 버튼 (secret/개인정보 client 전달 없음) */
import { useState } from "react";
import { useRouter } from "next/navigation";

const ERROR_TEXT: Record<string, string> = {
  not_paid: "결제 완료(paid) 주문만 생성할 수 있습니다.",
  already_generated: "이미 생성된 주문입니다.",
  already_generating: "다른 생성 요청이 진행 중입니다. 잠시 후 새로고침해주세요.",
  not_reviewable: "검수 상태가 대기(waiting)인 주문만 생성할 수 있습니다.",
  not_found: "주문을 찾을 수 없습니다.",
  generation_failed:
    "생성에 실패했습니다. 잠시 후 같은 버튼으로 다시 시도할 수 있습니다.",
  unauthorized: "세션이 만료되었습니다. 다시 로그인해주세요.",
};

export default function GenerateResultButton({
  orderNumber,
}: {
  orderNumber: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        setMsg({ ok: true, text: "AI 결과 생성이 완료되었습니다." });
        router.refresh();
      } else {
        setMsg({
          ok: false,
          text:
            ERROR_TEXT[json?.error as string] ??
            "생성 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
        });
      }
    } catch {
      setMsg({
        ok: false,
        text: "요청 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5 flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="inline-flex h-12 items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep px-8 text-sm font-medium text-ivory active:opacity-85 disabled:opacity-50"
      >
        {busy ? "AI 결과 생성 중…" : "AI 결과 생성"}
      </button>
      {busy && (
        <p className="text-xs text-ivory-dim">
          1~2분 정도 걸릴 수 있습니다. 창을 닫지 말고 기다려주세요.
        </p>
      )}
      {msg && (
        <p className={`text-xs ${msg.ok ? "text-emerald-400" : "text-thread"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
