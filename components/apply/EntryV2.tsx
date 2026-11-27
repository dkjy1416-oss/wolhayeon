"use client";

/**
 * 11/27 운영자 요청: 재회 분석 새 진입 프로토타입 (/apply/v2, noindex).
 * 청월당 신년운세 진입 구조를 월하연 재회 분석에 옮김 — 화이트보드 "재회 분석 새 진입 구조".
 *   ①표지 → ②대화창에 보내고 싶은 한 줄 → ③전송 순간 월화 "잠깐." → ④월화 소개
 *   → ⑤월화가 한 질문씩 (질문·저장 필드는 /apply 와 같은 STEPS 그대로)
 *   → ⑥붉은 실 고르기 → ⑦읽는 중 → ⑧두 이름 카드 → 기존 /apply/confirm → 기존 미리보기
 * 새 이미지 없이 기존 이미지만 사용. 지금 /apply 흐름은 건드리지 않음.
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EMPTY_APPLICATION, isValidEmail, type RitualApplication } from "@/lib/ritual-types";
import { loadApplication, saveApplication } from "@/lib/ritual-storage";
import { STEPS, StepInput, autoAdvances, type StepDef } from "@/components/apply/ImmersiveApplyExperience";

const IMG = {
  cover: "/wolhwa/v5/p_ritual.webp",
  night: "/book/v3/night.webp",
  typing: "/book/v3/typing.webp",
  wait: "/wolhwa/v4/wait.webp",
  thread: "/book/v3/w-thread.webp",
  explain: "/wolhwa/v4/explain.webp",
  smile: "/wolhwa/v4/smile.webp",
  hold: "/wolhwa/v4/thread.webp",
  letter: "/wolhwa/v4/letter.webp",
  reading: "/book/v3/w-reading.webp",
  fight: "/book/v3/fight2.webp",
  street: "/book/v3/cry.webp",
  alone: "/book/v3/alone.webp",
};

/* 화이트보드 ⑤ 순서: 이름 → 그 사람 → 관계 → 기간·연락 → 누가 먼저 → 마음 → 알고 싶은 것 → 이야기 → 선택 묶음 → 이메일 */
const ORDER = [
  "applicant_name",
  "partner_name",
  "relationship_type",
  "breakup_elapsed",
  "contact_status",
  "breakup_initiator",
  "last_conversation",
  "current_emotion",
  "pain_points",
  "main_wish",
  "story",
  "last_conversation_memory",
  "partner_new_relationship",
  "safety_concerns",
  "relationship_duration",
  "applicant_birth_year",
  "applicant_gender",
  "life_stage",
  "partner_birth_year",
  "email",
];
const V2_STEPS: StepDef[] = ORDER.map((id) => STEPS.find((s) => s.id === id)).filter(Boolean) as StepDef[];

/* 질문마다 월화 표정(기존 이미지) */
const FACE: Record<string, string> = {
  applicant_name: IMG.smile,
  partner_name: IMG.explain,
  relationship_type: IMG.explain,
  breakup_elapsed: IMG.hold,
  contact_status: IMG.hold,
  breakup_initiator: IMG.hold,
  last_conversation: IMG.letter,
  current_emotion: IMG.smile,
  pain_points: IMG.hold,
  main_wish: IMG.explain,
  story: IMG.letter,
  last_conversation_memory: IMG.letter,
  email: IMG.smile,
};

/* 답을 들은 뒤 월화 한마디 (청월당 "지영? 예쁜 이름이네요" 자리) */
const REACT: Record<string, string> = {
  applicant_name: "{name}님, 예쁜 이름이에요.\n이제부터 그렇게 부를게요.",
  partner_name: "{partner}님…\n그 이름을 말하는 것도 쉽지 않았을 거예요.",
  current_emotion: "그 마음, 이상한 게 아니에요.",
  story: "말해 줘서 고마워요.\n조금만 더 물어볼게요.",
};

type Phase = "cover" | "toon" | "chat" | "stop" | "travel" | "meet" | "q" | "react" | "ritual" | "load" | "card";

const LINE_KEY = "wolhayeon_v2_line";

export default function EntryV2() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("cover");
  const [app, setApp] = useState<RitualApplication>({ ...EMPTY_APPLICATION });
  const [loaded, setLoaded] = useState(false);
  const [line, setLine] = useState("");
  const [meetIdx, setMeetIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);
  const [reactText, setReactText] = useState("");
  const [knot, setKnot] = useState<number | null>(null);
  const [pct, setPct] = useState(0);
  const [shake, setShake] = useState(false);
  const [beat, setBeat] = useState(0);
  const [sent, setSent] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setApp(loadApplication());
    try {
      setLine(sessionStorage.getItem(LINE_KEY) ?? "");
    } catch {
      /* noop */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) saveApplication(app);
  }, [app, loaded]);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const steps = useMemo(
    () => V2_STEPS.filter((s) => !s.visible || s.visible(app)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app.relationship_type]
  );
  const total = steps.length;
  const idx = Math.min(step, total - 1);
  const cur = steps[idx];

  const name = app.applicant_name.trim() || "당신";
  const partner = app.partner_name.trim() || "그 사람";
  const fill = useCallback(
    (t: string) => t.replaceAll("{name}", name).replaceAll("{partner}", partner),
    [name, partner]
  );

  /* ③ 전송 → 흔들림 → "잠깐." */
  const send = () => {
    const l = line.trim() || "자니..? 그냥 갑자기 생각나서";
    setLine(l);
    try {
      sessionStorage.setItem(LINE_KEY, l);
    } catch {
      /* noop */
    }
    /* 보내려던 한 줄은 '이야기'에 미리 넣어 둠 (나중에 고칠 수 있음) */
    setApp((a) => (a.story.trim() ? a : { ...a, story: `보내려던 한 줄: "${l}"\n` }));
    setSent(true);
    timer.current = window.setTimeout(() => {
      setShake(true);
      timer.current = window.setTimeout(() => {
        setShake(false);
        setSent(false);
        setPhase("stop");
      }, 450);
    }, 700);
  };

  /* ④ 월화 소개 말풍선 */
  const MEET = [
    "방금 보내려던 분, 맞죠?",
    "저는 월화예요.\n보내기 전에 마음을 먼저 듣는 사람이에요.",
    "그 한 줄, 보내도 될지\n두 사람 이야기부터 같이 볼까요?",
  ];

  const next = () => {
    if (!cur) return;
    if (!cur.valid(app)) {
      setTried(true);
      return;
    }
    advance();
  };
  /* 검사 없이 다음으로 (하나 고르면 자동으로 넘어가는 질문용) */
  const advance = () => {
    if (!cur) return;
    setTried(false);
    const r = REACT[cur.id];
    const go = () => {
      if (idx >= total - 1) setPhase("ritual");
      else {
        setStep(idx + 1);
        setPhase("q");
      }
    };
    if (r) {
      setReactText(fill(r));
      setPhase("react");
      timer.current = window.setTimeout(go, 1700);
    } else go();
  };
  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  const back = () => {
    if (idx > 0) setStep(idx - 1);
    else setPhase("meet");
  };
  const picked = (v: string) => {
    if (!cur || !autoAdvances(cur, v)) return;
    timer.current = window.setTimeout(() => advanceRef.current(), 320);
  };

  /* ⑦ 읽는 중 → ⑧ 두 이름 카드 → 기존 확인 화면 */
  useEffect(() => {
    if (phase !== "load") return;
    setPct(0);
    const t0 = Date.now();
    const iv = window.setInterval(() => {
      const p = Math.min(100, Math.round(((Date.now() - t0) / 3200) * 100));
      setPct(p);
      if (p >= 100) {
        window.clearInterval(iv);
        setPhase("card");
      }
    }, 60);
    return () => window.clearInterval(iv);
  }, [phase]);
  useEffect(() => {
    if (phase !== "card") return;
    const t = window.setTimeout(() => router.push("/apply/confirm"), 2600);
    return () => window.clearTimeout(t);
  }, [phase, router]);

  /* 웹툰 인트로: 컷이 차례로 들어오고 말풍선이 뜬 뒤 카톡 화면으로 (청월당 오프닝 구조) */
  const BEATS = [0, 450, 1000, 1500, 2900, 3350, 3900, 5600];
  useEffect(() => {
    if (phase !== "toon") return;
    setBeat(0);
    const ts = BEATS.slice(1).map((ms, i) =>
      window.setTimeout(() => {
        if (i + 1 >= BEATS.length - 1) setPhase("chat");
        else setBeat(i + 1);
      }, ms)
    );
    return () => ts.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const bg =
    phase === "cover"
      ? IMG.cover
      : phase === "stop"
          ? IMG.wait
          : phase === "travel"
            ? IMG.thread
            : phase === "meet"
              ? IMG.explain
              : phase === "load" || phase === "card"
                ? IMG.reading
                : phase === "ritual"
                  ? IMG.thread
                  : null;

  const btn =
    "inline-flex h-[56px] w-full items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-[#6a1b26] to-[#341015] text-[0.98rem] font-semibold text-ivory active:opacity-85";

  return (
    <div className={`relative mx-auto min-h-[100svh] w-full max-w-[480px] overflow-hidden bg-[#0b0809] text-ivory ${shake ? "v2-shake" : ""}`}>
      <style>{`
        .v2-fade{animation:v2f .6s ease both}
        @keyframes v2f{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .v2-zoom{animation:v2z 6s ease-out both}
        @keyframes v2z{from{transform:scale(1.12)}to{transform:scale(1)}}
        .v2-shake{animation:v2s .45s linear}
        @keyframes v2s{0%,100%{transform:none}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
        .v2-stop{animation:v2st .5s cubic-bezier(.2,1.6,.4,1) both}
        @keyframes v2st{from{opacity:0;transform:scale(1.8)}to{opacity:1;transform:scale(1)}}
        .v2-in-left{animation:v2il .5s cubic-bezier(.2,.8,.2,1) both}
        @keyframes v2il{from{opacity:0;translate:-60px -20px}to{opacity:1;translate:0 0}}
        .v2-in-right{animation:v2ir .5s cubic-bezier(.2,.8,.2,1) both}
        @keyframes v2ir{from{opacity:0;translate:60px 30px}to{opacity:1;translate:0 0}}
        .v2-pop{animation:v2p .45s cubic-bezier(.2,1.5,.4,1) both}
        @keyframes v2p{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}
        .v2-dust span{position:absolute;top:-10px;width:5px;height:5px;border-radius:9999px;background:radial-gradient(circle,#fff 0,#ffd9df 45%,transparent 70%);opacity:.85;animation-name:v2d;animation-timing-function:linear;animation-iteration-count:infinite}
        @keyframes v2d{from{transform:translateY(0) translateX(0)}to{transform:translateY(110vh) translateX(30px)}}
        .v2-dot{display:block;width:6px;height:6px;border-radius:9999px;background:#f5d64a;animation:v2dot 1s ease-in-out infinite}
        @keyframes v2dot{0%,60%,100%{transform:translateY(0);opacity:.55}30%{transform:translateY(-4px);opacity:1}}
        .v2-typing{animation:v2ty 5s ease-in-out infinite}
        @keyframes v2ty{0%,8%{opacity:0;transform:translateY(4px)}14%,70%{opacity:1;transform:none}78%,100%{opacity:0;transform:translateY(4px)}}
        .v2-glow{animation:v2g 1.6s ease-in-out infinite}
        @keyframes v2g{0%,100%{filter:drop-shadow(0 0 4px #c8324a)}50%{filter:drop-shadow(0 0 14px #ff5a72)}}
      `}</style>

      {phase === "cover" && (
        <video
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover object-[50%_25%]"
          src="/wolhwa/v5/loop_ritual.mp4"
          poster={IMG.cover}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
      {bg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={bg} src={bg} alt="" className="v2-zoom pointer-events-none absolute inset-0 h-full w-full object-cover object-[50%_25%]" />
      )}
      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-black/55 via-black/10 to-black/85" />

      {phase !== "chat" && (<>
      <Link href="/home" className="absolute left-5 top-[calc(env(safe-area-inset-top)+1rem)] z-30 text-[0.82rem] tracking-[0.2em] text-gold/90">
        월하연 月下緣
      </Link>
      <span className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-30 rounded-full bg-black/50 px-2.5 py-1 text-[0.62rem] text-ivory/70">프로토타입</span>
      </>)}

      {/* ① 표지 */}
      {phase === "cover" && (
        <div className="v2-fade relative z-10 flex min-h-[100svh] flex-col justify-end px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
          {/* 11/27 운영자 요청: 홈 배너와 같은 '월화의 관계 리추얼 · 재회 분석' 로고 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wolhwa/v5/logo_ritual.webp" alt="월화의 관계 리추얼 재회 분석" className="v2-fade mx-auto w-[86%] max-w-[380px] drop-shadow-[0_4px_18px_rgba(0,0,0,0.85)]" />
          <p className="mt-2 text-center text-[0.95rem] leading-relaxed text-ivory/90">보낼까, 말까.<br />오늘 밤도 대화창 앞이라면, 월화에게 먼저 들려주세요.</p>
          <button type="button" onClick={() => setPhase("toon")} className={`${btn} mt-7`}>
            내 이야기 시작하기
          </button>
          <p className="mt-3 text-center text-[0.72rem] text-ivory/60">무료 미리보기 · 약 5분</p>
        </div>
      )}

      {/* 웹툰 인트로 — 헤어지던 날 두 컷 → 그 사람 생각 한 컷 */}
      {phase === "toon" && (
        <div className="absolute inset-0 z-20 overflow-hidden bg-[#f4ede4]">
          <div className="v2-dust pointer-events-none absolute inset-0 z-30" aria-hidden>
            {Array.from({ length: 16 }).map((_, i) => (
              <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 8) * 0.55}s`, animationDuration: `${4 + (i % 5)}s` }} />
            ))}
          </div>
          {/* 컷 1·2 — 청월당처럼 위아래 두 컷, 비스듬한 프레임, 말풍선은 얼굴을 피해 모서리에 */}
          <div className={`absolute inset-0 transition-all duration-500 ${beat >= 5 ? "-translate-y-full opacity-0" : ""}`}>
            <div
              className={`absolute left-[3%] top-[6%] h-[43%] w-[94%] ${beat >= 0 ? "v2-in-left" : "opacity-0"}`}
              style={{ clipPath: "polygon(0 3%, 100% 0, 98% 100%, 2% 95%)", transform: "rotate(-1.5deg)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={IMG.fight} alt="" className="h-full w-full object-cover object-[50%_18%]" />
            </div>
            {beat >= 1 && <Bubble className="left-[1%] top-[33%]" text={<>그만하자,<br /><b className="text-[#9b1d32]">우리.</b></>} />}
            <div
              className={`absolute left-[3%] top-[50.5%] h-[43%] w-[94%] ${beat >= 2 ? "v2-in-right" : "opacity-0"}`}
              style={{ clipPath: "polygon(2% 5%, 100% 0, 100% 97%, 0 100%)", transform: "rotate(1deg)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={IMG.street} alt="" className="h-full w-full object-cover object-[60%_14%]" />
            </div>
            {beat >= 3 && <Bubble className="right-[1%] top-[77%]" text={<>…응.<br /><b className="text-[#9b1d32]">잘 지내.</b></>} />}
          </div>
          {/* 컷 3 — 혼자 남은 밤, 그 사람 생각 */}
          {beat >= 5 && (
            <div className="v2-fade absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={IMG.alone} alt="" className="v2-zoom h-full w-full object-cover object-[50%_35%]" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40" />
              {beat >= 6 && <Bubble className="right-[5%] top-[9%]" text={<>그 사람도…<br /><b className="text-[#9b1d32]">가끔 내 생각 할까?</b></>} />}
            </div>
          )}
          <button type="button" onClick={() => setPhase("chat")} aria-label="건너뛰기" className="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-[0.9rem] text-white">
            »
          </button>
        </div>
      )}

      {/* ② 카카오톡 같은 대화창 — 보내고 싶은 한 줄 */}
      {phase === "chat" && (
        <div className="v2-fade absolute inset-0 z-20 flex flex-col bg-[#b2c7d9] text-[#191919]">
          <div className="flex items-center gap-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.9rem)]">
            <span className="text-[1.4rem] leading-none">‹</span>
            <span className="text-[1.05rem] font-bold">그 사람</span>
            <span className="ml-auto flex items-center gap-4 text-[1.1rem] opacity-80">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            <p className="mx-auto mt-2 w-fit rounded-full bg-black/15 px-3 py-1 text-[0.72rem] text-white">2026년 11월 6일 금요일</p>
            {/* 내가 보낸 것 */}
            <div className="mt-4 flex items-end justify-end gap-1.5">
              <span className="text-[0.62rem] text-[#556677]">오후 11:38</span>
              <p className="max-w-[70%] rounded-[14px] rounded-tr-[4px] bg-[#fee500] px-3 py-2 text-[0.92rem]">잘 지내?</p>
            </div>
            {/* 그 사람 */}
            <div className="mt-3 flex items-start gap-2">
              <span className="h-10 w-10 shrink-0 rounded-[15px] bg-[#9fb3c4]" />
              <div>
                <p className="text-[0.72rem] text-[#3d4b57]">그 사람</p>
                <div className="mt-1 flex items-end gap-1.5">
                  <p className="max-w-[70%] rounded-[14px] rounded-tl-[4px] bg-white px-3 py-2 text-[0.92rem]">응 잘 지내</p>
                  <span className="text-[0.62rem] text-[#556677]">오후 11:52</span>
                </div>
              </div>
            </div>
            {/* 11/27 운영자 요청: 카톡 '입력 중' 말풍선 — 점 세 개가 통통 튀고, 썼다 지웠다 하듯 사라졌다 다시 나타남 */}
            <div className="v2-typing mt-3 flex items-start gap-2">
              <span className="h-10 w-10 shrink-0 rounded-[15px] bg-[#9fb3c4]" />
              <div>
                <p className="text-[0.72rem] text-[#3d4b57]">그 사람</p>
                <div className="mt-1 flex h-[34px] w-[58px] items-center justify-center gap-[5px] rounded-[14px] rounded-tl-[4px] bg-[#9fb0c0]/80">
                  <i className="v2-dot" />
                  <i className="v2-dot" style={{ animationDelay: ".18s" }} />
                  <i className="v2-dot" style={{ animationDelay: ".36s" }} />
                </div>
              </div>
            </div>
            {sent && (
              <div className="v2-fade mt-4 flex items-end justify-end gap-1.5">
                <span className="text-right text-[0.62rem] leading-tight text-[#556677]"><b className="block text-[#e8c400]">1</b>지금</span>
                <p className="max-w-[70%] rounded-[14px] rounded-tr-[4px] bg-[#fee500] px-3 py-2 text-[0.92rem]">{line.trim() || "자니..? 그냥 갑자기 생각나서"}</p>
              </div>
            )}
          </div>
          <p className="pb-2 text-center text-[0.66rem] text-[#4e5f6e]">예시 화면이에요 · 여기 쓴 한 줄은 실제로 보내지지 않아요</p>
          <div className="flex items-center gap-2 bg-white px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+0.6rem)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-[1.4rem] text-[#9a9a9a]">+</span>
            <input
              autoFocus
              value={line}
              maxLength={80}
              onChange={(e) => setLine(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !sent) send();
              }}
              placeholder="그 사람에게 보내고 싶은 한 줄"
              className="h-10 flex-1 rounded-full bg-[#f2f2f2] px-4 text-base text-[#191919] placeholder:text-[#a0a0a0] focus:outline-none"
            />
            <button type="button" onClick={() => !sent && send()} className="h-10 shrink-0 rounded-full bg-[#fee500] px-4 text-[0.88rem] font-bold text-[#191919]">
              전송
            </button>
          </div>

        </div>
      )}

      {/* ③ 잠깐. */}
      {phase === "stop" && (
        <button type="button" onClick={() => setPhase("travel")} className="relative z-10 flex min-h-[100svh] w-full flex-col items-center justify-end px-6 pb-[calc(env(safe-area-inset-bottom)+3rem)] text-center">
          <p className="v2-stop font-display text-[3.2rem] font-bold text-ivory drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)]">잠깐.</p>
          <p className="v2-fade mt-4 rounded-2xl bg-black/55 px-4 py-3 text-[0.95rem] leading-relaxed text-ivory/90" style={{ animationDelay: ".5s" }}>
            “{line}”<br />그 한 줄, 보내기 전에…
          </p>
          <span className="mt-6 text-[0.75rem] text-ivory/55">눌러서 계속</span>
        </button>
      )}

      {/* 이동: 붉은 실을 따라 */}
      {phase === "travel" && (
        <button type="button" onClick={() => setPhase("meet")} className="relative z-10 flex min-h-[100svh] w-full flex-col items-center justify-center px-8 text-center">
          <p className="v2-fade font-display text-[1.35rem] leading-[1.9] text-ivory drop-shadow">
            보내지 못한 한 줄이<br />붉은 실을 따라 흘러가요.
          </p>
          <p className="v2-fade mt-6 text-[0.95rem] text-ivory/75" style={{ animationDelay: ".8s" }}>…여기가 어디지?</p>
          <span className="mt-10 text-[0.75rem] text-ivory/55">눌러서 계속</span>
        </button>
      )}

      {/* ④ 월화 등장 */}
      {phase === "meet" && (
        <div className="relative z-10 flex min-h-[100svh] flex-col justify-end px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
          <div key={meetIdx} className="v2-fade relative mb-6 rounded-[28px] bg-[#fbf6ee] px-6 py-5 text-center text-[#2a1d1f] shadow-xl">
            <p className="whitespace-pre-line text-[1.08rem] font-medium leading-[1.75]">{MEET[meetIdx]}</p>
            <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-[#fbf6ee]" />
          </div>
          {meetIdx < MEET.length - 1 ? (
            <button type="button" onClick={() => setMeetIdx((i) => i + 1)} className={btn}>
              다음
            </button>
          ) : (
            <button type="button" onClick={() => { setStep(0); setPhase("q"); }} className={btn}>
              월화에게 이야기하기
            </button>
          )}
        </div>
      )}

      {/* ⑤ 월화가 한 질문씩 */}
      {(phase === "q" || phase === "react") && cur && (
        <div className="relative z-10 flex min-h-[100svh] flex-col bg-[#f6efe6] text-[#2a1d1f]">
          <div className="relative h-[42svh] min-h-[260px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={FACE[cur.id] ?? IMG.explain} src={FACE[cur.id] ?? IMG.explain} alt="월화" className="v2-fade h-full w-full object-cover object-[50%_20%]" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f6efe6] to-transparent" />
            <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+3rem)] flex items-center gap-3 px-5">
              <button type="button" onClick={back} aria-label="이전" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white">←</button>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/40">
                <div className="h-full rounded-full bg-[#c8324a] transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
              </div>
              {cur.optional && idx < total - 1 && (
                <button type="button" onClick={() => { setStep(idx + 1); }} className="text-[0.78rem] text-white underline">건너뛰기</button>
              )}
            </div>
          </div>

          {phase === "react" ? (
            <div className="v2-fade -mt-6 flex flex-1 items-start justify-center px-6">
              <div className="relative rounded-[24px] bg-white px-6 py-5 text-center shadow-lg">
                <p className="whitespace-pre-line text-[1.05rem] font-medium leading-[1.75]">“{reactText}”</p>
              </div>
            </div>
          ) : (
            <>
              <div key={cur.id} className="v2-fade -mt-6 flex-1 overflow-y-auto px-5 pb-4">
                <div className="relative rounded-[24px] bg-white px-5 py-4 shadow-md">
                  <span className="absolute -top-2 left-8 h-4 w-4 rotate-45 bg-white" />
                  <p className="text-[0.7rem] font-bold tracking-[0.15em] text-[#b0475a]">월화</p>
                  <p className="mt-1 whitespace-pre-line text-[1.08rem] font-semibold leading-[1.65]">“{fill(cur.question).replace(/\n/g, " ")}”</p>
                  {cur.sub && <p className="mt-1.5 whitespace-pre-line text-[0.78rem] leading-[1.7] text-[#7a6a6c]">{fill(cur.sub)}</p>}
                </div>
                <div className="mt-4 rounded-[22px] bg-[#1a1214] p-4">
                  <StepInput
                    step={cur}
                    app={app}
                    setApp={setApp}
                    fill={fill}
                    onPicked={picked}
                    onUnknown={() => {
                      setApp((a) => cur.set(a, null));
                      if (idx < total - 1) setStep(idx + 1);
                    }}
                  />
                </div>
              </div>
              <div className="sticky bottom-0 border-t border-black/5 bg-[#f6efe6] px-5 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-3">
                {tried && !cur.valid(app) && (
                  <p className="mb-2 text-[0.76rem] text-[#c8324a]">
                    {cur.kind === "email" ? (isValidEmail(app.email) ? "필수 확인 두 가지를 눌러 주세요." : "이메일 주소를 확인해 주세요.") : "답을 남겨 주시면 다음으로 넘어가요."}
                  </p>
                )}
                <button type="button" onClick={next} className={btn}>
                  {idx >= total - 1 ? "다 들려줬어요" : "다음"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ⑥ 붉은 실 고르기 */}
      {phase === "ritual" && (
        <div className="v2-fade relative z-10 flex min-h-[100svh] flex-col justify-end px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
          <p className="font-display text-center text-[1.3rem] leading-[1.8] text-ivory drop-shadow">
            마지막이에요.<br />{name}님 마음에 가까운 실 하나를 골라 주세요.
          </p>
          <div className="mt-8 flex justify-center gap-5">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setKnot(i)}
                aria-label={`실 ${i + 1}`}
                className={`flex h-36 w-20 items-center justify-center rounded-2xl border transition-all ${knot === i ? "v2-glow -translate-y-3 border-[#ff5a72] bg-black/60" : "border-white/15 bg-black/40"}`}
              >
                <svg viewBox="0 0 40 120" className="h-28 w-10">
                  <path d={i === 0 ? "M20 0 C5 30 35 45 20 60 C5 75 35 95 20 120" : i === 1 ? "M20 0 C35 25 5 40 20 60 C35 80 5 100 20 120" : "M20 0 C10 20 30 35 20 50 C8 62 32 72 20 84 C12 96 28 108 20 120"} fill="none" stroke="#d2384f" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="20" cy="60" r="5" fill="#d2384f" />
                </svg>
              </button>
            ))}
          </div>
          <button type="button" disabled={knot === null} onClick={() => setPhase("load")} className={`${btn} mt-8 disabled:opacity-40`}>
            이 실로 이야기 맡기기
          </button>
        </div>
      )}

      {/* ⑦ 읽는 중 */}
      {phase === "load" && (
        <div className="v2-fade relative z-10 flex min-h-[100svh] flex-col items-center justify-end px-8 pb-[calc(env(safe-area-inset-bottom)+4rem)] text-center">
          <p className="font-display text-[1.2rem] leading-[1.8] text-ivory">
            {name}님과 {partner}님의 이야기를<br />월화가 읽고 있어요
          </p>
          <div className="mt-6 h-1.5 w-full max-w-[280px] overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-[#d2384f]" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-[0.8rem] tabular-nums text-ivory/70">{pct}%</p>
        </div>
      )}

      {/* ⑧ 두 이름 카드 */}
      {phase === "card" && (
        <div className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
          <p className="v2-fade text-[0.8rem] tracking-[0.3em] text-gold/90">月下緣 · 두 사람의 이야기</p>
          <p className="v2-stop font-display mt-6 text-[2.6rem] font-bold leading-tight text-ivory drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)]">
            {name}
            <span className="mx-2 text-[#d2384f]">—</span>
            {partner}
          </p>
          <p className="v2-fade mt-6 text-[0.95rem] text-ivory/80" style={{ animationDelay: ".6s" }}>두 사람의 이야기, 월화가 다 들었어요.</p>
        </div>
      )}
    </div>
  );
}

/* 청월당식 둥근 말풍선 — 달빛 흰 원 + 가는 붉은 실 테두리 */
function Bubble({ text, className = "" }: { text: React.ReactNode; className?: string }) {
  return (
    <div className={`absolute z-20 ${className}`}>
      <div className="v2-pop flex h-[118px] w-[118px] items-center justify-center rounded-full bg-white/95 text-center text-[0.88rem] font-medium leading-[1.5] text-[#3a2a2c] shadow-[0_0_0_3px_rgba(255,255,255,0.6),0_0_0_4px_rgba(200,50,74,0.45),0_0_28px_8px_rgba(255,255,255,0.75)]">
        <p>{text}</p>
      </div>
    </div>
  );
}
