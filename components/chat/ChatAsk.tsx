"use client";

/**
 * 11/28: 리포트 뒤 '월화에게 묻기' — 무료 1번, 추가 3번 4,900원 (대표 결정)
 * 11/28 추가: '그 사람 말투로 연습' 가상 채팅 (대표 결정) — 질문권 1번 = 6턴, 화면에 '가상'임을 항상 표시
 */
import { useState } from "react";
import TossCheckout from "@/components/pay/TossCheckout";
import { sendSiteEvent } from "@/lib/site-track";
import { ASK_PACK_COUNT, ASK_PACK_PRICE_KRW, PERSONA_TURNS, type ChatAsk as Ask } from "@/lib/chat/types";

const EXAMPLES = ["지금 먼저 연락해도 될까요?", "답장이 늦을 때 뭐라고 보내면 좋을까요?", "제가 제일 먼저 고쳐야 할 말 습관은요?"];
const P_EXAMPLES = ["요즘 잘 지내?", "그때 말한 전시 이번 주까지래 ㅎㅎ", "주말에 시간 돼?"];

type Mode = "ask" | "persona";

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
  const [mode, setMode] = useState<Mode>("ask");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pay, setPay] = useState(false);
  const used = asks.length;
  const last = asks[asks.length - 1];
  const openTurns = last?.kind === "persona" ? PERSONA_TURNS - (last.turns?.length ?? 0) : 0;
  const canSend = mode === "persona" ? openTurns > 0 || left > 0 : left > 0;
  const qa = asks.filter((x) => x.kind !== "persona");
  const sessions = asks.filter((x) => x.kind === "persona");
  const p = props.partner;

  const send = async () => {
    const text = q.trim();
    if (text.length < (mode === "persona" ? 1 : 4)) return setErr(mode === "persona" ? "보낼 메시지를 적어 주세요." : "질문을 조금 더 자세히 적어 주세요.");
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/chat/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: props.orderNumber, t: props.token, q: text, mode }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; a?: string; them?: string; left?: number; message?: string };
      if (!j.ok || !(j.a || j.them)) {
        if (typeof j.left === "number") setLeft(j.left);
        throw new Error(j.message ?? "잠시 후 다시 보내 주세요.");
      }
      if (mode === "persona") {
        setAsks((a) => {
          const l = a[a.length - 1];
          if (l?.kind === "persona" && (l.turns?.length ?? 0) < PERSONA_TURNS) return [...a.slice(0, -1), { ...l, turns: [...(l.turns ?? []), { me: text, them: j.them as string }] }];
          return [...a, { q: "", a: "", at: new Date().toISOString(), kind: "persona", turns: [{ me: text, them: j.them as string }] }];
        });
      } else {
        setAsks((a) => [...a, { q: text, a: j.a as string, at: new Date().toISOString() }]);
      }
      setLeft(j.left ?? 0);
      setQ("");
      sendSiteEvent("chat_ask", { step: `${mode}_${used === 0 ? "free" : "paid"}` });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "잠시 후 다시 보내 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(m);
        setErr(null);
        setQ("");
      }}
      className={`flex-1 rounded-full py-2.5 text-[0.84rem] font-semibold ${mode === m ? "bg-[#e46b8a] text-white" : "text-ivory-dim"}`}
    >
      {label}
    </button>
  );

  return (
    <section id="ask" className="mx-auto mt-12 max-w-[620px] scroll-mt-6">
      <div className="rounded-[26px] border border-[#e46b8a]/40 bg-gradient-to-b from-[#2a1219] to-[#160e12] px-5 py-6">
        <p className="fx-kicker text-[#e46b8a]">Ask Wolhwa</p>
        <h2 className="font-display mt-2 text-[1.35rem] font-bold leading-snug text-ivory">리포트를 읽고 더 궁금한 게 있나요?</h2>
        <p className="mt-1.5 text-[0.84rem] leading-[1.7] text-ivory-dim">
          {used === 0 ? "처음 1번은 무료예요." : `남은 횟수 ${left}번`} · 월화에게 묻기 1번 = 질문 1개, 말투 연습 1번 = 메시지 {PERSONA_TURNS}개
        </p>
        {props.justPaid && <p className="mt-3 rounded-xl bg-[#e46b8a]/15 px-4 py-2.5 text-[0.84rem] text-ivory">결제가 끝났어요. {ASK_PACK_COUNT}번이 추가됐어요.</p>}

        <div className="mt-4 flex gap-1 rounded-full bg-black/30 p-1">
          {tab("ask", "월화에게 묻기")}
          {tab("persona", `${p} 말투로 연습`)}
        </div>

        {mode === "ask" ? (
          qa.map((x, i) => (
            <div key={i} className="mt-5">
              <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-md bg-[#fee500] px-4 py-2.5 text-[0.9rem] text-[#1a1215]">{x.q}</div>
              <div className="mt-2 flex gap-2.5">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7a1f3d] text-[0.8rem] font-bold text-ivory">월</span>
                <p className="whitespace-pre-line rounded-2xl rounded-tl-md bg-white/[0.06] px-4 py-3 text-[0.9rem] leading-[1.85] text-ivory">{x.a}</p>
              </div>
            </div>
          ))
        ) : (
          <>
            <p className="mt-4 rounded-xl border border-[#fee500]/30 bg-[#fee500]/[0.07] px-3.5 py-2.5 text-[0.78rem] leading-[1.7] text-ivory">
              <b>가상 채팅이에요.</b> 리포트에 나온 {p}의 말투와 답장 습관을 AI가 흉내 낸 연습용 답장이에요. 실제 {p}의 생각이나 답이 아니에요. 보낼 말을 미리 연습해 보는 용도로 써 주세요.
            </p>
            <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-[#b2c7da] px-3 py-4">
              {sessions.length === 0 && <p className="py-6 text-center text-[0.8rem] text-[#3b4a5a]">{p}에게 보내 보고 싶은 메시지를 적어 보세요.</p>}
              {sessions.map((s, si) => (
                <div key={si} className="flex flex-col gap-2">
                  {si > 0 && <p className="my-1 text-center text-[0.7rem] text-[#3b4a5a]">— 새 연습 —</p>}
                  {(s.turns ?? []).map((t, ti) => (
                    <div key={ti} className="flex flex-col gap-1.5">
                      <p className="ml-auto max-w-[80%] whitespace-pre-line rounded-2xl rounded-tr-md bg-[#fee500] px-3.5 py-2 text-[0.88rem] text-[#1a1215]">{t.me}</p>
                      <div className="flex items-start gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-white/70 text-[0.72rem] font-bold text-[#3b4a5a]">{p.slice(0, 1)}</span>
                        <div className="flex max-w-[78%] flex-col gap-1">
                          {t.them
                            .split("\n")
                            .filter(Boolean)
                            .map((line, li) => (
                              <p key={li} className="w-fit rounded-2xl rounded-tl-md bg-white px-3.5 py-2 text-[0.88rem] text-[#1a1215]">
                                {line}
                              </p>
                            ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {openTurns > 0 && <p className="text-center text-[0.7rem] text-[#3b4a5a]">이번 연습에서 {openTurns}개 더 보낼 수 있어요</p>}
            </div>
          </>
        )}

        {canSend ? (
          <div className="mt-4">
            {(mode === "ask" ? qa.length === 0 : sessions.length === 0) && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {(mode === "ask" ? EXAMPLES : P_EXAMPLES).map((e) => (
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
              rows={mode === "persona" ? 2 : 3}
              placeholder={mode === "persona" ? `${p}에게 보낼 메시지` : `예: ${p}에게 이번 주에 연락해도 될까요?`}
              className="w-full resize-none rounded-2xl border border-gold-dim bg-ink px-4 py-3 text-[0.92rem] text-ivory placeholder:text-ivory-dim/60"
            />
            {err && <p className="mt-2 text-[0.84rem] text-thread">{err}</p>}
            <button
              type="button"
              onClick={send}
              disabled={busy}
              className="mt-2 flex min-h-13 w-full items-center justify-center rounded-full bg-gradient-to-b from-[#e46b8a] to-[#b8325a] py-3.5 text-[0.95rem] font-semibold text-white disabled:opacity-60"
            >
              {busy
                ? mode === "persona"
                  ? `${p}이(가) 입력 중…`
                  : "월화가 답을 쓰는 중…"
                : mode === "persona"
                  ? openTurns > 0
                    ? "보내기"
                    : used === 0
                      ? "무료로 연습 시작"
                      : `연습 시작 (남은 ${left}번)`
                  : used === 0
                    ? "무료로 물어보기"
                    : `물어보기 (남은 ${left}번)`}
            </button>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
            <p className="text-[0.92rem] font-semibold text-ivory">더 해 보고 싶다면</p>
            <p className="mt-1 text-[0.82rem] leading-[1.7] text-ivory-dim">
              {ASK_PACK_COUNT}번을 {ASK_PACK_PRICE_KRW.toLocaleString()}원에 더 할 수 있어요 (질문 또는 말투 연습). 1회 결제 · 정기결제 없음
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
                {ASK_PACK_PRICE_KRW.toLocaleString()}원으로 {ASK_PACK_COUNT}번 더
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
        <p className="mt-4 text-[0.72rem] leading-[1.7] text-ivory-dim">답은 리포트 내용을 바탕으로 한 참고용이에요. 상대의 마음이나 결과를 보장하지 않아요.</p>
      </div>
    </section>
  );
}
