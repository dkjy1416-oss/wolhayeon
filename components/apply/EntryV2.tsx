"use client";

/**
 * 11/27 운영자 요청: 재회 분석 새 진입 프로토타입 (/apply/v2, noindex).
 * 청월당 신년운세 진입 구조를 월하연 재회 분석에 옮김 — 화이트보드 "재회 분석 새 진입 구조".
 *   ①표지 → ②대화창에 보내고 싶은 한 줄 → ③전송 순간 월화 "잠깐." → ④월화 소개
 *   → ⑤월화가 한 질문씩 (질문·저장 필드는 /apply 와 같은 STEPS 그대로)
 *   → ⑥붉은 실 고르기 → ⑦읽는 중 → ⑧두 이름 카드 → 기존 /apply/confirm → 기존 미리보기
 * 새 이미지 없이 기존 이미지만 사용. 지금 /apply 흐름은 건드리지 않음.
 */
import BrandLogo from "@/components/BrandLogo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EMPTY_APPLICATION, isValidEmail, type RitualApplication } from "@/lib/ritual-types";
import { loadApplication, saveApplication } from "@/lib/ritual-storage";
import RollingCount from "@/components/home3/RollingCount";
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

/* 배경 그림 → 같은 장면 루프 영상 */
const LOOP: Record<string, string> = {
  [IMG.wait]: "/wolhwa/v4/wait.mp4",
  [IMG.thread]: "/book/v3/w-thread.mp4",
  [IMG.reading]: "/book/v3/w-reading.mp4",
  [IMG.night]: "/book/v3/night.mp4",
  [IMG.typing]: "/book/v3/typing.mp4",
};

/* 11/27 운영자 요청: 질문마다 월화 루프 영상 (wolhwa/v3 — 말하는 월화) */
const V3 = (n: string) => ({ src: `/wolhwa/v3/${n}.mp4`, poster: `/wolhwa/v3/${n}.webp` });
const MEET_FACE = V3("greet");

/* 11/27 운영자 요청: 청월당처럼 한 화면에 문장형 선택칸 1~3개 ("지금은 [연애 상황 ▾] 이에요.")
   질문·저장 필드는 /apply 와 같은 STEPS 그대로, 화면 묶음과 문장만 프로토타입용 */
const STEP_BY_ID: Record<string, StepDef> = Object.fromEntries(STEPS.map((x) => [x.id, x]));
const W = (n: string) => ({ src: `/book/v3/w-${n}.mp4`, poster: `/book/v3/w-${n}.webp` });
type Group = { key: string; ids: string[]; q: string; face: { src: string; poster: string } };
const GROUPS: Group[] = [
  { key: "g_name", ids: ["applicant_name"], q: "저는 월화예요.\n당신을 뭐라고 불러드릴까요?", face: V3("greet") },
  { key: "g_partner", ids: ["partner_name"], q: "{name}님, 그 사람은\n어떻게 불러드릴까요?", face: V3("listen") },
  { key: "g_relation", ids: ["relationship_type", "relationship_duration"], q: "{partner}님과는\n어떤 사이였나요?", face: V3("explain") },
  { key: "g_now", ids: ["breakup_elapsed", "contact_status", "breakup_initiator"], q: "지금 두 사람은\n어디쯤 와 있나요?", face: W("phone2") },
  { key: "g_heart", ids: ["last_conversation", "current_emotion"], q: "마지막 대화와\n지금 마음을 알려 주세요.", face: V3("smile") },
  { key: "g_pain", ids: ["pain_points"], q: "요즘 가장 마음을\n힘들게 하는 건 뭔가요?", face: W("mirror") },
  { key: "g_wish", ids: ["main_wish"], q: "월화에게\n가장 알고 싶은 건 뭔가요?", face: V3("offer") },
  { key: "g_story", ids: ["story"], q: "두 사람의 이야기를\n편하게 들려주세요.", face: V3("write") },
  { key: "g_more", ids: ["last_conversation_memory"], q: "월화에게\n더 하고 싶은 말이 있나요?", face: W("reading") },
  { key: "g_new", ids: ["partner_new_relationship"], q: "그 사람 곁에\n새로운 사람이 있나요?", face: V3("listen") },
  { key: "g_safety", ids: ["safety_concerns"], q: "혹시 두 사람 사이에\n이런 일이 있었나요?", face: V3("explain") },
  { key: "g_me", ids: ["applicant_birth_year", "applicant_gender", "life_stage"], q: "{name}님에 대해\n조금만 더 알려 주세요.", face: W("final") },
  { key: "g_pyear", ids: ["partner_birth_year"], q: "{partner}님은\n몇 년생인가요?", face: V3("smile") },
  { key: "g_email", ids: ["email"], q: "마지막이에요.\n결과를 받을 이메일을 남겨 주세요.", face: V3("greet") },
];
/* 문장형 선택칸: [앞말, 뒷말] */
const SENT: Record<string, [string, string]> = {
  relationship_type: ["두 사람은", "사이였어요."],
  relationship_duration: ["함께한 시간은", "이에요."],
  breakup_elapsed: ["멀어진 지", "됐어요."],
  contact_status: ["지금 연락은", ""],
  breakup_initiator: ["먼저 멀어지자고 한 건", ""],
  last_conversation: ["마지막 대화는", ""],
  current_emotion: ["떠올리면 먼저", ""],
  main_wish: ["가장 알고 싶은 건", ""],
  partner_new_relationship: ["그 사람 곁의 새 사람은", ""],
  applicant_gender: ["저는", "이에요."],
  life_stage: ["요즘 저는", ""],
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

export default function EntryV2({ visitors = 0 }: { visitors?: number }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("cover");
  const [app, setApp] = useState<RitualApplication>({ ...EMPTY_APPLICATION });
  const [loaded, setLoaded] = useState(false);
  const [line, setLine] = useState("");
  const [meetIdx, setMeetIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);
  const [reactText, setReactText] = useState("");
  const [, setKnot] = useState<number | null>(null);
  const [pct, setPct] = useState(0);
  const [shake, setShake] = useState(false);
  const [beat, setBeat] = useState(0);
  const [sent, setSent] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setApp(loadApplication());
    /* 11/27 운영자 요청: 입력칸은 항상 비워서 시작 (전에 쓴 한 줄을 미리 채우지 않음) */
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) saveApplication(app);
  }, [app, loaded]);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const groups = useMemo(
    () =>
      GROUPS.map((g) => ({ ...g, steps: g.ids.map((id) => STEP_BY_ID[id]).filter((x) => x && (!x.visible || x.visible(app))) })).filter(
        (g) => g.steps.length > 0
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app.relationship_type]
  );
  const total = groups.length;
  const idx = Math.min(step, total - 1);
  const curG = groups[idx];
  const cur = curG?.steps[0];
  const curValid = !!curG && curG.steps.every((x) => x.valid(app));
  const curOptional = !!curG && curG.steps.every((x) => x.optional);
  const hasEmail = !!curG && curG.steps.some((x) => x.kind === "email");

  const name = app.applicant_name.trim() || "당신";
  const partner = app.partner_name.trim() || "그 사람";
  const fill = useCallback(
    (t: string) => t.replaceAll("{name}", name).replaceAll("{partner}", partner),
    [name, partner]
  );

  /* ④ 월화 소개 대사 */
  const MEET = [
    "방금 보내려던 분, 맞죠?",
    "저는 월화예요.\n보내기 전에 마음을 먼저 듣는 사람이에요.",
    "그 한 줄, 보내도 될지\n두 사람 이야기부터 같이 볼까요?",
  ];

  /* 11/27 운영자 요청: 청월당처럼 월화의 말이 한 글자씩 타이핑되듯 나타남 (눌러서 건너뛰기) */
  const typedSource =
    phase === "meet" ? MEET[meetIdx] : phase === "react" ? reactText : phase === "q" && curG ? fill(curG.q) : "";
  const [typedN, setTypedN] = useState(0);
  useEffect(() => {
    setTypedN(0);
    if (!typedSource) return;
    const iv = window.setInterval(() => {
      setTypedN((x) => {
        if (x >= typedSource.length) {
          window.clearInterval(iv);
          return x;
        }
        return x + 1;
      });
    }, 45);
    return () => window.clearInterval(iv);
  }, [typedSource]);
  const typed = typedSource.slice(0, typedN);
  const typedDone = typedN >= typedSource.length;

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


  const next = () => {
    if (!curG) return;
    if (!curValid) {
      setTried(true);
      return;
    }
    advance();
  };
  /* 검사 없이 다음으로 (하나 고르면 자동으로 넘어가는 질문용) */
  const advance = () => {
    if (!curG) return;
    setTried(false);
    const r = REACT[curG.steps[curG.steps.length - 1].id] ?? REACT[curG.steps[0].id];
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
      timer.current = window.setTimeout(go, 1200 + r.length * 45);
    } else go();
  };
  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  const back = () => {
    if (idx > 0) setStep(idx - 1);
    else setPhase("cover");
  };
  const picked = (v: string) => {
    if (!curG || curG.steps.length !== 1 || !cur || !autoAdvances(cur, v)) return;
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
            : phase === "load" || phase === "card"
                ? IMG.reading
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
        .v2-caret{display:inline-block;margin-left:1px;animation:v2c .8s steps(1) infinite;color:#ffb3c0}
        @keyframes v2c{50%{opacity:0}}
        .v2-dark-input input[type=text],.v2-dark-input input[type=email],.v2-dark-input input:not([type]){background:transparent!important;border:0!important;border-bottom:1px solid rgba(255,255,255,.35)!important;border-radius:0!important;padding-left:2px!important}
        .v2-compact .flex-col{display:grid!important;grid-template-columns:1fr 1fr;gap:8px!important}
        .v2-compact button{min-height:40px!important;padding:8px 12px!important;font-size:.8rem!important;border-radius:9999px!important;text-align:center!important}.v2-compact button:not([aria-pressed=true]){background:rgba(255,255,255,.08)!important}.v2-compact button[aria-pressed=true]{background:rgba(210,56,79,.45)!important;border-color:#ff8fa3!important;color:#fff!important}
        .v2-sway{animation:v2sw 3.6s ease-in-out infinite}
        @keyframes v2sw{0%,100%{transform:rotate(-2.2deg)}50%{transform:rotate(2.2deg)}}
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
      {/* 11/27 운영자 요청: 뒤 배경은 그림 대신 움직이는 루프 영상 (영상이 있는 장면만, 없으면 그림) */}
      {bg && (LOOP[bg] ? (
        <video key={bg} src={LOOP[bg]} poster={bg} autoPlay muted loop playsInline className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[50%_25%]" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={bg} src={bg} alt="" className="v2-zoom pointer-events-none absolute inset-0 h-full w-full object-cover object-[50%_25%]" />
      ))}
      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-black/55 via-black/10 to-black/85" />

      {phase !== "chat" && (<>
      <BrandLogo className="absolute left-5 top-[calc(env(safe-area-inset-top)+1rem)] z-30 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]" size={22} />
      <span className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-30 rounded-full bg-black/50 px-2.5 py-1 text-[0.62rem] text-ivory/70">프로토타입</span>
      </>)}

      {/* ① 표지 */}
      {phase === "cover" && (
        <div className="v2-fade relative z-10 flex min-h-[100svh] flex-col justify-end px-5 pb-[calc(env(safe-area-inset-bottom)+0.9rem)]">
          {/* 11/27 운영자 요청: 청월당처럼 로고·말풍선·버튼을 화면 맨 아래로 붙임 */}
          {/* 11/27 운영자 요청: 홈 배너와 같은 '월화의 관계 리추얼 · 재회 분석' 로고 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wolhwa/v5/logo_ritual.webp" alt="월화의 관계 리추얼 재회 분석" className="v2-fade mx-auto w-[86%] max-w-[380px] drop-shadow-[0_4px_18px_rgba(0,0,0,0.85)]" />
          {/* 11/27 운영자 요청: 설명 문구 대신 메인과 같은 누적 고객 말풍선 (100명 미만이거나 못 읽으면 숨김) */}
          {visitors >= 100 && (
            <div className="mt-1 flex justify-center">
              <p className="relative rounded-full border border-[#e46b8a]/40 bg-[#1d181b]/90 px-4 py-2 text-[0.84rem] font-semibold text-ivory">
                누적 고객 <b className="mx-0.5 text-[1.15rem] text-[#ff8fab] [text-shadow:0_0_14px_rgba(255,143,171,0.55)]"><RollingCount value={visitors} /></b>명이 월화를 찾았어요
                <span aria-hidden className="absolute -bottom-[6px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-[#e46b8a]/40 bg-[#1d181b]" />
              </p>
            </div>
          )}
          <button type="button" onClick={() => setPhase("toon")} className={`${btn} mt-4`}>
            내 이야기 시작하기
          </button>
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
          {/* 11/27: 컷마다 움직이는 루프 영상 (기존 book/v3 클립, 소리 없음) */}
          {/* 컷 1·2 — 청월당처럼 위아래 두 컷, 비스듬한 프레임, 말풍선은 얼굴을 피해 모서리에 */}
          <div className={`absolute inset-0 transition-all duration-500 ${beat >= 5 ? "-translate-y-full opacity-0" : ""}`}>
            <div
              className={`absolute left-[3%] top-[6%] h-[43%] w-[94%] ${beat >= 0 ? "v2-in-left" : "opacity-0"}`}
              style={{ clipPath: "polygon(0 3%, 100% 0, 98% 100%, 2% 95%)", transform: "rotate(-1.5deg)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <video src="/book/v3/fight2.mp4" poster={IMG.fight} autoPlay muted loop playsInline className="h-full w-full object-cover object-[50%_18%]" />
            </div>
            {beat >= 1 && <Bubble className="left-[1%] top-[33%]" text={<>그만하자,<br /><b className="text-[#9b1d32]">우리.</b></>} />}
            <div
              className={`absolute left-[3%] top-[50.5%] h-[43%] w-[94%] ${beat >= 2 ? "v2-in-right" : "opacity-0"}`}
              style={{ clipPath: "polygon(2% 5%, 100% 0, 100% 97%, 0 100%)", transform: "rotate(1deg)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <video src="/book/v3/cry.mp4" poster={IMG.street} autoPlay muted loop playsInline className="h-full w-full object-cover object-[60%_14%]" />
            </div>
            {beat >= 3 && <Bubble className="right-[1%] top-[77%]" text={<>…응.<br /><b className="text-[#9b1d32]">잘 지내.</b></>} />}
          </div>
          {/* 컷 3 — 혼자 남은 밤, 그 사람 생각 */}
          {beat >= 5 && (
            <div className="v2-fade absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <video src="/book/v3/alone.mp4" poster={IMG.alone} autoPlay muted loop playsInline className="h-full w-full object-cover object-[50%_35%]" />
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
            <p className="mx-auto mt-2 w-fit rounded-full bg-black/15 px-3 py-1 text-[0.72rem] text-white">{todayLabel()}</p>
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
          {/* 11/27 운영자 요청: 누적 고객 말풍선과 같은 모양으로 '하고 싶은 말 적어보기' 안내 */}
          <div className="flex justify-center pb-3">
            <p className="relative rounded-full border border-white/80 bg-white/70 px-4 py-2 text-center text-[0.84rem] font-semibold text-[#2b3a47] shadow-[0_4px_14px_rgba(60,80,100,0.15)] backdrop-blur-sm">
              그 사람에게 <b className="text-[#d0456a]">하고 싶은 말</b>, 여기에 적어 보세요
              <span className="block text-[0.64rem] font-normal text-[#6a7a88]">실제로 보내지지 않아요</span>
              <span aria-hidden className="absolute -bottom-[6px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-white/80 bg-white/70" />
            </p>
          </div>
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
              placeholder="메시지 입력"
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
          <p className="v2-stop font-display font-bold text-ivory drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)]" style={{ fontSize: "3.2rem", lineHeight: 1.1 }}>잠깐.</p>
          {/* 월화 말풍선 (④ 소개 장면과 같은 크림색 말풍선) */}
          <div className="v2-fade relative mt-5 rounded-[26px] bg-[#fbf6ee] px-6 py-4 text-[#2a1d1f] shadow-xl" style={{ animationDelay: ".5s" }}>
            <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-[#fbf6ee]" />
            <p className="text-[0.7rem] font-bold tracking-[0.15em] text-[#b0475a]">월화</p>
            <p className="mt-1 text-[0.82rem] text-[#7a6a6c]">“{line}”</p>
            <p className="mt-1.5 text-[1.02rem] font-semibold leading-[1.6]">그 한 줄, 보내기 전에<br />조금만 같이 볼까요?</p>
          </div>
          <span className="mt-6 text-[0.75rem] text-ivory/55">눌러서 계속</span>
        </button>
      )}

      {/* 이동: 붉은 실을 따라 */}
      {phase === "travel" && (
        <button type="button" onClick={() => { setStep(0); setPhase("q"); }} className="relative z-10 flex min-h-[100svh] w-full flex-col items-center justify-center px-8 text-center">
          <p className="v2-fade font-display text-[1.35rem] leading-[1.9] text-ivory drop-shadow">
            보내지 못한 한 줄이<br />붉은 실을 따라 흘러가요.
          </p>
          <p className="v2-fade mt-6 text-[0.95rem] text-ivory/75" style={{ animationDelay: ".8s" }}>…여기가 어디지?</p>
          <span className="mt-10 text-[0.75rem] text-ivory/55">눌러서 계속</span>
        </button>
      )}

      {/* ④ 월화 등장 — 청월당 정보 입력 첫 화면 구성, 흰 블러 대신 검은 블러 */}
      {phase === "meet" && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end">
          <video key="meet" src={MEET_FACE.src} poster={MEET_FACE.poster} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover object-[50%_20%]" />
          <DarkVeil />
          <div className="relative px-6 pb-[calc(env(safe-area-inset-bottom)+1.2rem)]">
            <button type="button" onClick={() => setTypedN(typedSource.length)} className="block min-h-[96px] w-full text-center">
              <p className="font-display whitespace-pre-line text-[1.22rem] leading-[1.85] text-ivory drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                “{typed}
                {!typedDone && <span className="v2-caret">|</span>}
                {typedDone && "”"}
              </p>
            </button>
            <div className={`mt-6 transition-opacity duration-300 ${typedDone ? "opacity-100" : "pointer-events-none opacity-0"}`}>
              {meetIdx < MEET.length - 1 ? (
                <button type="button" onClick={() => setMeetIdx((i) => i + 1)} className={btn}>다음으로</button>
              ) : (
                <button type="button" onClick={() => { setStep(0); setPhase("q"); }} className={btn}>월화에게 이야기하기</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ⑤ 월화가 한 질문씩 — 전체 화면 월화 루프 + 아래 검은 블러, 질문은 타이핑, 입력칸은 그 아래 */}
      {(phase === "q" || phase === "react") && curG && (() => {
        const face = curG.face;
        return (
          <div className="absolute inset-0 z-10 flex flex-col">
            <video key={face.src} src={face.src} poster={face.poster} autoPlay muted loop playsInline className="v2-fade absolute inset-0 h-full w-full object-cover object-[50%_18%]" />
            <DarkVeil strong />
            <div className="relative flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+3.4rem)]">
              <button type="button" onClick={back} aria-label="이전" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white">←</button>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-[#d2384f] transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
              </div>
              {curOptional && idx < total - 1 && (
                <button type="button" onClick={() => setStep(idx + 1)} className="text-[0.78rem] text-white/85 underline">건너뛰기</button>
              )}
            </div>
            <div className="flex-1" />
            <div className="relative max-h-[64svh] overflow-y-auto px-6 pb-3">
              <button type="button" onClick={() => setTypedN(typedSource.length)} className="block w-full text-center">
                <p className="font-display whitespace-pre-line text-[1.18rem] leading-[1.85] text-ivory drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                  “{typed}
                  {!typedDone && <span className="v2-caret">|</span>}
                  {typedDone && "”"}
                </p>
              </button>
              {phase === "q" && (
                <div className={`transition-opacity duration-300 ${typedDone ? "opacity-100" : "pointer-events-none opacity-0"}`}>
                  {curG.steps.length === 1 && cur?.sub && <p className="mt-2 whitespace-pre-line text-center text-[0.76rem] leading-[1.7] text-ivory/60">{fill(cur.sub)}</p>}
                  {curOptional && <p className="mt-2 text-center text-[0.72rem] text-ivory/50">* 답하지 않아도 다음으로 넘어갈 수 있어요.</p>}
                  <div className="mt-5 space-y-3">
                    {curG.steps.map((st) =>
                      st.kind === "select" && SENT[st.id] ? (
                        <SentenceSelect key={st.id} step={st} app={app} setApp={setApp} sent={SENT[st.id]} />
                      ) : (
                        <div key={st.id} className={`v2-dark-input ${st.kind === "multi" ? "v2-compact" : ""}`}>
                          <StepInput
                            step={st}
                            app={app}
                            setApp={setApp}
                            fill={fill}
                            onPicked={picked}
                            onUnknown={() => {
                              setApp((a) => st.set(a, null));
                            }}
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
            {phase === "q" && (
              <div className={`relative px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2 transition-opacity duration-300 ${typedDone ? "opacity-100" : "pointer-events-none opacity-0"}`}>
                {tried && !curValid && (
                  <p className="mb-2 text-center text-[0.76rem] text-[#ff8fa3]">
                    {hasEmail ? (isValidEmail(app.email) ? "필수 확인 두 가지를 눌러 주세요." : "이메일 주소를 확인해 주세요.") : "답을 남겨 주시면 다음으로 넘어가요."}
                  </p>
                )}
                <button type="button" onClick={next} className={btn}>
                  {idx >= total - 1 ? "다 들려줬어요" : "다음으로"}
                </button>
              </div>
            )}
            {phase === "react" && <div className="h-[calc(env(safe-area-inset-bottom)+5rem)]" />}
          </div>
        );
      })()}

      {/* ⑥ 붉은 실 — 청월당 '제비 뽑기' 자리. 1) 실을 쥔 월화가 권함 → 2) 세 가닥 중 하나를 당김 */}
      {phase === "ritual" && (
        <ThreadPull
          name={name}
          onDone={(i) => {
            setKnot(i);
            setPhase("load");
          }}
        />
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

/* 11/27 운영자 요청: 카톡 날짜 줄은 오늘 날짜(한국 시간) — 예: 2026년 11월 27일 금요일 */
function todayLabel() {
  try {
    return new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "long" });
  } catch {
    return "";
  }
}

/* 청월당의 흰 블러를 월하연은 검은 블러로 — 위는 비우고 아래로 갈수록 어둡고 흐리게 */
function DarkVeil({ strong = false }: { strong?: boolean }) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] backdrop-blur-[6px]"
        style={{ WebkitMaskImage: "linear-gradient(to bottom, transparent, black 55%)", maskImage: "linear-gradient(to bottom, transparent, black 55%)" }}
      />
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent ${strong ? "to-black/95" : "to-black/90"}`} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black via-black/80 to-transparent" />
    </>
  );
}

/* 청월당식 문장형 선택칸 — "지금은 [연애 상황 ▾] 이에요." (값·저장은 기존 STEPS 의 set 그대로) */
function SentenceSelect({
  step,
  app,
  setApp,
  sent,
}: {
  step: StepDef;
  app: RitualApplication;
  setApp: React.Dispatch<React.SetStateAction<RitualApplication>>;
  sent: [string, string];
}) {
  const v = String(step.get(app) ?? "");
  return (
    <div>
      <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-[0.98rem] text-ivory/85">
        {sent[0] && <span>{sent[0]}</span>}
        <span className="relative">
          <select
            value={v}
            onChange={(e) => setApp((a) => step.set(a, e.target.value))}
            className={`h-11 appearance-none rounded-xl border border-white/15 bg-white/10 pl-4 pr-9 text-[0.95rem] backdrop-blur focus:outline-none ${v ? "text-ivory" : "text-ivory/45"}`}
          >
            <option value="" disabled>
              선택해 주세요
            </option>
            {step.options?.map((o) => (
              <option key={o.value} value={o.value} className="text-black">
                {o.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.7rem] text-ivory/60">▼</span>
        </span>
        {sent[1] && <span>{sent[1]}</span>}
      </div>
      {step.id === "relationship_type" && v === "other" && (
        <input
          value={app.relationship_type_other}
          onChange={(e) => setApp((a) => ({ ...a, relationship_type_other: e.target.value }))}
          placeholder="어떤 사이였는지 짧게 적어 주세요"
          className="mx-auto mt-3 block h-11 w-full max-w-[320px] border-0 border-b border-white/35 bg-transparent px-1 text-center text-base text-ivory placeholder:text-ivory/40 focus:outline-none"
        />
      )}
    </div>
  );
}

/* ───────── 붉은 실 당기기 (프로토타입: 지금 있는 그림 + 코드로 그린 실) ─────────
   1단계: 실을 쥔 월화(v4/thread) + 타이핑 대사 + "붉은 실 당기러 가기"
   2단계: 어두운 배경(w-thread 루프, 흐리게) 위에 위에서 늘어진 세 가닥 실.
          가운데는 앞, 양옆은 뒤(작고 흐리게)라 입체감. 각자 다른 박자로 흔들림.
          실을 아래로 끌면(또는 누르면) 늘어나며 빛나고, 충분히 당기면 선택 → 나머지는 사라짐 */
function ThreadPull({ name, onDone }: { name: string; onDone: (i: number) => void }) {
  const [stage, setStage] = useState<0 | 1>(0);
  const [pull, setPull] = useState<number[]>([0, 0, 0]);
  const [chosen, setChosen] = useState<number | null>(null);
  const drag = useRef<{ i: number; y0: number } | null>(null);
  const line0 = `${name}님, 이제 마지막이에요.`;
  const line1 = "세 가닥 실 중에\n마음이 가는 하나만 당겨 주시겠어요?";
  const [n, setN] = useState(0);
  const text = stage === 0 ? `${line0}\n${line1}` : "마음이 가는 실을\n아래로 천천히 당겨 주세요.";
  useEffect(() => {
    setN(0);
    const iv = window.setInterval(() => setN((x) => (x >= text.length ? (window.clearInterval(iv), x) : x + 1)), 45);
    return () => window.clearInterval(iv);
  }, [text]);
  const done = n >= text.length;

  const choose = (i: number) => {
    if (chosen !== null) return;
    setChosen(i);
    setPull((p) => p.map((v, k) => (k === i ? 230 : v)));
    window.setTimeout(() => onDone(i), 1300);
  };
  const onDown = (i: number) => (e: React.PointerEvent) => {
    if (chosen !== null) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { i, y0: e.clientY };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dy = Math.max(0, Math.min(200, e.clientY - d.y0));
    setPull((p) => p.map((v, k) => (k === d.i ? dy : v)));
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (pull[d.i] > 70 || pull[d.i] < 6) choose(d.i); /* 충분히 당겼거나, 그냥 눌렀으면 선택 */
    else setPull((p) => p.map((v, k) => (k === d.i ? 0 : v)));
  };

  if (stage === 0)
    return (
      <div className="absolute inset-0 z-10 flex flex-col justify-end">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/wolhwa/v4/thread.webp" alt="" className="v2-zoom absolute inset-0 h-full w-full object-cover object-[50%_20%]" />
        <DarkVeil />
        <div className="relative px-6 pb-[calc(env(safe-area-inset-bottom)+1.2rem)]">
          <p className="font-display min-h-[90px] whitespace-pre-line text-center text-[1.15rem] leading-[1.85] text-ivory drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            “{text.slice(0, n)}
            {!done && <span className="v2-caret">|</span>}
            {done && "”"}
          </p>
          <button
            type="button"
            onClick={() => setStage(1)}
            className={`mt-5 inline-flex h-[56px] w-full items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-[#6a1b26] to-[#341015] text-[0.98rem] font-semibold text-ivory transition-opacity ${done ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            붉은 실 당기러 가기
          </button>
        </div>
      </div>
    );

  const X = [28, 50, 72]; /* % 위치 */
  const DEPTH = [0.86, 1, 0.86]; /* 가운데 앞, 양옆 뒤 */
  return (
    <div className="absolute inset-0 z-10 overflow-hidden bg-black" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={{ touchAction: "none" }}>
      <video src="/book/v3/w-thread.mp4" poster="/book/v3/w-thread.webp" autoPlay muted loop playsInline className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-[3px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/30 to-black/90" />
      <div className="v2-dust pointer-events-none absolute inset-0" aria-hidden>
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} style={{ left: `${(i * 41) % 100}%`, animationDelay: `${(i % 6) * 0.7}s`, animationDuration: `${6 + (i % 4)}s` }} />
        ))}
      </div>
      <p className="font-display absolute inset-x-0 top-[calc(env(safe-area-inset-top)+4.2rem)] z-20 whitespace-pre-line px-6 text-center text-[1.12rem] leading-[1.8] text-ivory drop-shadow">
        “{text.slice(0, n)}
        {!done && <span className="v2-caret">|</span>}
        {done && "”"}
      </p>
      {/* 실을 쥔 손 자리 — 지금은 빛나는 매듭으로 대신 (새 그림: 위에서 실 세 가닥을 쥔 월화의 손) */}
      <div className="absolute left-1/2 top-[22%] z-10 h-6 w-40 -translate-x-1/2 rounded-full bg-[#d2384f]/30 blur-xl" />
      <div className="absolute inset-0" style={{ perspective: "700px" }}>
        {X.map((x, i) => {
          const L = 300 + pull[i];
          const gone = chosen !== null && chosen !== i;
          const on = chosen === i;
          return (
            <div
              key={i}
              className={`absolute top-[24%] transition-[opacity,filter] duration-700 ${gone ? "opacity-0" : "opacity-100"}`}
              style={{
                left: `${x}%`,
                transform: `translateX(-50%) scale(${DEPTH[i]})`,
                transformOrigin: "top center",
                filter: DEPTH[i] < 1 ? "blur(0.6px) brightness(.85)" : undefined,
                zIndex: DEPTH[i] === 1 ? 3 : 2,
              }}
            >
              <div
                className={on || drag.current?.i === i ? "" : "v2-sway"}
                style={{ transformOrigin: "top center", animationDuration: `${3.2 + i * 0.7}s`, animationDelay: `${i * -1.1}s` }}
              >
                <svg
                  width="70"
                  height={L + 70}
                  viewBox={`0 0 70 ${L + 70}`}
                  onPointerDown={onDown(i)}
                  className="cursor-grab touch-none overflow-visible"
                  style={{ filter: on ? "drop-shadow(0 0 10px #ff4d6a) drop-shadow(0 0 22px #ff4d6a)" : "drop-shadow(0 0 4px rgba(210,56,79,.6))" }}
                >
                  {/* 실 */}
                  <path d={`M35 0 C ${30 - pull[i] / 20} ${L * 0.35}, ${40 + pull[i] / 20} ${L * 0.7}, 35 ${L}`} stroke="#d2384f" strokeWidth={on ? 3.2 : 2.4} fill="none" strokeLinecap="round" />
                  <path d={`M36 0 C ${31 - pull[i] / 20} ${L * 0.35}, ${41 + pull[i] / 20} ${L * 0.7}, 36 ${L}`} stroke="#ff8a9b" strokeWidth="0.8" fill="none" opacity=".6" />
                  {/* 매듭 + 술 */}
                  <circle cx="35" cy={L + 6} r="8" fill="#b51f38" stroke="#ffb1bd" strokeWidth="1" />
                  <path d={`M35 ${L + 12} l-7 40 M35 ${L + 12} l-2.5 42 M35 ${L + 12} l2.5 42 M35 ${L + 12} l7 40`} stroke="#d2384f" strokeWidth="1.6" strokeLinecap="round" />
                  {/* 손가락으로 잡기 쉬운 투명 영역 */}
                  <rect x="5" y="0" width="60" height={L + 60} fill="transparent" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
      {chosen !== null && (
        <p className="v2-fade font-display absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+2.5rem)] z-20 text-center text-[1rem] text-ivory/85">이 실로 이야기를 맡길게요.</p>
      )}
    </div>
  );
}
