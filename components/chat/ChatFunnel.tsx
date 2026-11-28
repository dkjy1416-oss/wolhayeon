"use client";

/**
 * 카톡 대화 분석 — 무료 선택형 질문 → 무료 대화 유형 → 상품 선택 → 주문 생성
 * 무료 단계는 API 비용 없음 (lib/chat/questions.freeChatType)
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PreviewExtras from "@/components/apply/PreviewExtras";
import { CHAT_QUESTIONS, CHAT_LOCKED_ITEMS, FILE_CTX_QUESTIONS, freeChatType } from "@/lib/chat/questions";
import { CHAT_PRICE_KRW, CHAT_BUNDLE_PRICE_KRW, type ChatProduct } from "@/lib/chat/types";
import { sendSiteEvent } from "@/lib/site-track";
import ChatLanding from "@/components/chat/ChatLanding";
import type { SiteTotals } from "@/lib/site-totals";
import type { PublicReview } from "@/lib/reviews";
import ChatFileFlow, { StatsPreview, type FileReady } from "@/components/chat/ChatFileFlow";
import { transcript } from "@/lib/chat/kakao-parse";
import SplitWords from "@/components/fx/SplitWords";
import InView from "@/components/fx/InView";
import ShareTypeButton from "@/components/chat/ShareTypeButton";
import ChatProcessing from "@/components/chat/ChatProcessing";

type Step = "intro" | "track" | "file" | "ctx" | "quiz" | "free" | "form";

const FILE_LOCKED = [
  /* 11/28: 상대 마음을 단정하는 듯한 문구 → '대화로 본 가능성'으로 */
  "숫자 뒤의 해석 — 대화로 본 그 사람 마음의 가능성",
  "우리 관계는 어디로 흘러갈까 — 만남·약속 얘기의 흐름",
  "말과 행동의 온도차 — 말과 실제 연락이 다른 지점",
  "대화가 달라진 날, 그날 무슨 말이 오갔는지",
  "지금 보내면 안 되는 문장",
  "다음에 보낼 메시지 3개와 예상 반응 · 1~2주 계획",
];

function readUtm(): Record<string, string> {
  try {
    const ft = JSON.parse(localStorage.getItem("wh_ft") ?? "{}") as Record<string, string>;
    const q = new URLSearchParams(location.search);
    const out: Record<string, string> = { ...ft };
    if (q.get("utm_source")) {
      out.s = q.get("utm_source") ?? "";
      out.m = q.get("utm_medium") ?? "";
      out.c = q.get("utm_campaign") ?? "";
      out.x = q.get("utm_content") ?? "";
    }
    return out;
  } catch {
    return {};
  }
}

const won = (n: number) => `${n.toLocaleString()}원`;

export default function ChatFunnel({ totals = null, reviews = [] }: { totals?: SiteTotals | null; reviews?: PublicReview[] } = {}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [mode, setMode] = useState<"file" | "quiz">("file");
  const [fileData, setFileData] = useState<FileReady | null>(null);
  const [qi, setQi] = useState(0);
  const [ci, setCi] = useState(0);
  /* 11/28 두 갈래: on = 아직 이어지는 사이, ex = 이미 헤어진 사이 */
  const [track, setTrack] = useState<"on" | "ex" | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [product, setProduct] = useState<ChatProduct>("chat");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [partnerLabel, setPartnerLabel] = useState("");
  const [guardianOk, setGuardianOk] = useState(false);
  const [agree, setAgree] = useState(false);
  const [marketingOk, setMarketingOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  /* 11/23: 재회 분석과 묶음으로 이미 결제한 손님 (/chat?combo=WC-…&t=…) — 대화만 올리면 바로 리포트 */
  const [combo, setCombo] = useState<{ order: string; t: string } | null>(null);
  const [comboRun, setComboRun] = useState(false);

  /* 공유 링크(/chat/type/…)에서 "나도 해 보기"로 들어오면 바로 무료 질문부터 */
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const co = sp.get("combo");
    const ct = sp.get("t");
    if (co && ct && /^WC-\d{8}-[A-Z0-9]{5}$/.test(co)) {
      setCombo({ order: co, t: ct });
      setMode("file");
      setStep("file");
      return;
    }
    /* 11/23: 결과 예시 페이지의 '이 리포트 받기' 버튼 — 바로 대화 파일 올리기부터 */
    if (sp.get("track") === "ex" || sp.get("track") === "on") {
      const tk = sp.get("track") as "on" | "ex";
      setTrack(tk);
      if (tk === "ex") setAnswers((a) => ({ ...a, rel: "ex" }));
    }
    if (sp.get("start") === "file") {
      setMode("file");
      setStep("file");
      sendSiteEvent("chat_start", { step: "file" });
      return;
    }
    if (sp.get("start") === "quiz") {
      setMode("quiz");
      setStep("quiz");
      sendSiteEvent("chat_start", { step: "quiz" });
    }
  }, []);

  const free = useMemo(() => (mode === "quiz" && (step === "free" || step === "form") ? freeChatType(answers) : null), [mode, step, answers]);
  const thisYear = new Date().getFullYear();
  const age = birthYear ? thisYear - Number(birthYear) - 1 : null;
  const minor = age !== null && age < 19;
  const under14 = age !== null && age < 14;

  const pick = (v: string) => {
    const q = CHAT_QUESTIONS[qi];
    const next = { ...answers, [q.id]: v };
    setAnswers(next);
    if (qi + 1 < CHAT_QUESTIONS.length) setQi(qi + 1);
    else {
      setStep("free");
      sendSiteEvent("preview_view", { order: "" });
      window.scrollTo({ top: 0 });
    }
  };

  const submit = async () => {
    setErr(null);
    /* 11/28: 서버까지 가기 전에 빠진 칸을 바로 알려 줌 */
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr("결과 받을 이메일을 확인해 주세요.");
    if (!birthYear) return setErr("출생연도를 골라 주세요.");
    if (!agree) return setErr("안내 사항에 동의해 주세요.");
    if (under14) return setErr("만 14세 미만은 결제할 수 없어요.");
    if (minor && !guardianOk) return setErr("보호자 동의를 확인해 주세요.");
    setBusy(true);
    try {
      const r = await fetch("/api/chat/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          /* 11/28: 파일 분석도 상황 질문(건너뛰기 가능) 답을 함께 보냄 */
          answers,
          source: mode === "file" ? "file" : "images",
          stats: fileData ? { ...fileData.stats, meName: "", partnerName: "" } : null,
          name, email, birthYear: Number(birthYear), guardianOk, marketingOk, product, partnerLabel, mySide: "right", utm: readUtm(),
        }),
      });
      const j = (await r.json()) as { ok: boolean; orderNumber?: string; token?: string; message?: string };
      if (!j.ok || !j.orderNumber) throw new Error(j.message ?? "잠시 후 다시 시도해 주세요.");
      if (mode === "file" && fileData) {
        /* 결제 화면으로 가기 전에 대화 원문 저장 — 상대 이름은 호칭으로 바꿔서 보냄 */
        const text = transcript(fileData.msgs, fileData.meName, fileData.partnerName, partnerLabel.trim() || "그 사람");
        const u = await fetch("/api/chat/upload-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: j.orderNumber, t: j.token, text }),
        });
        const uj = (await u.json().catch(() => ({}))) as { ok?: boolean; message?: string };
        if (!uj.ok) throw new Error(uj.message ?? "대화 저장에 실패했어요. 다시 시도해 주세요.");
      }
      sendSiteEvent("apply_complete", { order: "" });
      router.push(`/chat/order/${j.orderNumber}?t=${encodeURIComponent(j.token ?? "")}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  };

  const comboSubmit = async () => {
    if (!combo || !fileData) return;
    setErr(null);
    setBusy(true);
    try {
      const text = transcript(fileData.msgs, fileData.meName, fileData.partnerName, partnerLabel.trim() || "그 사람");
      const u = await fetch("/api/chat/upload-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: combo.order, t: combo.t, text }),
      });
      const uj = (await u.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!uj.ok) throw new Error(uj.message ?? "대화 저장에 실패했어요. 다시 시도해 주세요.");
      setComboRun(true);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const card = "fx-glass rounded-2xl px-5 py-5";
  const btn =
    "fx-sheen inline-flex min-h-14 w-full items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-burgundy to-burgundy-deep px-5 text-[0.97rem] font-semibold text-ivory active:opacity-85 disabled:opacity-50";

  if (combo && comboRun) return <ChatProcessing orderNumber={combo.order} token={combo.t} />;

  if (combo && step === "free" && fileData)
    return (
      <div className="mx-auto max-w-[560px] px-5 pb-28 pt-24">
        <StatsPreview s={fileData.stats} partnerLabel={partnerLabel.trim() || "그 사람"} />
        <div className={`${card} mt-6 flex flex-col gap-3`}>
          <p className="text-[0.9rem] font-semibold text-ivory">결제가 끝난 카톡 대화 분석이에요</p>
          <p className="text-[0.82rem] leading-[1.7] text-ivory-dim">이 대화로 해석 리포트와 다음에 보낼 메시지를 만들어 드려요. 보통 1~2분 걸려요.</p>
          <label className="text-[0.82rem] text-ivory-dim">
            상대를 부를 호칭 (실명 대신, 예: 그 사람 · 그 애 · J)
            <input value={partnerLabel} onChange={(e) => setPartnerLabel(e.target.value)} maxLength={12} placeholder="그 사람" className="mt-1 h-12 w-full rounded-xl border border-gold-dim bg-ink px-3 text-ivory" />
          </label>
          {err && <p className="text-[0.84rem] text-thread">{err}</p>}
          <button type="button" className={btn} onClick={comboSubmit} disabled={busy}>
            {busy ? "올리는 중…" : "이 대화로 리포트 만들기"}
          </button>
        </div>
      </div>
    );

  if (step === "intro")
    return (
      <ChatLanding
        totals={totals}
        reviews={reviews}
        onFile={() => {
          setMode("file");
          setStep("track");
          sendSiteEvent("chat_start", { step: "file" });
          window.scrollTo({ top: 0 });
        }}
        onQuiz={() => {
          setMode("quiz");
          setStep("quiz");
          sendSiteEvent("chat_start", { step: "quiz" });
          window.scrollTo({ top: 0 });
        }}
      />
    );

  if (step === "file")
    return (
      <ChatFileFlow
        onReady={(r) => {
          setFileData(r);
          /* 11/28: 결제 끝난 묶음 손님은 바로, 나머지는 상황 질문 3개(건너뛰기 가능) 뒤 무료 결과 */
          if (combo) {
            setStep("free");
            sendSiteEvent("preview_view", { order: "" });
          } else {
            setCi(0);
            setStep("ctx");
          }
          window.scrollTo({ top: 0 });
        }}
        onQuiz={() => {
          setMode("quiz");
          setStep("quiz");
        }}
      />
    );

  if (step === "track")
    return (
      <div className="mx-auto max-w-[560px] px-5 pb-24 pt-24">
        <p className="text-[0.74rem] tracking-[0.2em] text-gold">시작하기 전에</p>
        <SplitWords as="h2" className="font-display mt-2 block text-[1.6rem] font-bold leading-snug text-ivory" text="그 사람과 지금 어떤 사이예요?" />
        <p className="mt-2 text-[0.88rem] leading-[1.8] text-ivory-dim">고른 상황에 맞춰 리포트가 보는 관점이 달라져요. 가격은 같아요.</p>
        <div className="mt-6 flex flex-col gap-3">
          {(
            [
              ["on", "아직 이어지는 사이", "썸 · 연애 중 · 짝사랑 · 연락이 뜸해진 사이", "대화 습관, 그 사람이 보내는 신호의 가능성, 부담 낮은 다음 걸음"],
              ["ex", "이미 헤어진 사이", "헤어졌지만 대화가 남아 있는 사이", "왜 멀어졌는지 대화 근거, 지금 연락해도 되는 기준, 보낼 문장·보내지 말 문장"],
            ] as const
          ).map(([k, t, sub, get]) => (
            <div key={k} className="fx-glass rounded-2xl px-5 py-5">
              <button
                type="button"
                onClick={() => {
                  setTrack(k);
                  setAnswers((a) => {
                    const n = { ...a };
                    if (k === "ex") n.rel = "ex";
                    else if (n.rel === "ex") delete n.rel;
                    return n;
                  });
                  sendSiteEvent("chat_ctx", { step: `track_${k}` });
                  setStep("file");
                  window.scrollTo({ top: 0 });
                }}
                className="block w-full text-left"
              >
                <span className="flex items-center justify-between">
                  <span className="font-display text-[1.25rem] font-bold text-ivory">{t}</span>
                  <span className="text-[#e46b8a]">›</span>
                </span>
                <span className="mt-1 block text-[0.8rem] text-ivory-dim">{sub}</span>
                <span className="mt-3 block rounded-xl bg-black/25 px-3.5 py-2.5 text-[0.82rem] leading-[1.7] text-ivory">받는 것 · {get}</span>
              </button>
              <Link href={`/chat/sample${k === "ex" ? "?track=ex" : ""}`} className="mt-3 inline-block text-[0.8rem] text-[#e46b8a] underline underline-offset-4">
                결과 예시 보기 ›
              </Link>
            </div>
          ))}
        </div>
      </div>
    );

  if (step === "ctx") {
    /* 11/28 두 갈래: 헤어진 사이를 골랐으면 '어떤 사이' 질문은 건너뛰고, 이어지는 사이면 '헤어진 연인' 보기는 뺌 */
    const ctxQs = FILE_CTX_QUESTIONS.filter((x) => !(x.id === "rel" && track === "ex")).map((x) =>
      x.id === "rel" && track === "on" ? { ...x, options: x.options.filter((o) => o.v !== "ex") } : x
    );
    const q = ctxQs[Math.min(ci, ctxQs.length - 1)];
    const done = (skipped: boolean) => {
      sendSiteEvent("chat_ctx", { step: skipped ? `skip${ci + 1}` : "done" });
      setStep("free");
      sendSiteEvent("preview_view", { order: "" });
      window.scrollTo({ top: 0 });
    };
    const pickCtx = (v: string) => {
      setAnswers((a) => ({ ...a, [q.id]: v }));
      if (ci + 1 < ctxQs.length) setCi(ci + 1);
      else done(false);
    };
    return (
      <div className="mx-auto max-w-[560px] px-5 pb-24 pt-24">
        <p className="text-[0.74rem] tracking-[0.2em] text-gold">2단계 · 상황 알려주기 (선택)</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-soft">
          <div className="h-full bg-gradient-to-r from-[#8a2442] to-[#e46b8a] transition-all duration-500" style={{ width: `${((ci + 1) / ctxQs.length) * 100}%` }} />
        </div>
        <p className="mt-5 text-[0.78rem] text-ivory-dim">
          {ci + 1} / {ctxQs.length} · 답해 주시면 리포트가 내 상황에 더 맞춰져요
        </p>
        <SplitWords key={q.id} as="h2" className="font-display mt-2 block text-[1.5rem] font-bold leading-snug text-ivory" text={q.q} />
        <InView key={`c-${q.id}`} className="mt-6 flex flex-col gap-2.5">
          {q.options.map((o, oi) => (
            <button
              key={o.v}
              type="button"
              onClick={() => pickCtx(o.v)}
              style={{ ["--i" as string]: oi * 0.25 }}
              className={`fx-pop rounded-xl border px-4 py-4 text-left text-[0.95rem] transition-colors active:scale-[0.99] ${answers[q.id] === o.v ? "border-[#e46b8a] bg-[#e46b8a]/10 text-ivory" : "border-gold-dim bg-ink-soft text-ivory"}`}
            >
              {o.label}
            </button>
          ))}
        </InView>
        <div className="mt-6 flex items-center justify-between text-[0.84rem] text-ivory-dim">
          {ci > 0 ? (
            <button type="button" onClick={() => setCi(ci - 1)} className="underline underline-offset-4">
              이전
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={() => done(true)} className="underline underline-offset-4">
            건너뛰고 무료 결과 보기 ›
          </button>
        </div>
      </div>
    );
  }

  if (step === "quiz") {
    const q = CHAT_QUESTIONS[qi];
    return (
      <div className="mx-auto max-w-[560px] px-5 pb-24 pt-24">
        <div className="h-1.5 overflow-hidden rounded-full bg-ink-soft">
          <div className="h-full bg-gradient-to-r from-[#8a2442] to-[#e46b8a] transition-all duration-500" style={{ width: `${((qi + 1) / CHAT_QUESTIONS.length) * 100}%` }} />
        </div>
        <p className="mt-6 text-[0.78rem] text-gold">
          {qi + 1} / {CHAT_QUESTIONS.length}
        </p>
        <SplitWords key={q.id} as="h2" className="font-display mt-2 block text-[1.55rem] font-bold leading-snug text-ivory" text={q.q} />
        <InView key={`o-${q.id}`} className="mt-6 flex flex-col gap-2.5">
          {q.options.map((o, oi) => (
            <button
              key={o.v}
              type="button"
              onClick={() => pick(o.v)}
              style={{ ["--i" as string]: oi * 0.25 }}
              className={`fx-pop rounded-xl border px-4 py-4 text-left text-[0.95rem] transition-colors active:scale-[0.99] ${answers[q.id] === o.v ? "border-[#e46b8a] bg-[#e46b8a]/10 text-ivory" : "border-gold-dim bg-ink-soft text-ivory"}`}
            >
              {o.label}
            </button>
          ))}
        </InView>
        {qi > 0 && (
          <button type="button" onClick={() => setQi(qi - 1)} className="mt-6 text-[0.84rem] text-ivory-dim underline underline-offset-4">
            이전 질문
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[560px] px-5 pb-28 pt-24">
      {mode === "file" && fileData && (
        <>
          <StatsPreview s={fileData.stats} partnerLabel={partnerLabel.trim() || "그 사람"} />
          <div className={`${card} mt-4`}>
            <p className="text-[0.8rem] font-semibold text-gold">해석 리포트에서 이어서 열리는 것</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-[0.9rem] text-ivory">
              {FILE_LOCKED.map((t) => (
                <li key={t}>🔒 {t}</li>
              ))}
            </ul>
            <p className="mt-3 text-[0.78rem] leading-[1.7] text-ivory-dim">월화가 대화 전체를 읽고, 위 숫자가 왜 그렇게 나왔는지 실제 대화를 근거로 풀어 드려요.</p>
          </div>
          {/* 11/3 — 숫자는 어디서나 나와요. 돈을 낼 이유 = '그래서 뭘 보내야 하는지' (결과 예시 일부를 먼저 보여줌) */}
          <div className={`${card} mt-4`}>
            <p className="text-[0.8rem] font-semibold text-gold">숫자 다음, 리포트가 답하는 것 · 결과 예시</p>
            <p className="mt-2 text-[0.92rem] font-semibold text-ivory">“그래서 지금 뭘 보내야 해?”</p>
            <div className="mt-2 rounded-2xl rounded-tr-md bg-[#fee500] px-4 py-2.5 text-[0.9rem] text-[#1a1215]">그때 말한 전시 이번 주까지래, 생각나서 ㅎㅎ</div>
            <p className="mt-1.5 text-[0.78rem] leading-[1.6] text-ivory-dim">의도 · 부담 없는 정보형 — 답하기 쉬움 · 예상 반응 · 짧더라도 답장이 올 가능성이 높은 문장</p>
            <p className="mt-2 select-none text-[0.84rem] text-ivory-dim blur-[4px]" aria-hidden>오늘 비 온대 우산 챙겨! · 챙김형 — 짧게 끝내기</p>
            <Link href="/chat/sample" className="mt-3 inline-block text-[0.84rem] text-[#e46b8a] underline underline-offset-4">결과 예시 전체 보기 →</Link>
          </div>
        </>
      )}
      {free && (
        <>
          <p className="text-[0.74rem] tracking-[0.2em] text-gold">무료 결과 · 대화 유형</p>
          <SplitWords as="h2" className="font-display mt-2 block text-[1.7rem] font-bold leading-snug" wordClassName="fx-shine" text={free.name} />
          <p className="mt-1 text-[0.92rem] text-[#e46b8a]">{free.line}</p>
          <p className="mt-4 text-[0.95rem] leading-[1.9] text-ivory">{free.desc}</p>
          <ShareTypeButton typeKey={free.key} typeName={free.name} />
          <div className={`${card} mt-6`}>
            <p className="text-[0.8rem] font-semibold text-gold">지금은 이것만 하지 마세요</p>
            <ul className="mt-2 flex flex-col gap-2.5">
              {free.avoid.map((a) => (
                <li key={a.what}>
                  <p className="text-[0.93rem] font-medium text-ivory">✕ {a.what}</p>
                  <p className="mt-0.5 text-[0.82rem] leading-[1.7] text-ivory-dim">{a.why}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className={`${card} mt-4`}>
            <p className="text-[0.8rem] font-semibold text-gold">실제 캡처를 올리면 이어서 열리는 것</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-[0.9rem] text-ivory">
              {CHAT_LOCKED_ITEMS.map((t) => (
                <li key={t}>🔒 {t}</li>
              ))}
            </ul>
            <p className="mt-3 text-[0.78rem] leading-[1.7] text-ivory-dim">
              지금 결과는 고르신 답만으로 본 유형이에요. 실제 대화를 읽으면 유형이 바뀌기도 해요.
            </p>
          </div>
        </>
      )}

      <div className="mt-8 flex flex-col gap-2.5">
        {([
          ["chat", "카톡 대화 분석", CHAT_PRICE_KRW, mode === "file" ? "대화 전체 해석 리포트 + 다음 메시지 예시 3개" : "캡처 최대 10장 · 결과 + 다음 메시지 예시 3개"],
          ["chat_bundle", "카톡 분석 + 재회 분석 패키지", CHAT_BUNDLE_PRICE_KRW, "사연으로 보는 재회 분석(편지·리추얼·21일 가이드)까지"],
        ] as const).map(([k, t, p, d]) => (
          <button
            key={k}
            type="button"
            onClick={() => setProduct(k)}
            className={`rounded-2xl border px-4 py-4 text-left ${product === k ? "border-[#e46b8a] bg-[#e46b8a]/10" : "border-gold-dim bg-ink-soft"}`}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-[0.95rem] font-semibold text-ivory">{t}</span>
              <span className="font-display text-[1.15rem] text-[#e46b8a]">{won(p)}</span>
            </span>
            <span className="mt-1 block text-[0.8rem] text-ivory-dim">{d}</span>
          </button>
        ))}
        <p className="text-center text-[0.76rem] text-ivory-dim">1회 결제 · 정기결제 없음 · 결과 30일 열람</p>
      </div>

      {step === "free" ? (
        <button type="button" className={`${btn} mt-6`} onClick={() => { setStep("form"); sendSiteEvent("chat_form", { step: mode }); }}>
          {mode === "file" ? "해석 리포트 받기" : "캡처 올리고 분석받기"}
        </button>
      ) : (
        <div className={`${card} mt-6 flex flex-col gap-3`}>
          <label className="text-[0.82rem] text-ivory-dim">
            결과에서 불러 드릴 이름 (선택 · 별명도 좋아요)
            <input value={name} autoComplete="nickname" onChange={(e) => setName(e.target.value)} maxLength={20} className="mt-1 h-12 w-full rounded-xl border border-gold-dim bg-ink px-3 text-ivory" />
          </label>
          <label className="text-[0.82rem] text-ivory-dim">
            상대를 부를 호칭 (실명 대신, 예: 그 사람 · 그 애 · J)
            <input value={partnerLabel} onChange={(e) => setPartnerLabel(e.target.value)} maxLength={12} placeholder="그 사람" className="mt-1 h-12 w-full rounded-xl border border-gold-dim bg-ink px-3 text-ivory" />
          </label>
          <label className="text-[0.82rem] text-ivory-dim">
            결과 받을 이메일 (결과 링크를 보내 드려요)
            <input type="email" inputMode="email" autoComplete="email" placeholder="example@naver.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-gold-dim bg-ink px-3 text-ivory" />
          </label>
          <label className="text-[0.82rem] text-ivory-dim">
            출생연도 (만 14세 이상 확인용)
            <select value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-gold-dim bg-ink px-3 text-ivory">
              <option value="">선택해 주세요</option>
              {Array.from({ length: 60 }, (_, i) => thisYear - 10 - i).map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
          </label>
          {under14 && <p className="text-[0.82rem] text-thread">만 14세 미만은 결제할 수 없어요. 무료 결과까지만 볼 수 있어요.</p>}
          {minor && !under14 && (
            <label className="flex gap-2 text-[0.82rem] leading-[1.7] text-ivory">
              <input type="checkbox" checked={guardianOk} onChange={(e) => setGuardianOk(e.target.checked)} className="mt-1 shrink-0" />
              <span className="min-w-0">만 19세 미만이에요. 보호자(법정대리인)에게 결제 동의를 받았어요. 동의 없이 결제하면 보호자가 결제를 취소할 수 있어요.</span>
            </label>
          )}
          <label className="flex gap-2 text-[0.82rem] leading-[1.7] text-ivory">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 shrink-0" />
            <span className="min-w-0">
              올린 대화(파일·캡처)는 분석에만 쓰이고 분석 직후 삭제되는 것, 결과는 대화 패턴을 바탕으로 한 참고 의견이라는 것에 동의해요. (
              <Link href="/privacy" className="underline">개인정보처리방침</Link> · <Link href="/refund" className="underline">환불정책</Link>)
            </span>
          </label>
          <label className="flex gap-2 text-[0.8rem] leading-[1.7] text-ivory-dim">
            <input type="checkbox" checked={marketingOk} onChange={(e) => setMarketingOk(e.target.checked)} className="mt-1 shrink-0" />
            <span>(선택) 월하연 소식 메일 받기</span>
          </label>
          {err && <p className="text-[0.84rem] text-thread">{err}</p>}
          <button type="button" className={btn} disabled={busy || under14} onClick={submit}>
            {busy ? "준비하는 중…" : mode === "file" ? "다음: 결제하기" : "다음: 캡처 올리기"}
          </button>
        </div>
      )}
      {/* 11/27 운영자 요청: 무료 결과(미리보기) 아래 — 카톡 분석 후기 · SNS·유튜브 · 칼럼 */}
      {step === "free" && (
        <div className="-mx-5">
          <PreviewExtras kind="chat" />
        </div>
      )}
    </div>
  );
}
