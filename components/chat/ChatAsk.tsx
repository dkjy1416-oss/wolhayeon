"use client";

/**
 * 11/28: 리포트 뒤 '월화에게 묻기' — 무료 1번, 추가 3번 4,900원 (대표 결정)
 */
import { useState } from "react";
import TossCheckout from "@/components/pay/TossCheckout";
import { sendSiteEvent } from "@/lib/site-track";
import { ASK_PACK_COUNT, ASK_PACK_PRICE_KRW, type ChatAsk as Ask } from "@/lib/chat/types";

const EXAMPLES = ["지금 먼저 연락해도 될까요?", "답장이 늦을 때 뭐라고 보내면 좋을까요?", "제가 제일 먼저 고쳐야 할 말 습관은요?"];

export default function ChatAsk(props: {
  orderNumber: string;
  token: string;
  partner: string;
  initialAsks: Ask[];
  initialLeft: number;
  clientKey: string | null;
  payOrderId: string;
  justPaid?: boolean;
}) {
  const [asks, setAsks] = useState<Ask[]>(props.initialAsks);
  const [left, setLeft] = useState(props.initialLeft);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pay, setPay] = useState(false);
  const used = asks.length;

  const send = async () => {
    const text = q.trim();
    if (text.length < 4) return setErr("질문을 조금 더 자세히 적어 주세요.");
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/chat/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: props.orderNumber, t: props.token, q: text }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; a?: string; left?: number; message?: string };
      if (!j.ok || !j.a) {
        if (typeof j.left === "number") setLeft(j.left);
        throw new Error(j.message ?? "잠시 후 다시 물어봐 주세요.");
      }
      setAsks((a) => [...a, { q: text, a: j.a as string, at: new Date().toISOString() }]);
      setLeft(j.left ?? 0);
      setQ("");
      sendSiteEvent("chat_ask", { step: used === 0 ? "free" : "paid" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "잠시 후 다시 물어봐 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="ask" className="mx-auto mt-12 max-w-[620px] scroll-mt-6">
      <div className="rounded-[26px] border border-[#e46b8a]/40 bg-gradient-to-b from-[#2a1219] to-[#160e12] px-5 py-6">
        <p className="fx-kicker text-[#e46b8a]">Ask Wolhwa</p>
        <h2 className="font-display mt-2 text-[1.35rem] font-bold leading-snug text-ivory">리포트를 읽고 더 궁금한 게 있나요?</h2>
        <p className="mt-1.5 text-[0.84rem] leading-[1.7] text-ivory-dim">
          월화가 이 리포트를 바탕으로 답해 드려요. {used === 0 ? "첫 질문은 무료예요." : `남은 질문 ${left}번`}
        </p>
        {props.justPaid && <p className="mt-3 rounded-xl bg-[#e46b8a]/15 px-4 py-2.5 text-[0.84rem] text-ivory">결제가 끝났어요. 질문 {ASK_PACK_COUNT}번이 추가됐어요.</p>}

        {asks.map((x, i) => (
          <div key={i} className="mt-5">
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-md bg-[#fee500] px-4 py-2.5 text-[0.9rem] text-[#1a1215]">{x.q}</div>
            <div className="mt-2 flex gap-2.5">
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7a1f3d] text-[0.8rem] font-bold text-ivory">월</span>
              <p className="whitespace-pre-line rounded-2xl rounded-tl-md bg-white/[0.06] px-4 py-3 text-[0.9rem] leading-[1.85] text-ivory">{x.a}</p>
            </div>
          </div>
        ))}

        {left > 0 ? (
          <div className="mt-5">
            {used === 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {EXAMPLES.map((e) => (
                  <button key={e} type="button" onClick={() => setQ(e)} className="rounded-full border border-white/15 px-3 py-1.5 text-[0.76rem] text-ivory-dim">
                    {e}
                  </button>
                ))}
              </div>
            )}
            <textarea
              value={q}
              onChange={(e) => setQ(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder={`예: ${props.partner}에게 이번 주에 연락해도 될까요?`}
              className="w-full resize-none rounded-2xl border border-gold-dim bg-ink px-4 py-3 text-[0.92rem] text-ivory placeholder:text-ivory-dim/60"
            />
            {err && <p className="mt-2 text-[0.84rem] text-thread">{err}</p>}
            <button
              type="button"
              onClick={send}
              disabled={busy}
              className="mt-2 flex min-h-13 w-full items-center justify-center rounded-full bg-gradient-to-b from-[#e46b8a] to-[#b8325a] py-3.5 text-[0.95rem] font-semibold text-white disabled:opacity-60"
            >
              {busy ? "월화가 답을 쓰는 중…" : used === 0 ? "무료로 물어보기" : `물어보기 (남은 ${left}번)`}
            </button>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
            <p className="text-[0.92rem] font-semibold text-ivory">더 물어보고 싶다면</p>
            <p className="mt-1 text-[0.82rem] leading-[1.7] text-ivory-dim">
              질문 {ASK_PACK_COUNT}번을 {ASK_PACK_PRICE_KRW.toLocaleString()}원에 더 할 수 있어요. 1회 결제 · 정기결제 없음
            </p>
            {err && <p className="mt-2 text-[0.84rem] text-thread">{err}</p>}
            {!pay ? (
              <button
                type="button"
                onClick={() => {
                  setPay(true);
                  sendSiteEvent("chat_ask", { step: "pay_open" });
                }}
                className="mt-3 flex w-full items-center justify-center rounded-full bg-[#7a1f3d] py-3.5 text-[0.95rem] font-semibold text-white"
              >
                {ASK_PACK_PRICE_KRW.toLocaleString()}원으로 {ASK_PACK_COUNT}번 더 묻기
              </button>
            ) : props.clientKey ? (
              <div className="mt-3">
                <TossCheckout
                  clientKey={props.clientKey}
                  orderNumber={props.payOrderId}
                  amount={ASK_PACK_PRICE_KRW}
                  orderName={`월하연 월화에게 묻기 ${ASK_PACK_COUNT}회`}
                  successPath="/chat/ask/success"
                  failPath={`/chat/result/${props.orderNumber}?t=${encodeURIComponent(props.token)}&askfail=1#ask`}
                  hideStickyBar
                />
              </div>
            ) : (
              <p className="mt-3 text-[0.84rem] text-thread">지금은 결제를 열 수 없어요. 잠시 후 다시 시도해 주세요.</p>
            )}
          </div>
        )}
        <p className="mt-4 text-[0.72rem] leading-[1.7] text-ivory-dim">답은 리포트 내용을 바탕으로 한 참고 의견이에요. 상대의 마음이나 결과를 보장하지 않아요.</p>
      </div>
    </section>
  );
}
