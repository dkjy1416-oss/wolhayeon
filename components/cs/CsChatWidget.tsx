"use client";

/**
 * "월화에게 물어보기" — 100% 자동 CS 챗 위젯 (모바일 우선).
 *
 * 구조:
 * - 민감 플로우(주문 찾기→OTP→상태/액션)는 화면 상태머신 + 전용 API가 처리
 *   (AI는 이 데이터를 만지지 않음).
 * - 자유 질문은 /api/cs/chat — 서버가 csToken 검증 후 직접 조회한
 *   안전 상태만 AI에 주입.
 * - 사람 상담원 연결 없음. 실패 시 자동 복구 안내.
 */
import { useEffect, useRef, useState } from "react";

type Bubble = { role: "user" | "assistant"; content: string };
type Flow =
  | "idle"
  | "find_form"
  | "otp"
  | "verified"
  | "email_new"
  | "email_otp";

interface CsStatusView {
  payment: string;
  generation: string;
  delivery: string;
  resultPath: string | null;
}

const QUICK_MENU: Array<{ label: string; needAuth: boolean; faq?: string }> = [
  { label: "결제했는데 결과를 못 봤어요", needAuth: true },
  { label: "결과 이메일이 안 왔어요", needAuth: true },
  { label: "주문을 찾고 싶어요", needAuth: true },
  { label: "결과 생성이 너무 오래 걸려요", needAuth: true },
  { label: "결제/중복결제 문의", needAuth: true },
  { label: "환불하고 싶어요", needAuth: true },
  { label: "이메일 주소를 잘못 입력했어요", needAuth: true },
  { label: "결과 링크가 열리지 않아요", needAuth: true },
  {
    label: "신청 내용을 잘못 적었어요",
    needAuth: false,
    faq: "신청 내용을 잘못 적으신 경우, 아직 결제 전이라면 신청 화면에서 '수정하기'로 바로 고치실 수 있어요. 이미 결제하셨다면 아래 '주문 확인하기'로 본인확인 후 상태를 먼저 확인해드릴게요.",
  },
  {
    label: "월하연 이용 방법",
    needAuth: false,
    faq: "월하연은 신청서 작성 → 결제 전 무료 개인화 미리보기 → 16,900원 1회 결제 → 전체 결과(월화의 편지·관계 흐름·개인 리추얼·24시간/7일/21일 가이드) 순서로 진행돼요. 결과는 결제 후 보통 수 분 내에 자동으로 열리고 이메일로도 보내드려요.",
  },
  { label: "다른 문제가 있어요", needAuth: false, faq: "" },
];

const PAY_LABEL: Record<string, string> = {
  paid: "정상 완료",
  refunded: "환불 완료",
  pending: "완료된 결제 없음",
  failed: "완료된 결제 없음",
};
const GEN_LABEL: Record<string, string> = {
  ready: "생성 완료",
  generating: "생성 중",
  failed: "자동 재생성 대기",
  waiting: "생성 대기",
};
const MAIL_LABEL: Record<string, string> = {
  sent: "발송 완료",
  waiting: "결과 완성 후 발송 예정",
  sending: "발송 중",
  failed: "재발송 필요",
};

export default function CsChatWidget() {
  const [open, setOpen] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [flow, setFlow] = useState<Flow>("idle");
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  /* 본인확인 */
  const [fName, setFName] = useState("");
  const [fBirth, setFBirth] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newEmail, setNewEmail] = useState("");
  /* 세션 */
  const [csToken, setCsToken] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [status, setStatus] = useState<CsStatusView | null>(null);
  const [refundEligible, setRefundEligible] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 999999 });
  }, [bubbles, flow, status]);

  const say = (role: Bubble["role"], content: string) =>
    setBubbles((b) => [...b, { role, content }]);

  const openChat = () => {
    setOpen(true);
    if (bubbles.length === 0) {
      say(
        "assistant",
        "무엇이 궁금하신가요?\n결제, 결과 확인, 이메일, 환불 등\n월하연 이용 중 생긴 문제를 바로 확인해드릴게요."
      );
    }
  };

  /* ---------------- 인증/상태 ---------------- */

  const refreshStatus = async (tok = csToken, ord = orderNumber) => {
    if (!tok || !ord) return null;
    const res = await fetch("/api/cs/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber: ord, csToken: tok }),
    });
    const j = await res.json().catch(() => null);
    if (j?.status === "ok") {
      const s = j as CsStatusView & { status: string };
      setStatus(s);
      return s;
    }
    return null;
  };

  const startFind = async () => {
    if (busy) return;
    setBusy(true);
    await fetch("/api/cs/order/find", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fName,
        birthYear: Number(fBirth),
        email: fEmail,
      }),
    }).catch(() => {});
    setBusy(false);
    say(
      "assistant",
      "입력하신 정보와 일치하는 주문이 있으면, 신청하실 때 적어주신 이메일로 6자리 인증번호를 보냈어요. 10분 안에 입력해주세요."
    );
    setFlow("otp");
  };

  const confirmOtp = async () => {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/cs/verify/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fName,
        birthYear: Number(fBirth),
        email: fEmail,
        otp,
      }),
    });
    const j = await res.json().catch(() => null);
    setBusy(false);
    setOtp("");
    if (j?.status === "verified") {
      setCsToken(j.csToken);
      setOrderNumber(j.orderNumber);
      say("assistant", "본인확인이 완료됐어요. 주문 상태를 바로 확인해볼게요.");
      setFlow("verified");
      await refreshStatus(j.csToken, j.orderNumber);
    } else if (j?.status === "locked") {
      say(
        "assistant",
        "인증번호를 여러 번 잘못 입력해 잠시 잠겼어요. 몇 분 뒤 처음부터 다시 시도해주세요."
      );
      setFlow("find_form");
    } else if (j?.status === "expired") {
      say(
        "assistant",
        "인증번호 유효시간이 지났어요. 다시 받아볼게요."
      );
      setFlow("find_form");
    } else {
      say("assistant", "인증번호가 맞지 않아요. 다시 확인해주세요.");
    }
  };

  /* ---------------- 액션 ---------------- */

  const doAction = async (
    path: string,
    extra: Record<string, unknown> = {}
  ): Promise<Record<string, unknown> | null> => {
    if (!csToken || !orderNumber) return null;
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, csToken, ...extra }),
    });
    return (await res.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
  };

  const actResend = async () => {
    setBusy(true);
    const r = await doAction("/api/cs/action/resend-result");
    setBusy(false);
    if (r?.ok) say("assistant", "결과 이메일을 다시 보내드렸어요. 받은편지함과 스팸함을 함께 확인해주세요.");
    else if (r?.code === "cooldown")
      say("assistant", "방금 발송 요청이 처리됐어요. 2분 뒤에 다시 시도할 수 있어요.");
    else
      say(
        "assistant",
        "메일 발송이 바로 완료되지 않았어요. 잠시 후 다시 시도하면 발송 상태를 다시 확인할게요."
      );
  };

  const actRetryGeneration = async () => {
    if (!orderNumber) return;
    setBusy(true);
    say("assistant", "결과 생성을 다시 확인하고 있어요. 다시 결제하실 필요는 없어요.");
    const j = await doAction("/api/cs/action/retry-generation");
    setBusy(false);
    if (j?.status === "ready" && typeof j.resultPath === "string") {
      setStatus((s) => (s ? { ...s, generation: "ready", resultPath: String(j.resultPath) } : s));
      say("assistant", "전체 결과가 준비됐어요. 아래 버튼으로 바로 열어보세요.");
    } else {
      say("assistant", "현재 결과 상태를 다시 확인하고 있어요. 완료되면 결과 화면과 이메일로 이어집니다.");
    }
    await refreshStatus();
  };

  const actCheckRefund = async () => {
    setBusy(true);
    const r = await doAction("/api/cs/action/check-refund");
    setBusy(false);
    if (r?.message) {
      say("assistant", String(r.message));
      setRefundEligible(Boolean(r.eligible));
      if (r.eligible) {
        say("assistant", "지금 바로 환불을 진행할까요? 아래 [환불 요청] 버튼을 눌러주세요.");
      } else {
        say(
          "assistant",
          "대신 결과 다시 열기나 이메일 재발송은 바로 도와드릴 수 있어요."
        );
      }
    }
  };

  const actRefund = async () => {
    if (!refundEligible) { await actCheckRefund(); return; }
    if (!window.confirm("확인된 환불 가능 주문의 결제를 실제로 취소할까요? 취소 후에는 되돌릴 수 없습니다.")) return;
    setBusy(true);
    const r = await doAction("/api/cs/action/refund");
    setBusy(false);
    if (r?.message) say("assistant", String(r.message));
    if (r?.ok) setRefundEligible(false);
    await refreshStatus();
  };

  const actEmailStart = async () => {
    setBusy(true);
    const r = await doAction("/api/cs/action/update-email", {
      step: "start",
      newEmail,
    });
    setBusy(false);
    if (r?.ok) {
      say(
        "assistant",
        "새 이메일 주소로 6자리 인증번호를 보냈어요. 확인 후 입력해주세요."
      );
      setFlow("email_otp");
    } else if (r?.code === "invalid_email") {
      say("assistant", "이메일 주소 형식을 다시 확인해주세요.");
    } else if (r?.code === "cooldown") {
      say("assistant", "방금 인증번호를 보냈어요. 1분 뒤에 다시 요청할 수 있어요.");
    } else {
      say("assistant", "인증번호 발송이 잠시 원활하지 않아요. 잠시 후 다시 시도해주세요.");
    }
  };

  const actEmailConfirm = async () => {
    setBusy(true);
    const r = await doAction("/api/cs/action/update-email", {
      step: "confirm",
      otp,
    });
    setBusy(false);
    setOtp("");
    if (r?.ok) {
      say("assistant", "이메일 주소가 변경됐어요. 결과 이메일도 새 주소로 다시 보내드릴까요?");
      setFlow("verified");
      await refreshStatus();
    } else {
      say("assistant", "인증번호가 맞지 않거나 만료됐어요. 다시 확인해주세요.");
    }
  };

  /* ---------------- 자유 대화 ---------------- */

  const sendFree = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    say("user", t);
    setInput("");
    setBusy(true);
    const res = await fetch("/api/cs/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [...bubbles, { role: "user", content: t }].slice(-12),
        orderNumber: orderNumber ?? undefined,
        csToken: csToken ?? undefined,
      }),
    });
    const j = await res.json().catch(() => null);
    setBusy(false);
    say(
      "assistant",
      typeof j?.reply === "string" && j.reply
        ? j.reply
        : "제가 바로 확인해볼게요. 아래 버튼을 이용해주세요."
    );
  };

  const pickMenu = (item: (typeof QUICK_MENU)[number]) => {
    say("user", item.label);
    if (item.faq) {
      say("assistant", item.faq);
      return;
    }
    if (item.needAuth && !csToken) {
      say(
        "assistant",
        "괜찮아요. 주문번호 없이도 찾아볼 수 있어요.\n신청하실 때 적으신 이름·출생연도·이메일만 알려주세요."
      );
      setFlow("find_form");
    } else if (item.needAuth && csToken) {
      setFlow("verified");
      refreshStatus();
    } else {
      say("assistant", "어떤 문제인지 아래에 편하게 적어주세요. 제가 바로 확인해볼게요.");
    }
  };

  /* ---------------- UI ---------------- */

  const inputCls =
    "h-12 w-full rounded-xl border border-gold-dim/30 bg-ink px-4 text-[0.9rem] text-ivory placeholder:text-ivory-dim/50 focus:border-gold/50 focus:outline-none";
  const btnCls =
    "inline-flex h-11 items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep px-5 text-[0.85rem] font-medium text-ivory active:opacity-85 disabled:opacity-50";
  const ghostBtn =
    "inline-flex h-10 items-center justify-center rounded-full border border-gold-dim/35 px-4 text-[0.8rem] text-ivory active:opacity-80";

  return (
    <>
      {/* 플로팅 버튼 */}
      {!open && (
        <button
          type="button"
          onClick={openChat}
          className="fixed bottom-20 right-4 z-50 flex h-12 items-center gap-2 rounded-full border border-gold/30 bg-gradient-to-b from-burgundy to-burgundy-deep px-5 text-[0.85rem] font-medium text-ivory shadow-[0_6px_28px_rgba(0,0,0,0.55)]"
        >
          <span aria-hidden className="text-gold">
            ✦
          </span>
          월화에게 물어보기
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex justify-center bg-ink/70 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-[500px] flex-col bg-ink">
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b border-gold-dim/20 px-5 py-4">
              <div>
                <p className="text-[0.6rem] tracking-[0.3em] text-gold/80">
                  月下緣
                </p>
                <p className="font-display text-[1.02rem] font-semibold text-ivory">
                  월화에게 물어보기
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-dim/30 text-ivory-dim"
              >
                ✕
              </button>
            </div>

            {/* 대화 */}
            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-5">
              <div className="flex flex-col gap-3">
                {bubbles.map((b, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-[0.88rem] font-light leading-[1.85] ${
                      b.role === "user"
                        ? "self-end bg-gradient-to-b from-burgundy to-burgundy-deep text-ivory"
                        : "self-start border border-gold-dim/25 bg-ink-soft text-ivory"
                    }`}
                  >
                    {b.content}
                  </div>
                ))}
                {busy && (
                  <div className="self-start rounded-2xl border border-gold-dim/25 bg-ink-soft px-4 py-3 text-[0.85rem] text-ivory-dim">
                    확인하고 있어요…
                  </div>
                )}

                {/* 상태 카드 */}
                {flow === "verified" && status && (
                  <div className="self-stretch rounded-2xl border border-gold/25 bg-ink-soft px-5 py-4">
                    <p className="text-[0.62rem] tracking-[0.25em] text-gold/80">
                      주문 상태
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      {[
                        ["결제", PAY_LABEL[status.payment] ?? status.payment],
                        ["결과", GEN_LABEL[status.generation] ?? status.generation],
                        ["이메일", MAIL_LABEL[status.delivery] ?? status.delivery],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <p className="text-[0.65rem] text-ivory-dim">{k}</p>
                          <p className="mt-1 text-[0.78rem] font-medium text-ivory">
                            {v}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 하단 인터랙션 영역 */}
            <div className="border-t border-gold-dim/20 px-4 pb-6 pt-4">
              {flow === "idle" && (
                <div className="scrollbar-none flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                  {QUICK_MENU.map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => pickMenu(m)}
                      className="rounded-full border border-gold-dim/35 px-4 py-2 text-[0.78rem] text-ivory active:opacity-80"
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}

              {flow === "find_form" && (
                <div className="flex flex-col gap-2.5">
                  <input className={inputCls} placeholder="신청자 이름 (예: 수미)" value={fName} onChange={(e) => setFName(e.target.value)} />
                  <input className={inputCls} placeholder="출생연도 4자리 (예: 1994)" inputMode="numeric" value={fBirth} onChange={(e) => setFBirth(e.target.value.replace(/\D/g, "").slice(0, 4))} />
                  <input className={inputCls} placeholder="신청할 때 적은 이메일" inputMode="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} />
                  <div className="mt-1 flex gap-2">
                    <button type="button" className={ghostBtn} onClick={() => setFlow("idle")}>뒤로</button>
                    <button type="button" disabled={busy || !fName || fBirth.length !== 4 || !fEmail.includes("@")} onClick={startFind} className={`${btnCls} flex-1`}>
                      인증번호 받기
                    </button>
                  </div>
                </div>
              )}

              {(flow === "otp" || flow === "email_otp") && (
                <div className="flex flex-col gap-2.5">
                  <input className={`${inputCls} text-center tracking-[0.5em]`} placeholder="6자리 인증번호" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                  <div className="flex gap-2">
                    <button type="button" className={ghostBtn} onClick={() => setFlow(flow === "otp" ? "find_form" : "verified")}>뒤로</button>
                    <button type="button" disabled={busy || otp.length !== 6} onClick={flow === "otp" ? confirmOtp : actEmailConfirm} className={`${btnCls} flex-1`}>
                      인증하기
                    </button>
                  </div>
                </div>
              )}

              {flow === "email_new" && (
                <div className="flex flex-col gap-2.5">
                  <input className={inputCls} placeholder="새 이메일 주소" inputMode="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                  <div className="flex gap-2">
                    <button type="button" className={ghostBtn} onClick={() => setFlow("verified")}>뒤로</button>
                    <button type="button" disabled={busy || !newEmail.includes("@")} onClick={actEmailStart} className={`${btnCls} flex-1`}>
                      인증번호 받기
                    </button>
                  </div>
                </div>
              )}

              {flow === "verified" && (
                <div className="flex flex-col gap-2">
                  <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
                    {status?.resultPath && (
                      <a href={status.resultPath} className={`${btnCls} shrink-0`}>
                        전체 결과 다시 열기
                      </a>
                    )}
                    {status?.resultPath && (
                      <button type="button" onClick={actResend} disabled={busy} className={`${ghostBtn} shrink-0`}>
                        결과 이메일 다시 받기
                      </button>
                    )}
                    {status?.payment === "paid" && status?.generation !== "ready" && (
                      <button type="button" onClick={actRetryGeneration} disabled={busy} className={`${btnCls} shrink-0`}>
                        결과 생성 다시 확인
                      </button>
                    )}
                    <button type="button" onClick={actCheckRefund} disabled={busy} className={`${ghostBtn} shrink-0`}>
                      환불 가능 여부 확인
                    </button>
                    {refundEligible && (
                      <button type="button" onClick={actRefund} disabled={busy} className={`${ghostBtn} shrink-0`}>
                        환불 진행 확인
                      </button>
                    )}
                    <button type="button" onClick={() => setFlow("email_new")} disabled={busy} className={`${ghostBtn} shrink-0`}>
                      이메일 주소 변경
                    </button>
                  </div>
                  <FreeInput input={input} setInput={setInput} onSend={sendFree} busy={busy} inputCls={inputCls} btnCls={btnCls} />
                </div>
              )}

              {flow === "idle" && (
                <div className="mt-3">
                  <FreeInput input={input} setInput={setInput} onSend={sendFree} busy={busy} inputCls={inputCls} btnCls={btnCls} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FreeInput({
  input,
  setInput,
  onSend,
  busy,
  inputCls,
  btnCls,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: (v: string) => void;
  busy: boolean;
  inputCls: string;
  btnCls: string;
}) {
  return (
    <div className="flex gap-2">
      <input
        className={inputCls}
        placeholder="궁금한 점을 편하게 적어주세요"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSend(input);
        }}
      />
      <button
        type="button"
        disabled={busy || !input.trim()}
        onClick={() => onSend(input)}
        className={`${btnCls} shrink-0 px-4`}
      >
        보내기
      </button>
    </div>
  );
}
