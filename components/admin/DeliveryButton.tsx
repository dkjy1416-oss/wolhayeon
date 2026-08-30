"use client";

/** 승인된 주문의 결과 이메일 발송 상태 표시 + 수동 발송/재시도 */
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeliveryButton({
  orderNumber,
  deliveryStatus,
  deliveredAt,
  errorCode,
  toEmail,
}: {
  orderNumber: string;
  deliveryStatus: string;
  deliveredAt: string | null;
  errorCode: string | null;
  toEmail: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const send = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber }),
      });
      const json = await res.json().catch(() => null);
      if (json?.delivery === "sent") setMsg("발송이 완료되었습니다.");
      else if (json?.delivery === "already_sent")
        setMsg("이미 발송된 주문입니다.");
      else if (json?.delivery === "sending_in_progress")
        setMsg("다른 발송 처리가 진행 중입니다.");
      else if (json?.delivery === "invalid_recipient")
        setMsg("수신 이메일 주소가 올바르지 않습니다.");
      else if (json?.delivery === "config_missing")
        setMsg("발송 설정(RESEND 환경변수)이 완료되지 않았습니다.");
      else setMsg("발송에 실패했습니다. 잠시 후 다시 시도해주세요.");
      router.refresh();
    } catch {
      setMsg("요청 중 문제가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 border-t border-gold-dim/20 pt-3">
      <p className="text-xs text-ivory-dim">
        결과 수신 이메일: <span className="text-ivory">{toEmail}</span>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2.5">
        {deliveryStatus === "sent" ? (
          <>
            <span className="rounded-full border border-emerald-500/60 px-3 py-1 text-xs text-emerald-400">
              ✓ 이메일 발송 완료
            </span>
            {deliveredAt && (
              <span className="text-[0.7rem] text-ivory-dim">
                {new Date(deliveredAt).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })}
              </span>
            )}
          </>
        ) : deliveryStatus === "sending" ? (
          <>
            <span className="rounded-full border border-gold/50 px-3 py-1 text-xs text-gold">
              이메일 발송 처리 중
            </span>
            <button
              type="button"
              disabled
              className="rounded-full border border-gold-dim/40 px-4 py-1.5 text-xs text-ivory-dim opacity-40"
            >
              결과 이메일 발송
            </button>
          </>
        ) : deliveryStatus === "failed" ? (
          <>
            <span className="rounded-full border border-thread/60 px-3 py-1 text-xs text-thread">
              이메일 발송 실패
            </span>
            {errorCode && (
              <span className="text-[0.7rem] text-ivory-dim">
                코드: {errorCode}
              </span>
            )}
            <button
              type="button"
              onClick={send}
              disabled={busy}
              className="rounded-full border border-gold/50 px-4 py-1.5 text-xs text-gold hover:border-gold disabled:opacity-40"
            >
              {busy ? "발송 중…" : "이메일 다시 시도"}
            </button>
          </>
        ) : (
          <>
            <span className="rounded-full border border-gold-dim/40 px-3 py-1 text-xs text-ivory-dim">
              이메일 미발송
            </span>
            <button
              type="button"
              onClick={send}
              disabled={busy}
              className="rounded-full border border-gold/50 px-4 py-1.5 text-xs text-gold hover:border-gold disabled:opacity-40"
            >
              {busy ? "발송 중…" : "결과 이메일 발송"}
            </button>
          </>
        )}
      </div>
      {msg && <p className="mt-2 text-xs text-ivory-dim">{msg}</p>}
    </div>
  );
}
