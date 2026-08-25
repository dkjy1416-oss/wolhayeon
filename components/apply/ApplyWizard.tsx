"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  RitualApplication,
  EMPTY_APPLICATION,
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
  SAFETY_NONE_VALUE,
  STORY_MAX,
  STORY_RECOMMENDED_MIN,
  LAST_MEMORY_MAX,
  WISH_SENTENCE_MAX,
  DESIRED_CHANGE_MAX,
  isBreakupRelated,
  isValidEmail,
} from "@/lib/ritual-types";
import {
  loadApplication,
  saveApplication,
  loadStep,
  saveStep,
} from "@/lib/ritual-storage";
import {
  SingleSelect,
  MultiSelect,
  TextField,
  TextAreaField,
  ConsentCheck,
} from "./Fields";

type StepId =
  | "q1" | "q2" | "q3" | "q4" | "q5" | "q6" | "q7" | "q8" | "q9"
  | "q10" | "q11" | "q12" | "q13" | "q14" | "q15" | "q16" | "q17"
  | "consent";

const STEP_ORDER: StepId[] = [
  "q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9",
  "q10", "q11", "q12", "q13", "q14", "q15", "q16", "q17", "consent",
];

export default function ApplyWizard() {
  const router = useRouter();
  const [data, setData] = useState<RitualApplication>({ ...EMPTY_APPLICATION });
  const [stepIndex, setStepIndex] = useState(-1); // -1 = INTRO
  const [loaded, setLoaded] = useState(false);
  const [tried, setTried] = useState(false); // '다음'을 눌렀는데 미완성일 때 안내 표시
  const topRef = useRef<HTMLDivElement>(null);

  /* 세션 복원 (마운트 시 1회) */
  useEffect(() => {
    setData(loadApplication());
    setStepIndex(loadStep());
    setLoaded(true);
  }, []);

  /* 변경 시마다 sessionStorage 저장 */
  useEffect(() => {
    if (!loaded) return;
    saveApplication(data);
  }, [data, loaded]);

  useEffect(() => {
    if (!loaded) return;
    saveStep(stepIndex);
    setTried(false);
    topRef.current?.scrollIntoView({ block: "start" });
    window.scrollTo(0, 0);
  }, [stepIndex, loaded]);

  /* Q3 답에 따라 Q5(이별 관련) 표시 여부 결정 */
  const visibleSteps = useMemo(
    () =>
      STEP_ORDER.filter(
        (id) => id !== "q5" || isBreakupRelated(data.relationship_type)
      ),
    [data.relationship_type]
  );
  const totalSteps = visibleSteps.length;
  const currentId: StepId | null =
    stepIndex >= 0 && stepIndex < totalSteps ? visibleSteps[stepIndex] : null;

  const set = <K extends keyof RitualApplication>(
    key: K,
    value: RitualApplication[K]
  ) => setData((d) => ({ ...d, [key]: value }));

  /* 관계 유형이 '이별 관련'에서 벗어나면 Q5 답 정리 */
  const setRelationshipType = (v: string) => {
    setData((d) => ({
      ...d,
      relationship_type: v,
      relationship_type_other: v === "other" ? d.relationship_type_other : "",
      breakup_elapsed: isBreakupRelated(v) ? d.breakup_elapsed : null,
      breakup_initiator: isBreakupRelated(v) ? d.breakup_initiator : null,
    }));
  };

  /* 단계별 검증 */
  const isStepValid = (id: StepId): boolean => {
    switch (id) {
      case "q1": return data.applicant_name.trim().length > 0;
      case "q2": return data.partner_name.trim().length > 0;
      case "q3":
        return (
          data.relationship_type !== "" &&
          (data.relationship_type !== "other" ||
            data.relationship_type_other.trim().length > 0)
        );
      case "q4": return data.relationship_duration !== "";
      case "q5":
        return data.breakup_elapsed !== null && data.breakup_initiator !== null;
      case "q6": return data.last_conversation !== "";
      case "q7": return data.contact_status !== "";
      case "q8": return data.partner_new_relationship !== "";
      case "q9": return data.pain_points.length > 0;
      case "q10": return data.main_wish !== "";
      case "q11": return data.story.trim().length > 0; // 100자 미만도 제출 가능(권장 안내만)
      case "q12":
      case "q13":
      case "q14":
        return true; // 선택 입력
      case "q15": return data.current_emotion !== "";
      case "q16": return data.safety_concerns.length > 0;
      case "q17": return isValidEmail(data.email);
      case "consent":
        return data.consent_processing && data.consent_no_guarantee;
    }
  };

  const goNext = () => {
    if (currentId && !isStepValid(currentId)) {
      setTried(true);
      return;
    }
    if (stepIndex >= totalSteps - 1) {
      router.push("/apply/confirm");
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const goPrev = () => {
    if (stepIndex <= 0) setStepIndex(-1);
    else setStepIndex((i) => i - 1);
  };

  if (!loaded) {
    return <div className="min-h-[100svh]" />;
  }

  /* ---------- INTRO ---------- */
  if (stepIndex < 0) {
    return (
      <div ref={topRef} className="flex min-h-[100svh] flex-col px-6 pb-10 pt-20">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
          <div className="img-blend relative aspect-square w-40 opacity-80">
            <Image
              src="/images/wolhwa-portrait.webp"
              alt=""
              fill
              sizes="160px"
              className="object-cover"
            />
          </div>
          <h1 className="font-display mt-8 text-2xl font-semibold text-ivory">
            당신의 이야기를 들려주세요.
          </h1>
          <p className="mt-6 text-[0.92rem] font-light leading-[2] text-ivory-dim">
            몇 가지 질문을 통해
            <br />
            두 사람의 이야기를 천천히 들려주세요.
            <br />
            당신이 들려준 내용을 바탕으로
            <br />
            월화가 개인 리추얼을 준비합니다.
          </p>
          <p className="mt-6 text-xs text-ivory-dim/60">
            약 5~7분 정도 소요됩니다.
          </p>
          <button
            type="button"
            onClick={() => setStepIndex(0)}
            className="mt-10 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85"
          >
            시작하기
          </button>
          <Link
            href="/"
            className="mt-6 text-xs text-ivory-dim/60 underline underline-offset-4"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  /* ---------- 질문 단계 ---------- */
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  const step = (() => {
    switch (currentId) {
      case "q1":
        return {
          title: "어떻게 불러드리면 될까요?",
          hint: "리추얼 결과에서 이 이름으로 불러드립니다.",
          body: (
            <TextField
              value={data.applicant_name}
              onChange={(v) => set("applicant_name", v)}
              placeholder="예: 서연"
              onEnter={goNext}
            />
          ),
          error: "이름 또는 닉네임을 입력해주세요.",
        };
      case "q2":
        return {
          title: "그 사람을 어떻게 불러드릴까요?",
          hint: "실명 대신 두 분만 알아볼 수 있는 이름을 사용해도 됩니다.",
          body: (
            <TextField
              value={data.partner_name}
              onChange={(v) => set("partner_name", v)}
              placeholder="예: 민준"
              onEnter={goNext}
            />
          ),
          error: "이름 또는 닉네임을 입력해주세요.",
        };
      case "q3":
        return {
          title: "지금 두 사람은 어떤 관계인가요?",
          body: (
            <>
              <SingleSelect
                options={RELATIONSHIP_TYPE_OPTIONS}
                value={data.relationship_type}
                onChange={setRelationshipType}
              />
              {data.relationship_type === "other" && (
                <div className="mt-4">
                  <TextField
                    value={data.relationship_type_other}
                    onChange={(v) => set("relationship_type_other", v)}
                    placeholder="어떤 관계인지 짧게 적어주세요"
                  />
                </div>
              )}
            </>
          ),
          error:
            data.relationship_type === "other"
              ? "어떤 관계인지 짧게 적어주세요."
              : "하나를 선택해주세요.",
        };
      case "q4":
        return {
          title: "두 사람의 관계는 얼마나 이어졌나요?",
          body: (
            <SingleSelect
              options={RELATIONSHIP_DURATION_OPTIONS}
              value={data.relationship_duration}
              onChange={(v) => set("relationship_duration", v)}
            />
          ),
          error: "하나를 선택해주세요.",
        };
      case "q5":
        return {
          title: "관계가 끝난 지 얼마나 되었나요?",
          body: (
            <>
              <SingleSelect
                options={BREAKUP_ELAPSED_OPTIONS}
                value={data.breakup_elapsed}
                onChange={(v) => set("breakup_elapsed", v)}
              />
              <p className="font-display mb-4 mt-10 text-lg font-semibold text-ivory">
                누가 먼저 관계를 끝내자고 말했나요?
              </p>
              <SingleSelect
                options={BREAKUP_INITIATOR_OPTIONS}
                value={data.breakup_initiator}
                onChange={(v) => set("breakup_initiator", v)}
              />
            </>
          ),
          error: "두 질문 모두 선택해주세요.",
        };
      case "q6":
        return {
          title: "마지막으로 제대로 대화를 나눈 것은 언제인가요?",
          body: (
            <SingleSelect
              options={LAST_CONVERSATION_OPTIONS}
              value={data.last_conversation}
              onChange={(v) => set("last_conversation", v)}
            />
          ),
          error: "하나를 선택해주세요.",
        };
      case "q7":
        return {
          title: "지금 연락할 수 있는 상태인가요?",
          body: (
            <SingleSelect
              options={CONTACT_STATUS_OPTIONS}
              value={data.contact_status}
              onChange={(v) => set("contact_status", v)}
            />
          ),
          error: "하나를 선택해주세요.",
        };
      case "q8":
        return {
          title:
            "현재 알고 있는 범위에서 상대방에게 새로운 연인이 있나요?",
          body: (
            <SingleSelect
              options={PARTNER_NEW_RELATIONSHIP_OPTIONS}
              value={data.partner_new_relationship}
              onChange={(v) => set("partner_new_relationship", v)}
            />
          ),
          error: "하나를 선택해주세요.",
        };
      case "q9":
        return {
          title: "지금 이 관계에서 가장 힘든 것은 무엇인가요?",
          hint: `최대 ${PAIN_POINTS_MAX}개까지 선택할 수 있습니다.`,
          body: (
            <MultiSelect
              options={PAIN_POINT_OPTIONS}
              values={data.pain_points}
              onChange={(v) => set("pain_points", v)}
              max={PAIN_POINTS_MAX}
            />
          ),
          error: "하나 이상 선택해주세요.",
        };
      case "q10":
        return {
          title: "지금 가장 바라는 것은 무엇인가요?",
          hint: "하나만 선택해주세요.",
          body: (
            <SingleSelect
              options={MAIN_WISH_OPTIONS}
              value={data.main_wish}
              onChange={(v) => set("main_wish", v)}
            />
          ),
          error: "하나를 선택해주세요.",
        };
      case "q11":
        return {
          title: "두 사람의 이야기를 들려주세요.",
          hint: "어떻게 만나게 되었는지, 좋았던 순간, 관계가 달라지기 시작한 계기, 마지막 대화, 지금 가장 마음에 걸리는 일을 자유롭게 적어주세요.",
          body: (
            <>
              <TextAreaField
                value={data.story}
                onChange={(v) => set("story", v)}
                placeholder="예: 2년 정도 만났고 처음에는…"
                maxLength={STORY_MAX}
                rows={10}
              />
              {data.story.trim().length > 0 &&
                data.story.trim().length < STORY_RECOMMENDED_MIN && (
                  <p className="mt-1 text-xs leading-relaxed text-gold/80">
                    조금 더 자세히 적어주시면 더욱 개인화된 결과를 받을 수
                    있습니다.
                  </p>
                )}
            </>
          ),
          error: "이야기를 적어주세요.",
        };
      case "q12":
        return {
          title: "마지막 대화에서 가장 마음에 남은 것은 무엇인가요?",
          hint: "선택 사항입니다. 건너뛰어도 괜찮습니다.",
          body: (
            <TextAreaField
              value={data.last_conversation_memory}
              onChange={(v) => set("last_conversation_memory", v)}
              placeholder="상대방이 했던 말, 내가 하지 못했던 말, 당시 상황 등을 적어주세요."
              maxLength={LAST_MEMORY_MAX}
              rows={6}
            />
          ),
        };
      case "q13":
        return {
          title:
            "그 사람에게 지금 딱 한 문장을 들을 수 있다면 어떤 말을 듣고 싶나요?",
          hint: "선택 사항입니다.",
          body: (
            <TextAreaField
              value={data.wish_sentence}
              onChange={(v) => set("wish_sentence", v)}
              placeholder="예: 그때 내가 너무 미안했어."
              maxLength={WISH_SENTENCE_MAX}
              rows={4}
            />
          ),
        };
      case "q14":
        return {
          title: "다시 관계가 이어진다면 무엇이 달라졌으면 하나요?",
          hint: "선택 사항입니다.",
          body: (
            <TextAreaField
              value={data.desired_change}
              onChange={(v) => set("desired_change", v)}
              placeholder="예: 서로 감정을 쌓아두지 않고 이야기했으면 좋겠어요."
              maxLength={DESIRED_CHANGE_MAX}
              rows={5}
            />
          ),
        };
      case "q15":
        return {
          title: "지금의 마음과 가장 가까운 것은 무엇인가요?",
          body: (
            <SingleSelect
              options={CURRENT_EMOTION_OPTIONS}
              value={data.current_emotion}
              onChange={(v) => set("current_emotion", v)}
            />
          ),
          error: "하나를 선택해주세요.",
        };
      case "q16":
        return {
          title: "관계에서 걱정되는 상황이 있었나요?",
          hint: "해당하는 것이 있다면 알려주세요. 리추얼을 더 안전하고 편안하게 준비하는 데에만 사용됩니다.",
          body: (
            <MultiSelect
              options={SAFETY_CONCERN_OPTIONS}
              values={data.safety_concerns}
              onChange={(v) => set("safety_concerns", v)}
              exclusiveValue={SAFETY_NONE_VALUE}
            />
          ),
          error: "해당하는 항목을 선택해주세요. 없다면 '없음'을 선택해주세요.",
        };
      case "q17":
        return {
          title: "결과를 어디로 보내드릴까요?",
          hint: "리추얼이 준비되면 결과 페이지를 확인할 수 있는 링크를 보내드립니다.",
          body: (
            <TextField
              type="email"
              value={data.email}
              onChange={(v) => set("email", v)}
              placeholder="example@email.com"
              onEnter={goNext}
            />
          ),
          error: "올바른 이메일 주소를 입력해주세요.",
        };
      case "consent":
        return {
          title: "마지막으로 확인해주세요.",
          body: (
            <div className="flex flex-col gap-3">
              <ConsentCheck
                checked={data.consent_processing}
                onChange={(v) => set("consent_processing", v)}
                label="개인 리추얼 제작을 위해 입력한 정보를 처리하는 것에 동의합니다."
                required
              />
              <ConsentCheck
                checked={data.consent_no_guarantee}
                onChange={(v) => set("consent_no_guarantee", v)}
                label="월하연의 리추얼은 특정 상대방의 감정, 행동, 연락, 재회 또는 미래의 결과를 보장하는 서비스가 아님을 확인했습니다."
                required
              />
              <ConsentCheck
                checked={data.consent_marketing}
                onChange={(v) => set("consent_marketing", v)}
                label="월하연의 새로운 리추얼과 소식을 이메일로 받아보겠습니다."
              />
            </div>
          ),
          error: "필수 항목 두 가지에 동의해주세요.",
        };
      default:
        return { title: "", body: null };
    }
  })();

  const showError = tried && currentId && !isStepValid(currentId);

  return (
    <div ref={topRef} className="flex min-h-[100svh] flex-col">
      {/* 진행률 */}
      <div className="fixed inset-x-0 top-0 z-40 bg-ink/90 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-md items-center justify-between px-6">
          <Link href="/" className="font-display text-sm text-ivory-dim">
            월하연 <span className="text-gold/80">月下緣</span>
          </Link>
          <span className="text-xs tabular-nums text-ivory-dim">
            {stepIndex + 1} / {totalSteps}
          </span>
        </div>
        <div className="h-px w-full bg-gold-dim/20">
          <div
            className="h-px bg-gold/70 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 질문 본문 */}
      <div className="mx-auto w-full max-w-md flex-1 px-6 pb-36 pt-24">
        <h2 className="font-display text-xl font-semibold leading-[1.6] text-ivory">
          {step.title}
        </h2>
        {step.hint && (
          <p className="mt-3 text-[0.82rem] font-light leading-relaxed text-ivory-dim/80">
            {step.hint}
          </p>
        )}
        <div className="mt-8">{step.body}</div>
        {showError && (
          <p className="mt-4 text-sm text-thread">{step.error}</p>
        )}
      </div>

      {/* 하단 이전/다음 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold-dim/15 bg-ink/95 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md gap-3 px-6">
          <button
            type="button"
            onClick={goPrev}
            className="inline-flex h-14 w-28 items-center justify-center rounded-full border border-gold-dim/40 text-[0.95rem] text-ivory-dim transition-colors active:bg-ivory/5"
          >
            이전
          </button>
          <button
            type="button"
            onClick={goNext}
            className="inline-flex h-14 flex-1 items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85"
          >
            {stepIndex >= totalSteps - 1 ? "입력 내용 확인하기" : "다음"}
          </button>
        </div>
      </div>
    </div>
  );
}
