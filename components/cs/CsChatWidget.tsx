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
  hasResult: boolean;
  level: "lite" | "full";
  resultPath: string | null;
}

const QUICK_MENU: Array<{ label: string; needAuth: boolean; faq?: string }> = [
  { label: "결제했는데 결과를 못 봤어요", needAuth: true },
  { label: "결과 이메일이 안 왔어요", needAuth: true },
  { label: "주문을 찾고 싶어요", needAuth: true },
  { label: "결과 생성이 너무 오래 걸려요", needAuth: true },
  { label: "이메일 주소를 잘못 입력했어요", needAuth: true },
  { label: "결제/중복결제 문의", needAuth: true },
  { label: "결과 링크가 열리지 않아요", needAuth: true },
  {
    label: "신청 내용을 잘못 적었어요",
    needAuth: false,
    faq: "신청 내용을 잘못 적으신 경우, 아직 결제 전이라면 신청 화면에서 '수정하기'로 바로 고치실 수 있어요. 이미 결제하셨다면 아래 '주문 확인하기'로 상태를 먼저 확인해드릴게요.",
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
  const [liteToken, setLiteToken] = useState<string | null>(null);
  const [csToken, setCsToken] = useState<string | null>(null);
  /** OTP 인증 후 실행하려던 민감 액션 */
  const [pendingSensitive, setPendingSensitive] = useState<
    null | "refund_check" | "refund" | "email_change" | "open_result"
  >(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [status, setStatus] = useState<CsStatusView | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 999999 });
  }, [bubbles, flow, status]);

  const say = (role: Bubble["role"], content: string) =>
    setBubbles((b) => [...b, { role, content }]);

  const openChat = () => {
    setOpen(true);
    if (bubbles.length === 0) {
      say("assistant", "안녕하세요. 월하연 자동 고객센터예요.");
      say(
        "assistant",
        "결제나 결과 확인, 이메일 문제처럼 이용 중 불편한 점을 24시간 자동으로 도와드릴게요."
      );
      say(
        "assistant",
        "주문번호를 모르셔도 괜찮아요. 필요하면 이름과 출생연도로 먼저 확인해드릴게요."
      );
    }
  };

  /* ---------------- 인증/상태 ---------------- */

  const refreshStatus = async (
    tok: string | null = csToken ?? liteToken,
    ord = orderNumber
  ) => {
    if (!tok || !ord) return null;
    const res = await fetch("/api/cs/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber: ord, token: tok }),
    });
    const j = await res.json().catch(() => null);
    if (j?.status === "ok") {
      const s = j as CsStatusView & { status: string };
      setStatus(s);
      return s;
    }
    return null;
  };

  const [needEmail, setNeedEmail] = useState(false);

  const startFind = async () => {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/cs/order/find", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fName,
        birthYear: Number(fBirth),
        email: needEmail && fEmail ? fEmail : undefined,
      }),
    });
    const j = await res.json().catch(() => null);
    setBusy(false);
    if (j?.status === "found" && j.liteToken) {
      setLiteToken(j.liteToken);
      setOrderNumber(j.orderNumber);
      say("assistant", "신청 내역을 찾았어요. 상태를 바로 확인해볼게요.");
      setFlow("verified");
      await refreshStatus(j.liteToken, j.orderNumber);
    } else if (j?.status === "need_email") {
      setNeedEmail(true);
      say(
        "assistant",
        "같은 정보의 신청이 여러 건 있어요. 신청하실 때 적으신 이메일도 함께 알려주세요."
      );
    } else {
      say(
        "assistant",
        "입력하신 정보로는 신청 내역을 찾지 못했어요. 이름과 출생연도를 신청서에 적으신 그대로 다시 확인해주세요."
      );
    }
  };

  /* 민감 액션 진입 → OTP 요청 (등록된 이메일로만 발송) */
  const startSensitive = async (
    action: NonNullable<typeof pendingSensitive>
  ) => {
    if (!liteToken && !csToken) return;
    if (csToken) {
      /* 이미 강인증됨 → 바로 실행 */
      runSensitive(action, csToken);
      return;
    }
    setPendingSensitive(action);
    setBusy(true);
    const res = await fetch("/api/cs/verify/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, token: liteToken }),
    });
    const j = await res.json().catch(() => null);
    setBusy(false);
    if (j?.status === "sent" || j?.status === "cooldown") {
      say(
        "assistant",
        "이 작업은 본인확인이 필요해요. 신청하실 때 등록하신 이메일로 6자리 인증번호를 보냈어요."
      );
      setFlow("otp");
    } else {
      say(
        "assistant",
        "인증번호 발송이 잠시 원활하지 않아요. 잠시 후 다시 시도해주세요."
      );
    }
  };

  const runSensitive = (
    action: NonNullable<typeof pendingSensitive>,
    fullToken?: string
  ) => {
    if (action === "refund_check") actCheckRefund(fullToken);
    else if (action === "refund") actRefund(fullToken);
    else if (action === "email_change") setFlow("email_new");
    else if (action === "open_result")
      refreshStatus(fullToken ?? csToken, orderNumber);
  };

  const confirmOtp = async () => {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/cs/verify/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, token: liteToken, otp }),
    });
    const j = await res.json().catch(() => null);
    setBusy(false);
    setOtp("");
    if (j?.status === "verified") {
      setCsToken(j.csToken);
      say("assistant", "본인확인이 완료됐어요.");
      setFlow("verified");
      await refreshStatus(j.csToken, orderNumber);
      if (pendingSensitive) {
        const a = pendingSensitive;
        setPendingSensitive(null);
        runSensitive(a, j.csToken);
      }
    } else if (j?.status === "locked") {
      say(
        "assistant",
        "인증번호를 여러 번 잘못 입력해 잠시 잠겼어요. 몇 분 뒤 다시 시도해주세요."
      );
      setFlow("verified");
    } else if (j?.status === "expired") {
      say("assistant", "인증번호 유효시간이 지났어요. 다시 받아볼게요.");
      setFlow("verified");
    } else {
      say("assistant", "인증번호가 맞지 않아요. 다시 확인해주세요.");
    }
  };

  /* ---------------- 액션 ---------------- */
  /* ---------------- 액션 ---------------- */

  const doAction = async (
    path: string,
    extra: Record<string, unknown> = {},
    tokenOverride?: string
  ): Promise<Record<string, unknown> | null> => {
    const tok = tokenOverride ?? csToken ?? liteToken;
    if (!tok || !orderNumber) return null;
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, csToken: tok, token: tok, ...extra }),
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
        "메일 발송이 바로 처리되지 않아 자동 복구 요청을 등록했어요. 완료되면 이메일로 알려드릴게요."
      );
  };

  const actRetryGeneration = async () => {
    setBusy(true);
    say("assistant", "결과 생성을 다시 확인하고 있어요. 다시 결제하실 필요는 없어요.");
    const r = await doAction("/api/cs/action/retry-generation");
    setBusy(false);
    if (r?.hasResult) {
      say(
        "assistant",
        csToken
          ? "전체 결과가 준비됐어요. 아래 버튼으로 바로 열어보세요."
          : "전체 결과가 준비됐어요. 등록하신 이메일로도 보내드렸고, 화면에서 바로 열람하시려면 본인확인(인증번호)을 진행해주세요."
      );
    } else if (r?.status === "not_paid") {
      say("assistant", "이 신청에는 완료된 결제가 없어요. 결제 후 결과가 생성됩니다.");
    } else {
      say(
        "assistant",
        "지금 결과를 만들고 있어요. 완성되면 등록하신 이메일로 보내드리니 이 화면을 닫으셔도 괜찮아요."
      );
    }
    await refreshStatus();
  };

  const actCheckRefund = async (tokenOverride?: string) => {
    setBusy(true);
    const r = await doAction("/api/cs/action/check-refund", {}, tokenOverride);
    setBusy(false);
    if (r?.message) {
      say("assistant", String(r.message));
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

  const actRefund = async (tokenOverride?: string) => {
    if (
      !window.confirm(
        "환불 가능 주문이라면 결제 취소가 실제로 진행됩니다. 계속할까요?"
      )
    ) {
      return;
    }
    setBusy(true);
    const r = await doAction("/api/cs/action/refund", {}, tokenOverride);
    setBusy(false);
    if (r?.message) say("assistant", String(r.message));
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
        token: csToken ?? liteToken ?? undefined,
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
    if (item.needAuth && !csToken && !liteToken) {
      say(
        "assistant",
        "괜찮아요. 주문번호 없이도 찾아볼 수 있어요.\n신청하실 때 적으신 이름과 출생연도만 알려주세요."
      );
      setFlow("find_form");
    } else if (item.needAuth && (csToken || liteToken)) {
      setFlow("verified");
      refreshStatus();
    } else {
      say("assistant", "괜찮아요. 어떤 문제인지 아래에 편하게 적어주세요. 확인할 수 있는 부분부터 하나씩 바로 도와드릴게요.");
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
      {/* 우측 하단 작은 말풍선 아이콘 — CTA를 가리지 않도록 화면 끝에 최소 크기로 배치 */}
      {!open && (
        <button
          type="button"
          onClick={openChat}
          aria-label="월화에게 물어보기"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-gold/35 bg-ink/88 text-gold shadow-[0_4px_20px_rgba(0,0,0,0.45)] backdrop-blur-sm active:opacity-85"
        >
          <svg aria-hidden width="19" height="19" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3C7 3 3 6.6 3 11c0 2.5 1.3 4.7 3.4 6.2-.1 1-.5 2.2-1.4 3.3 1.9-.2 3.4-.9 4.4-1.6.8.2 1.7.3 2.6.3 5 0 9-3.6 9-8.2S17 3 12 3z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
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
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-gold-dim/25 bg-ink-soft px-3 py-1 text-[0.68rem] text-ivory-dim">
                  <span className="inline-flex h-2 w-2 rounded-full bg-gold animate-pulse" />
                  24시간 자동 상담 중
                </div>
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
              <div className="mb-4 rounded-2xl border border-gold-dim/25 bg-ink-soft px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-ink text-gold">
                    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3C7 3 3 6.6 3 11c0 2.5 1.3 4.7 3.4 6.2-.1 1-.5 2.2-1.4 3.3 1.9-.2 3.4-.9 4.4-1.6.8.2 1.7.3 2.6.3 5 0 9-3.6 9-8.2S17 3 12 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[0.9rem] font-medium text-ivory">
                      이용 중 불편한 점을 바로 도와드릴게요
                    </p>
                    <p className="mt-1 text-[0.76rem] leading-6 text-ivory-dim">
                      주문번호를 모르셔도 괜찮아요. 결과 확인, 이메일 문제, 결제 관련 문의까지 순서대로 안내해드릴게요.
                    </p>
                  </div>
                </div>
              </div>
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
                <div>
                  <p className="mb-3 text-[0.72rem] leading-6 text-ivory-dim">
                    자주 묻는 문제를 아래에서 바로 선택하시거나, 직접 적어주시면 순서대로 확인해드릴게요.
                  </p>
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
                </div>
              )}

              {flow === "find_form" && (
                <div className="flex flex-col gap-2.5">
                  <input className={inputCls} placeholder="신청자 이름 (예: 수미)" value={fName} onChange={(e) => setFName(e.target.value)} />
                  <input className={inputCls} placeholder="출생연도 4자리 (예: 1994)" inputMode="numeric" value={fBirth} onChange={(e) => setFBirth(e.target.value.replace(/\D/g, "").slice(0, 4))} />
                  {needEmail && (
                    <input className={inputCls} placeholder="신청할 때 적은 이메일" inputMode="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} />
                  )}
                  <div className="mt-1 flex gap-2">
                    <button type="button" className={ghostBtn} onClick={() => setFlow("idle")}>뒤로</button>
                    <button
                      type="button"
                      disabled={
                        busy ||
                        !fName ||
                        fBirth.length !== 4 ||
                        (needEmail && !fEmail.includes("@"))
                      }
                      onClick={startFind}
                      className={`${btnCls} flex-1`}
                    >
                      신청 내역 확인
                    </button>
                  </div>
                </div>
              )}

              {(flow === "otp" || flow === "email_otp") && (
                <div className="flex flex-col gap-2.5">
                  <input className={`${inputCls} text-center tracking-[0.5em]`} placeholder="6자리 인증번호" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                  <div className="flex gap-2">
                    <button type="button" className={ghostBtn} onClick={() => setFlow("verified")}>뒤로</button>
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
                    {/* ── 라이트 가능(조회/등록 이메일 재발송/재생성) ── */}
                    {status?.hasResult && (
                      <button type="button" onClick={actResend} disabled={busy} className={`${btnCls} shrink-0`}>
                        등록된 이메일로 결과 다시 받기
                      </button>
                    )}
                    {status?.payment === "paid" && !status?.hasResult && (
                      <button type="button" onClick={actRetryGeneration} disabled={busy} className={`${btnCls} shrink-0`}>
                        결과 생성 다시 확인
                      </button>
                    )}
                    {/* ── 민감(OTP 필요) ── */}
                    {status?.hasResult &&
                      (csToken && status?.resultPath ? (
                        <a href={status.resultPath} className={`${ghostBtn} shrink-0`}>
                          결과 화면에서 열기
                        </a>
                      ) : (
                        <button type="button" onClick={() => startSensitive("open_result")} disabled={busy} className={`${ghostBtn} shrink-0`}>
                          결과 화면에서 열기 🔒
                        </button>
                      ))}
                    <button type="button" onClick={() => (csToken ? actCheckRefund() : startSensitive("refund_check"))} disabled={busy} className={`${ghostBtn} shrink-0`}>
                      환불 가능 여부 확인{csToken ? "" : " 🔒"}
                    </button>
                    <button type="button" onClick={() => (csToken ? actRefund() : startSensitive("refund"))} disabled={busy} className={`${ghostBtn} shrink-0`}>
                      환불 요청{csToken ? "" : " 🔒"}
                    </button>
                    <button type="button" onClick={() => (csToken ? setFlow("email_new") : startSensitive("email_change"))} disabled={busy} className={`${ghostBtn} shrink-0`}>
                      이메일 주소 변경{csToken ? "" : " 🔒"}
                    </button>
                  </div>
                  {!csToken && (
                    <p className="text-[0.65rem] font-light text-ivory-dim/60">
                      🔒 표시는 등록된 이메일 인증번호 확인 후 이용할 수 있어요.
                    </p>
                  )}
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
        placeholder="궁금한 점을 편하게 남겨주세요"
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
