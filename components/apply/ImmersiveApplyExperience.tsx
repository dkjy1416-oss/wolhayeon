"use client";

/**
 * 몰입형 신청 경험 — "월화가 한 질문씩 조용히 듣는" 대화형 플로우.
 *
 * 구조 (§10): ImmersiveApplyExperience
 *   ├─ PersistentVideoBackground  ← video element는 여기 "한 번만" mount.
 *   │    step/phase가 바뀌어도 remount·src reload 없음 (CSS filter만 전환)
 *   └─ QuestionOverlay(현재 step 내용만 교체)
 *
 * 데이터 (§34~35): UI step(currentStep)과 실제 답변(RitualApplication)을 분리.
 *   답변은 기존 saveApplication(sessionStorage)에 기존 필드명 그대로 저장 —
 *   confirm/주문 payload는 Production과 100% 동일. DB field/enum 변경 없음.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  RitualApplication,
  EMPTY_APPLICATION,
  APPLICANT_GENDER_OPTIONS,
  PARTNER_GENDER_OPTIONS,
  LIFE_STAGE_OPTIONS,
  RELATIONSHIP_TYPE_OPTIONS,
  RELATIONSHIP_DURATION_OPTIONS,
  BREAKUP_ELAPSED_OPTIONS,
  BREAKUP_INITIATOR_OPTIONS,
  LAST_CONVERSATION_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  PARTNER_NEW_RELATIONSHIP_OPTIONS,
  PAIN_POINT_OPTIONS,
  PAIN_POINTS_MAX,
  MAIN_WISH_OPTIONS,
  CURRENT_EMOTION_OPTIONS,
  SAFETY_CONCERN_OPTIONS,
  SAFETY_EXCLUSIVE_VALUES,
  SAFETY_OTHER_VALUE,
  SAFETY_OTHER_MAX,
  STORY_MAX,
  STORY_RECOMMENDED_MIN,
  LAST_MEMORY_MAX,
  WISH_SENTENCE_MAX,
  DESIRED_CHANGE_MAX,
  isBreakupRelated,
  isRealisticBirthYear,
  isValidEmail,
  type Option,
} from "@/lib/ritual-types";
import { loadApplication, saveApplication } from "@/lib/ritual-storage";

/* ---------------- 인트로 카피 (§7) ---------------- */
const INTRO_MESSAGES = [
  "당신의 이야기를 들려주세요.",
  "몇 가지 질문을 통해\n두 사람 사이에 남아 있는 이야기를\n천천히 들어볼게요.",
  "잘 정리해서 말하지 않아도 괜찮아요.",
  "지금 떠오르는 그대로\n월화에게 들려주세요.",
  "약 5~7분 정도면 충분해요.",
  "준비되셨다면,\n이제 이야기를 시작해볼까요?",
];
const INTRO_STEP_MS = 2000;

const STEP_KEY = "wolhayeon_immersive_step_v1";

type Phase = "intro" | "questions" | "outro";

/* ---------------- step 정의 (한 화면 = 한 질문) ---------------- */

type StepKind =
  | "text"
  | "year"
  | "select"
  | "multi"
  | "textarea"
  | "email"
  | "consent";

interface StepDef {
  id: string;
  kind: StepKind;
  /** {name} / {partner} 치환 */
  question: string;
  sub?: string;
  placeholder?: string;
  options?: Option[];
  optional?: boolean;
  maxLen?: number;
  /** 조건부 표시 */
  visible?: (a: RitualApplication) => boolean;
  /** 통과 조건 (기존 위저드 규칙과 동일) */
  valid: (a: RitualApplication) => boolean;
  get: (a: RitualApplication) => unknown;
  set: (a: RitualApplication, v: unknown) => RitualApplication;
}

const STEPS: StepDef[] = [
  {
    id: "applicant_name",
    kind: "text",
    question: "어떻게 불러드리면 될까요?",
    sub: "월화가 이야기를 들을 때\n당신을 부를 이름이에요.",
    placeholder: "이름 또는 불리고 싶은 이름",
    valid: (a) => a.applicant_name.trim().length > 0,
    get: (a) => a.applicant_name,
    set: (a, v) => ({ ...a, applicant_name: String(v) }),
  },
  {
    id: "applicant_birth_year",
    kind: "year",
    question: "{name}님은 몇 년생인가요?",
    sub: "두 사람의 시기와 흐름을 이해하는 데 참고할게요.",
    placeholder: "예: 1994",
    valid: (a) =>
      a.applicant_birth_year !== null &&
      isRealisticBirthYear(a.applicant_birth_year),
    get: (a) => a.applicant_birth_year,
    set: (a, v) => ({
      ...a,
      applicant_birth_year: v === null ? null : Number(v),
    }),
  },
  {
    id: "applicant_gender",
    kind: "select",
    question: "{name}님을 조금 더\n정확하게 이해하고 싶어요.",
    sub: "당신에 대해 알려주세요.",
    options: APPLICANT_GENDER_OPTIONS,
    valid: (a) => a.applicant_gender !== "",
    get: (a) => a.applicant_gender,
    set: (a, v) => ({ ...a, applicant_gender: String(v) }),
  },
  {
    id: "life_stage",
    kind: "select",
    question: "요즘 {name}님의 일상은 어떤가요?",
    sub: "지금 놓여 있는 환경도\n관계를 바라보는 마음에 영향을 줄 수 있어요.",
    options: LIFE_STAGE_OPTIONS,
    valid: (a) => a.life_stage !== "",
    get: (a) => a.life_stage,
    set: (a, v) => ({ ...a, life_stage: String(v) }),
  },
  {
    id: "partner_name",
    kind: "text",
    question: "그 사람은 어떻게 불러드리면 될까요?",
    sub: "실명이어도 괜찮고,\n월화에게만 알려줄 이름이어도 괜찮아요.",
    placeholder: "그 사람의 이름",
    valid: (a) => a.partner_name.trim().length > 0,
    get: (a) => a.partner_name,
    set: (a, v) => ({ ...a, partner_name: String(v) }),
  },
  {
    id: "partner_birth_year",
    kind: "year",
    question: "{partner}님은 몇 년생인가요?",
    sub: "모르시면 비워두고 넘어가도 괜찮아요.",
    placeholder: "예: 1992 (모르면 비워두세요)",
    optional: true,
    valid: (a) =>
      a.partner_birth_year === null ||
      isRealisticBirthYear(a.partner_birth_year),
    get: (a) => a.partner_birth_year,
    set: (a, v) => ({
      ...a,
      partner_birth_year: v === null ? null : Number(v),
    }),
  },
  {
    id: "partner_gender",
    kind: "select",
    question: "{partner}님에 대해서도\n조금만 알려주세요.",
    options: PARTNER_GENDER_OPTIONS,
    optional: true,
    valid: () => true,
    get: (a) => a.partner_gender ?? "",
    set: (a, v) => ({ ...a, partner_gender: v ? String(v) : null }),
  },
  {
    id: "relationship_type",
    kind: "select",
    question: "두 사람은 어떤 관계였나요?",
    options: RELATIONSHIP_TYPE_OPTIONS,
    valid: (a) =>
      a.relationship_type !== "" &&
      (a.relationship_type !== "other" ||
        a.relationship_type_other.trim().length > 0),
    get: (a) => a.relationship_type,
    set: (a, v) => {
      const value = String(v);
      return {
        ...a,
        relationship_type: value,
        relationship_type_other:
          value === "other" ? a.relationship_type_other : "",
        breakup_elapsed: isBreakupRelated(value) ? a.breakup_elapsed : null,
        breakup_initiator: isBreakupRelated(value)
          ? a.breakup_initiator
          : null,
      };
    },
  },
  {
    id: "relationship_duration",
    kind: "select",
    question: "두 사람은 얼마나 함께했나요?",
    options: RELATIONSHIP_DURATION_OPTIONS,
    valid: (a) => a.relationship_duration !== "",
    get: (a) => a.relationship_duration,
    set: (a, v) => ({ ...a, relationship_duration: String(v) }),
  },
  {
    id: "breakup_elapsed",
    kind: "select",
    question: "두 사람이 멀어진 지\n얼마나 되었나요?",
    options: BREAKUP_ELAPSED_OPTIONS,
    visible: (a) => isBreakupRelated(a.relationship_type),
    valid: (a) => a.breakup_elapsed !== null && a.breakup_elapsed !== "",
    get: (a) => a.breakup_elapsed ?? "",
    set: (a, v) => ({ ...a, breakup_elapsed: String(v) }),
  },
  {
    id: "breakup_initiator",
    kind: "select",
    question: "멀어지자는 이야기는\n어느 쪽에서 먼저 나왔나요?",
    options: BREAKUP_INITIATOR_OPTIONS,
    visible: (a) => isBreakupRelated(a.relationship_type),
    valid: (a) => a.breakup_initiator !== null && a.breakup_initiator !== "",
    get: (a) => a.breakup_initiator ?? "",
    set: (a, v) => ({ ...a, breakup_initiator: String(v) }),
  },
  {
    id: "last_conversation",
    kind: "select",
    question: "마지막으로 이야기를 나눈 건\n언제였나요?",
    options: LAST_CONVERSATION_OPTIONS,
    valid: (a) => a.last_conversation !== "",
    get: (a) => a.last_conversation,
    set: (a, v) => ({ ...a, last_conversation: String(v) }),
  },
  {
    id: "contact_status",
    kind: "select",
    question: "지금 두 사람은\n연락을 하고 있나요?",
    options: CONTACT_STATUS_OPTIONS,
    valid: (a) => a.contact_status !== "",
    get: (a) => a.contact_status,
    set: (a, v) => ({ ...a, contact_status: String(v) }),
  },
  {
    id: "partner_new_relationship",
    kind: "select",
    question: "{partner}님 곁에\n새로운 사람이 있는지 알고 계신가요?",
    options: PARTNER_NEW_RELATIONSHIP_OPTIONS,
    valid: (a) => a.partner_new_relationship !== "",
    get: (a) => a.partner_new_relationship,
    set: (a, v) => ({ ...a, partner_new_relationship: String(v) }),
  },
  {
    id: "current_emotion",
    kind: "select",
    question: "{name}님,\n지금 그 사람을 떠올리면\n가장 먼저 어떤 마음이 올라오나요?",
    options: CURRENT_EMOTION_OPTIONS,
    valid: (a) => a.current_emotion !== "",
    get: (a) => a.current_emotion,
    set: (a, v) => ({ ...a, current_emotion: String(v) }),
  },
  {
    id: "pain_points",
    kind: "multi",
    question: "요즘 가장 마음을 힘들게 하는 건\n무엇인가요?",
    sub: `가장 가까운 것을 ${PAIN_POINTS_MAX}개까지 골라주세요.`,
    options: PAIN_POINT_OPTIONS,
    valid: (a) => a.pain_points.length > 0,
    get: (a) => a.pain_points,
    set: (a, v) => ({ ...a, pain_points: v as string[] }),
  },
  {
    id: "story",
    kind: "textarea",
    question: "두 사람의 이야기를\n편하게 들려주세요.",
    sub: "처음 만났을 때부터 지금까지,\n떠오르는 그대로 적어주시면 돼요.",
    placeholder: "생각나는 대로 편하게 적어주세요.",
    maxLen: STORY_MAX,
    valid: (a) => a.story.trim().length > 0,
    get: (a) => a.story,
    set: (a, v) => ({ ...a, story: String(v) }),
  },
  {
    id: "last_conversation_memory",
    kind: "textarea",
    question: "마지막 대화에서\n아직 마음에 남아 있는 말이 있나요?",
    sub: "짧게 적어도 괜찮아요.",
    placeholder: "예: 마지막에 미안하다는 말만 남기고…",
    maxLen: LAST_MEMORY_MAX,
    optional: true,
    valid: () => true,
    get: (a) => a.last_conversation_memory,
    set: (a, v) => ({ ...a, last_conversation_memory: String(v) }),
  },
  {
    id: "desired_change",
    kind: "textarea",
    question: "만약 다시 이어진다면,\n무엇이 가장 달라졌으면 하나요?",
    placeholder: "예: 예전처럼 싸우지 않았으면 좋겠어요.",
    maxLen: DESIRED_CHANGE_MAX,
    optional: true,
    valid: () => true,
    get: (a) => a.desired_change,
    set: (a, v) => ({ ...a, desired_change: String(v) }),
  },
  {
    id: "main_wish",
    kind: "select",
    question: "지금 월화에게\n가장 알고 싶은 건 무엇인가요?",
    options: MAIN_WISH_OPTIONS,
    valid: (a) => a.main_wish !== "",
    get: (a) => a.main_wish,
    set: (a, v) => ({ ...a, main_wish: String(v) }),
  },
  {
    id: "wish_sentence",
    kind: "textarea",
    question: "월화에게 마지막으로\n꼭 들려주고 싶은 말이 있나요?",
    sub: "없다면 그냥 넘어가도 괜찮아요.",
    placeholder: "월화에게 전하고 싶은 한마디",
    maxLen: WISH_SENTENCE_MAX,
    optional: true,
    valid: () => true,
    get: (a) => a.wish_sentence,
    set: (a, v) => ({ ...a, wish_sentence: String(v) }),
  },
  {
    id: "safety_concerns",
    kind: "multi",
    question: "혹시 두 사람 사이에\n이런 일이 있었나요?",
    sub: "{name}님의 마음을 안전하게 듣기 위한 질문이에요.\n해당되는 것이 없다면 '없음'을 골라주세요.",
    options: SAFETY_CONCERN_OPTIONS,
    valid: (a) => a.safety_concerns.length > 0,
    get: (a) => a.safety_concerns,
    set: (a, v) => ({ ...a, safety_concerns: v as string[] }),
  },
  {
    id: "email",
    kind: "email",
    question: "이야기의 결과는\n어디로 보내드리면 될까요?",
    sub: "월화의 편지와 전체 결과를 받아볼 이메일이에요.",
    placeholder: "이메일 주소",
    valid: (a) => isValidEmail(a.email),
    get: (a) => a.email,
    set: (a, v) => ({ ...a, email: String(v) }),
  },
  {
    id: "consent",
    kind: "consent",
    question: "마지막으로,\n이것만 확인해주세요.",
    valid: (a) => a.consent_processing && a.consent_no_guarantee,
    get: (a) => null,
    set: (a) => a,
  },
];

/* ---------------- 진행 라벨 (§28) ---------------- */
function progressLabel(ratio: number): string {
  if (ratio < 0.4) return "이야기를 듣는 중";
  if (ratio < 0.8) return "조금 더 들려주세요";
  return "거의 다 들었어요";
}

/* ---------------- 배경 (한 번만 mount — §10) ---------------- */
function PersistentVideoBackground({
  video,
  poster,
  phase,
}: {
  video: string | null;
  poster: string | null;
  phase: Phase;
}) {
  const filter =
    phase === "intro"
      ? "brightness(0.85)"
      : phase === "questions"
        ? "brightness(0.7) blur(1.75px)"
        : "brightness(0.66) blur(1.5px)";
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      {video ? (
        <video
          className="h-full w-full object-cover object-[50%_28%] transition-[filter] duration-700"
          style={{ filter }}
          src={video}
          poster={poster ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          className="h-full w-full object-cover object-[50%_28%]"
          style={{ filter }}
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-b from-[#131017] via-ink-soft to-ink" />
      )}
      {/* 상/하단 녹아들기 — 질문 단계에선 하단을 더 강하게 */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/85 via-ink/40 to-transparent" />
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink to-transparent transition-all duration-700 ${
          phase === "intro"
            ? "h-[55%] via-ink/75"
            : phase === "questions"
              ? "h-[52%] via-ink/55"
              : "h-[58%] via-ink/65"
        }`}
      />
    </div>
  );
}

/* ---------------- 메인 ---------------- */
export default function ImmersiveApplyExperience({
  video,
  poster,
}: {
  video: string | null;
  poster: string | null;
}) {
  const router = useRouter();
  const [app, setApp] = useState<RitualApplication>({ ...EMPTY_APPLICATION });
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [introIdx, setIntroIdx] = useState(0);
  const [anim, setAnim] = useState<"in" | "out">("in");
  const [tried, setTried] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  /* 복원 (§35) — 답변은 기존 storage, step은 별도 키 */
  useEffect(() => {
    const a = loadApplication();
    setApp(a);
    try {
      const saved = Number(sessionStorage.getItem(STEP_KEY));
      if (Number.isInteger(saved) && saved > 0) {
        setStep(saved);
        setPhase("questions");
      }
    } catch {
      /* noop */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveApplication(app);
  }, [app, loaded]);

  useEffect(() => {
    if (!loaded || phase !== "questions") return;
    try {
      sessionStorage.setItem(STEP_KEY, String(step));
    } catch {
      /* noop */
    }
  }, [step, phase, loaded]);

  /* 인트로 문장 자동 전개 (§8) — reduced motion이면 즉시 마지막 */
  useEffect(() => {
    if (phase !== "intro") return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setIntroIdx(INTRO_MESSAGES.length - 1);
      return;
    }
    if (introIdx >= INTRO_MESSAGES.length - 1) return;
    const t = setTimeout(() => setIntroIdx((i) => i + 1), INTRO_STEP_MS);
    return () => clearTimeout(t);
  }, [phase, introIdx]);

  /* 조건부 step 목록 (§18~19 — 이별 관련일 때만 q5 계열) */
  const visibleSteps = useMemo(
    () => STEPS.filter((s) => !s.visible || s.visible(app)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app.relationship_type]
  );
  const total = visibleSteps.length;
  const safeStep = Math.min(step, total - 1);
  const cur = visibleSteps[safeStep];

  const name = app.applicant_name.trim();
  const partner = app.partner_name.trim();
  const fill = useCallback(
    (t: string) =>
      t
        .replaceAll("{name}", name || "당신")
        .replaceAll("{partner}", partner || "그 사람"),
    [name, partner]
  );

  const goTo = useCallback((next: number | Phase) => {
    setAnim("out");
    setTimeout(() => {
      if (typeof next === "number") setStep(next);
      else setPhase(next);
      setTried(false);
      setAnim("in");
      panelRef.current?.scrollTo({ top: 0 });
    }, 220);
  }, []);

  const onNext = () => {
    if (!cur.valid(app)) {
      setTried(true);
      return;
    }
    if (safeStep >= total - 1) {
      /* §37 — 확인 화면 진입 transition */
      setAnim("out");
      setTimeout(() => {
        setPhase("outro");
        setAnim("in");
        setTimeout(() => router.push("/apply/confirm"), 950);
      }, 220);
      return;
    }
    goTo(safeStep + 1);
  };

  const onBack = () => {
    if (phase === "questions" && safeStep === 0) {
      goTo("intro");
      setStep(0);
      return;
    }
    if (safeStep > 0) goTo(safeStep - 1);
  };

  if (!loaded) {
    /* 복원 판정 전 셸 — 첫 페인트에도 인트로 첫 문장이 보이게 (복원 시 교체) */
    return (
      <div className="imm-viewport relative isolate overflow-x-hidden text-ivory">
        <PersistentVideoBackground video={video} poster={poster} phase="intro" />
        <div className="imm-viewport relative z-10 flex flex-col justify-end px-7 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
          <p className="text-xs tracking-[0.35em] text-gold/90">月下緣</p>
          <p className="font-display mt-5 text-[1.6rem] font-medium leading-[1.75] text-ivory">
            {INTRO_MESSAGES[0]}
          </p>
          <div className="mt-8 h-[60px]" aria-hidden />
        </div>
      </div>
    );
  }

  /* ============ 렌더 ============ */
  return (
    <div className="imm-viewport relative isolate overflow-x-hidden text-ivory">
      <PersistentVideoBackground video={video} poster={poster} phase={phase} />

      {/* ---------- INTRO (§6~8) ---------- */}
      {phase === "intro" && (
        <div className="imm-viewport relative z-10 flex flex-col justify-end px-7 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
          <p className="text-xs tracking-[0.35em] text-gold/90">月下緣</p>
          <div className="mt-5 min-h-[9.5rem]">
            <p
              key={introIdx}
              className="imm-msg font-display whitespace-pre-line text-[1.6rem] font-medium leading-[1.75] text-ivory"
            >
              {INTRO_MESSAGES[introIdx]}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStep(0);
              goTo("questions");
            }}
            className={`mt-8 inline-flex h-[60px] w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-[#5b1720] to-[#341015] text-[0.97rem] font-medium text-ivory transition-opacity duration-700 active:opacity-85 ${
              introIdx >= 2 ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            월화에게 이야기 시작하기
          </button>
        </div>
      )}

      {/* ---------- QUESTIONS (§9~33) ---------- */}
      {phase === "questions" && cur && (
        <div className="imm-viewport relative z-10 flex flex-col">
          {/* 상단: 뒤로 + 감성 progress (§28~29) */}
          <div className="flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
            <button
              type="button"
              onClick={onBack}
              aria-label="이전 질문으로"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-ivory/90"
            >
              ←
            </button>
            <div className="flex-1">
              <div className="h-px w-full bg-ivory/22">
                <div
                  className="h-px bg-gold/90 transition-all duration-500"
                  style={{ width: `${((safeStep + 1) / total) * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-[0.62rem] tracking-[0.2em] text-ivory/68">
                {progressLabel((safeStep + 1) / total)}
              </p>
            </div>
            <div className="w-11" aria-hidden />
          </div>

          <div className="flex-1" />

          {/* 하단 glass 패널 (§12) */}
          <div
            ref={panelRef}
            className="max-h-[58svh] overflow-y-auto rounded-t-[24px] border-t border-x border-gold/15 bg-[rgba(13,11,13,0.82)] px-6 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-5 backdrop-blur-sm"
          >
            <div key={cur.id} className={anim === "in" ? "imm-q-in" : "imm-q-out"}>
              <p className="font-display whitespace-pre-line text-[1.25rem] font-medium leading-[1.75] text-ivory">
                {fill(cur.question)}
              </p>
              {cur.sub && (
                <p className="mt-2 whitespace-pre-line text-[0.82rem] font-light leading-[1.8] text-ivory-dim">
                  {fill(cur.sub)}
                </p>
              )}

              <div className="mt-4">
                <StepInput
                  step={cur}
                  app={app}
                  setApp={setApp}
                  fill={fill}
                />
              </div>

              {tried && !cur.valid(app) && (
                <p className="mt-3 text-[0.75rem] text-thread">
                  {cur.kind === "email"
                    ? "이메일 주소를 확인해주세요."
                    : cur.kind === "consent"
                      ? "필수 항목 두 가지에 확인이 필요해요."
                      : "이 질문에 답을 남겨주시면 다음으로 넘어갈 수 있어요."}
                </p>
              )}

              <button
                type="button"
                onClick={onNext}
                className="mt-4.5 inline-flex h-[56px] w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-[#5b1720] to-[#341015] text-[0.95rem] font-medium text-ivory active:opacity-85"
              >
                {safeStep >= total - 1
                  ? "이야기 마치기"
                  : cur.optional && !cur.valid(app)
                    ? "다음"
                    : "다음"}
              </button>
              {cur.optional && (
                <p className="mt-2 text-center text-[0.68rem] text-ivory-dim/60">
                  건너뛰어도 괜찮은 질문이에요.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------- OUTRO (§37) ---------- */}
      {phase === "outro" && (
        <div className="imm-viewport relative z-10 flex flex-col items-center justify-center px-8 text-center">
          <p className="imm-msg font-display whitespace-pre-line text-[1.35rem] font-medium leading-[1.85] text-ivory">
            {"이제 월화가 들은 이야기를\n한 번 확인해볼게요."}
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------------- step별 입력 UI ---------------- */
function StepInput({
  step,
  app,
  setApp,
  fill,
}: {
  step: StepDef;
  app: RitualApplication;
  setApp: React.Dispatch<React.SetStateAction<RitualApplication>>;
  fill: (t: string) => string;
}) {
  const inputCls =
    "h-[52px] w-full rounded-2xl border border-ivory/20 bg-ink/55 px-4 text-base text-ivory placeholder:text-ivory-dim/45 focus:border-gold/60 focus:outline-none";
  const update = (v: unknown) => setApp((a) => step.set(a, v));

  if (step.kind === "text") {
    return (
      <input
        className={inputCls}
        placeholder={step.placeholder}
        value={String(step.get(app) ?? "")}
        maxLength={40}
        autoComplete="off"
        onChange={(e) => update(e.target.value)}
      />
    );
  }

  if (step.kind === "year") {
    const v = step.get(app) as number | null;
    return (
      <input
        className={inputCls}
        placeholder={step.placeholder}
        inputMode="numeric"
        autoComplete="off"
        value={v === null ? "" : String(v)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
          update(digits === "" ? null : Number(digits));
        }}
      />
    );
  }

  if (step.kind === "email") {
    return (
      <input
        className={inputCls}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder={step.placeholder}
        value={String(step.get(app) ?? "")}
        onChange={(e) => update(e.target.value)}
      />
    );
  }

  if (step.kind === "textarea") {
    const v = String(step.get(app) ?? "");
    return (
      <div>
        <textarea
          className="min-h-[7.5rem] w-full rounded-2xl border border-ivory/20 bg-ink/55 px-4 py-3.5 text-base font-light leading-[1.8] text-ivory placeholder:text-ivory-dim/45 focus:border-gold/60 focus:outline-none"
          placeholder={step.placeholder}
          maxLength={step.maxLen}
          value={v}
          onChange={(e) => update(e.target.value)}
        />
        <div className="mt-1 flex justify-between text-[0.65rem] text-ivory-dim/50">
          <span>
            {step.id === "story" && v.trim().length > 0 &&
            v.trim().length < STORY_RECOMMENDED_MIN
              ? "조금 더 자세할수록 월화가 깊게 읽을 수 있어요."
              : ""}
          </span>
          <span>
            {v.length}/{step.maxLen}
          </span>
        </div>
      </div>
    );
  }

  if (step.kind === "select") {
    const v = String(step.get(app) ?? "");
    const twoCol = (step.options?.length ?? 0) >= 6 &&
      step.options!.every((o) => o.label.length <= 10);
    return (
      <div>
        <div className={twoCol ? "grid grid-cols-2 gap-2.5" : "flex flex-col gap-2.5"}>
          {step.options!.map((o) => {
            const on = v === o.value;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  if (step.id === "partner_gender" && on) {
                    update(null);
                    return;
                  }
                  update(o.value);
                }}
                className={`min-h-[52px] rounded-2xl border px-4 py-3 text-left text-[0.9rem] leading-snug transition-colors ${
                  on
                    ? "border-gold/70 bg-[#3a1219]/80 text-ivory"
                    : "border-ivory/15 bg-ink/45 text-ivory-dim"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        {step.id === "relationship_type" && v === "other" && (
          <input
            className={`${inputCls} mt-2.5`}
            placeholder="어떤 관계인지 짧게 적어주세요"
            value={app.relationship_type_other}
            maxLength={60}
            onChange={(e) =>
              setApp((a) => ({ ...a, relationship_type_other: e.target.value }))
            }
          />
        )}
      </div>
    );
  }

  if (step.kind === "multi") {
    const vals = (step.get(app) as string[]) ?? [];
    const isSafety = step.id === "safety_concerns";
    const max = isSafety ? 99 : PAIN_POINTS_MAX;
    const toggle = (val: string) => {
      let next: string[];
      if (vals.includes(val)) {
        next = vals.filter((x) => x !== val);
      } else if (isSafety && SAFETY_EXCLUSIVE_VALUES.includes(val)) {
        next = [val]; // 단독 선택
      } else {
        let base = vals;
        if (isSafety) {
          base = vals.filter((x) => !SAFETY_EXCLUSIVE_VALUES.includes(x));
        }
        if (base.length >= max) return;
        next = [...base, val];
      }
      if (isSafety) {
        setApp((a) => ({
          ...a,
          safety_concerns: next,
          safety_concerns_other: next.includes(SAFETY_OTHER_VALUE)
            ? a.safety_concerns_other
            : "",
        }));
      } else {
        update(next);
      }
    };
    return (
      <div>
        <div className="flex flex-col gap-2.5">
          {step.options!.map((o) => {
            const on = vals.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(o.value)}
                className={`min-h-[48px] rounded-2xl border px-4 py-3 text-left text-[0.88rem] leading-snug transition-colors ${
                  on
                    ? "border-gold/70 bg-[#3a1219]/80 text-ivory"
                    : "border-ivory/15 bg-ink/45 text-ivory-dim"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        {isSafety && vals.includes(SAFETY_OTHER_VALUE) && (
          <input
            className={`${inputCls} mt-2.5`}
            placeholder="편하신 만큼만 적어주세요"
            maxLength={SAFETY_OTHER_MAX}
            value={app.safety_concerns_other}
            onChange={(e) =>
              setApp((a) => ({ ...a, safety_concerns_other: e.target.value }))
            }
          />
        )}
      </div>
    );
  }

  /* consent */
  return (
    <div className="flex flex-col gap-3">
      {(
        [
          [
            "consent_processing",
            "이야기를 결과 제작에 사용하는 것에 동의해요. (필수)",
          ],
          [
            "consent_no_guarantee",
            "이 결과는 마음을 정리하는 콘텐츠이며,\n재회나 특정 결과를 보장하지 않음을 확인했어요. (필수)",
          ],
          ["consent_marketing", "월하연의 소식을 이메일로 받아볼게요. (선택)"],
        ] as const
      ).map(([key, label]) => {
        const on = Boolean(app[key]);
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => setApp((a) => ({ ...a, [key]: !a[key] }))}
            className={`flex min-h-[52px] items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors ${
              on
                ? "border-gold/70 bg-[#3a1219]/70"
                : "border-ivory/15 bg-ink/45"
            }`}
          >
            <span
              aria-hidden
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[0.6rem] ${
                on ? "border-gold bg-gold text-ink" : "border-ivory/40 text-transparent"
              }`}
            >
              ✓
            </span>
            <span className="whitespace-pre-line text-[0.82rem] font-light leading-[1.75] text-ivory">
              {fill(label)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
