"use client";

/**
 * 카톡 대화 분석 — 무료 선택형 질문 → 무료 대화 유형 → 상품 선택 → 주문 생성
 * 무료 단계는 API 비용 없음 (lib/chat/questions.freeChatType)
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CHAT_QUESTIONS, CHAT_LOCKED_ITEMS, freeChatType } from "@/lib/chat/questions";
import { CHAT_PRICE_KRW, CHAT_BUNDLE_PRICE_KRW, type ChatProduct } from "@/lib/chat/types";
import { sendSiteEvent } from "@/lib/site-track";
import ChatLanding from "@/components/chat/ChatLanding";
import ChatFileFlow, { StatsPreview, type FileReady } from "@/components/chat/ChatFileFlow";
import { transcript } from "@/lib/chat/kakao-parse";

type Step = "intro" | "file" | "quiz" | "free" | "form";

const FILE_LOCKED = [
  "그 사람은 지금 나를 어떻게 생각할까 — 숫자 뒤의 해석",
  "우리 관계는 어디로 흘러갈까 — 만남·약속 얘기의 흐름",
  "말하지 않고 숨기는 마음 — 말과 행동의 온도차",
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

export default function ChatFunnel() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [mode, setMode] = useState<"file" | "quiz">("file");
  const [fileData, setFileData] = useState<FileReady | null>(null);
  const [qi, setQi] = useState(0);
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
    if (!agree) return setErr("안내 사항에 동의해 주세요.");
    if (under14) return setErr("만 14세 미만은 결제할 수 없어요.");
    if (minor && !guardianOk) return setErr("보호자 동의를 확인해 주세요.");
    setBusy(true);
    try {
      const r = await fetch("/api/chat/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: mode === "quiz" ? answers : {},
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

  const card = "rounded-2xl border border-gold-dim bg-ink-soft px-5 py-5";
  const btn =
    "inline-flex min-h-14 w-full items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-burgundy to-burgundy-deep px-5 text-[0.97rem] font-semibold text-ivory active:opacity-85 disabled:opacity-50";

  if (step === "intro")
    return (
      <ChatLanding
        onFile={() => {
          setMode("file");
          setStep("file");
          window.scrollTo({ top: 0 });
        }}
        onQuiz={() => {
          setMode("quiz");
          setStep("quiz");
          window.scrollTo({ top: 0 });
        }}
      />
    );

  if (step === "file")
    return (
      <ChatFileFlow
        onReady={(r) => {
          setFileData(r);
          setStep("free");
          sendSiteEvent("preview_view", { order: "" });
          window.scrollTo({ top: 0 });
        }}
        onQuiz={() => {
          setMode("quiz");
          setStep("quiz");
        }}
      />
    );

  if (step === "quiz") {
    const q = CHAT_QUESTIONS[qi];
    return (
      <div className="mx-auto max-w-[560px] px-5 pb-24 pt-24">
        <div className="h-1.5 overflow-hidden rounded-full bg-ink-soft">
          <div className="h-full bg-burgundy transition-all" style={{ width: `${((qi + 1) / CHAT_QUESTIONS.length) * 100}%` }} />
        </div>
        <p className="mt-6 text-[0.78rem] text-gold">
          {qi + 1} / {CHAT_QUESTIONS.length}
        </p>
        <h2 className="font-display mt-2 text-[1.35rem] font-bold leading-snug text-ivory">{q.q}</h2>
        <div className="mt-6 flex flex-col gap-2.5">
          {q.options.map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => pick(o.v)}
              className={`rounded-xl border px-4 py-4 text-left text-[0.95rem] ${answers[q.id] === o.v ? "border-burgundy bg-[#f6e9ec] text-ivory" : "border-gold-dim bg-ink-soft text-ivory"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
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
        </>
      )}
      {free && (
        <>
          <p className="text-[0.74rem] tracking-[0.2em] text-gold">무료 결과 · 대화 유형</p>
          <h2 className="font-display mt-2 text-[1.5rem] font-bold leading-snug text-ivory">{free.name}</h2>
          <p className="mt-1 text-[0.92rem] text-burgundy">{free.line}</p>
          <p className="mt-4 text-[0.95rem] leading-[1.9] text-ivory">{free.desc}</p>
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
            className={`rounded-2xl border px-4 py-4 text-left ${product === k ? "border-burgundy bg-[#f6e9ec]" : "border-gold-dim bg-ink-soft"}`}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-[0.95rem] font-semibold text-ivory">{t}</span>
              <span className="font-display text-[1.15rem] text-burgundy">{won(p)}</span>
            </span>
            <span className="mt-1 block text-[0.8rem] text-ivory-dim">{d}</span>
          </button>
        ))}
        <p className="text-center text-[0.76rem] text-ivory-dim">1회 결제 · 정기결제 없음 · 결과 30일 열람</p>
      </div>

      {step === "free" ? (
        <button type="button" className={`${btn} mt-6`} onClick={() => setStep("form")}>
          {mode === "file" ? "해석 리포트 받기" : "캡처 올리고 분석받기"}
        </button>
      ) : (
        <div className={`${card} mt-6 flex flex-col gap-3`}>
          <label className="text-[0.82rem] text-ivory-dim">
            결과에서 불러 드릴 이름
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} className="mt-1 h-12 w-full rounded-xl border border-gold-dim bg-ink px-3 text-ivory" />
          </label>
          <label className="text-[0.82rem] text-ivory-dim">
            상대를 부를 호칭 (실명 대신, 예: 그 사람 · 그 애 · J)
            <input value={partnerLabel} onChange={(e) => setPartnerLabel(e.target.value)} maxLength={12} placeholder="그 사람" className="mt-1 h-12 w-full rounded-xl border border-gold-dim bg-ink px-3 text-ivory" />
          </label>
          <label className="text-[0.82rem] text-ivory-dim">
            결과 받을 이메일
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-gold-dim bg-ink px-3 text-ivory" />
          </label>
          <label className="text-[0.82rem] text-ivory-dim">
            출생연도
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
    </div>
  );
}
