"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PreviewWaiting from "@/components/apply/PreviewWaiting";
import { trackEvent } from "@/lib/analytics";
import {
  RitualApplication,
  RELATIONSHIP_TYPE_OPTIONS,
  RELATIONSHIP_DURATION_OPTIONS,
  BREAKUP_ELAPSED_OPTIONS,
  BREAKUP_INITIATOR_OPTIONS,
  LAST_CONVERSATION_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  PARTNER_NEW_RELATIONSHIP_OPTIONS,
  PAIN_POINT_OPTIONS,
  MAIN_WISH_OPTIONS,
  CURRENT_EMOTION_OPTIONS,
  optionLabel,
  APPLICANT_GENDER_OPTIONS,
  PARTNER_GENDER_OPTIONS,
  LIFE_STAGE_OPTIONS,
} from "@/lib/ritual-types";
import {
  loadApplication,
  hasMeaningfulData,
  getOrCreateSubmissionId,
  clearDraftBackup,
} from "@/lib/ritual-storage";

/** 서버가 알려 준 확인 필요 항목 → 손님이 알아볼 수 있는 이름 */
const FIELD_LABEL: Record<string, string> = {
  applicant_name: "내 이름",
  partner_name: "상대 이름",
  applicant_gender: "성별",
  applicant_birth_year: "태어난 해",
  life_stage: "지금 생활",
  partner_birth_year: "상대가 태어난 해",
  relationship_type: "관계",
  relationship_type_other: "관계(직접 입력)",
  relationship_duration: "만난 기간",
  breakup_elapsed: "이별 후 지난 시간",
  breakup_initiator: "먼저 이별을 말한 사람",
  last_conversation: "마지막 대화",
  contact_status: "연락 상태",
  partner_new_relationship: "상대의 새 연인",
  pain_points: "가장 힘든 것",
  main_wish: "가장 바라는 것",
  story: "상세 사연",
  current_emotion: "지금 감정",
  safety_concerns: "안전 확인",
  email: "이메일",
  consent_processing: "개인정보 동의",
  consent_no_guarantee: "안내 사항 동의",
};


function Row({ label, value }: { label: string; value: string }) {
  const empty = value.trim() === "";
  return (
    <div className="flex flex-col gap-0.5 py-2.5">
      <dt className="text-xs tracking-wide text-gold/80">{label}</dt>
      <dd
        className={`text-[0.88rem] leading-relaxed ${
          empty ? "text-ivory-dim/40" : "text-ivory"
        }`}
      >
        {empty ? "작성하지 않음" : value}
      </dd>
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
      <h2 className="font-display border-b border-gold-dim/20 pb-2.5 text-[0.9rem] font-semibold text-ivory">
        {title}
      </h2>
      <dl className="divide-y divide-gold-dim/10">{children}</dl>
    </section>
  );
}

export default function ConfirmPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* "월화에게 먼저 읽혀보기" — 별도 단계 없이 즉시 주문 생성 후 읽기 화면으로.
     (가격은 미리보기가 정상 생성된 뒤에만 처음 노출) */
  const handleReadNow = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        /* 느린 모바일·앱 내 브라우저에서 요청이 멈춰 있지 않게 25초 뒤 안내 (입력은 그대로 저장돼 있음) */
        signal:
          typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
            ? AbortSignal.timeout(25_000)
            : undefined,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: getOrCreateSubmissionId(),
          application: loadApplication(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok && typeof json.order_number === "string") {
        trackEvent("order_created", { order: json.order_number });
        clearDraftBackup();
        /* 주문 저장 요청에서 이미 만들어진 무료 preview를 다음 화면이
           즉시 쓸 수 있게 세션 캐시에 넘긴다. 실패해도 기존 API fallback 유지. */
        try {
          if (json.preview) {
            sessionStorage.setItem(
              `wolhayeon_preview_prefetch:${json.order_number}`,
              JSON.stringify({
                preview: json.preview,
                applicantName:
                  typeof json.applicant_name === "string"
                    ? json.applicant_name
                    : data?.applicant_name ?? "",
              })
            );
          }
        } catch {
          /* sessionStorage가 막힌 브라우저에서는 기존 서버 조회로 진행 */
        }

        const token =
          typeof json.preview_token === "string" ? json.preview_token : "";
        const tokenQuery = token
          ? `&pt=${encodeURIComponent(token)}`
          : "";
        router.push(
          `/apply/preview?order=${encodeURIComponent(json.order_number)}${tokenQuery}`
        );
        return; // 이동 중 재클릭 방지
      }
      const fields: string[] = Array.isArray(json?.invalid_fields) ? json.invalid_fields : [];
      setErrorMsg(
        fields.length
          ? `${json?.message ?? "입력 내용에 확인이 필요한 항목이 있습니다."} (확인할 항목: ${fields
              .slice(0, 3)
              .map((f) => FIELD_LABEL[f] ?? f)
              .join(", ")})`
          : json?.message ??
              "이야기를 저장하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
      setSubmitting(false);
    } catch {
      setErrorMsg(
        "연결이 잠시 불안정해요. 적어 주신 이야기는 그대로 있으니 버튼을 한 번 더 눌러 주세요."
      );
      setSubmitting(false);
    }
  };
  const [data, setData] = useState<RitualApplication | null>(null);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    const d = loadApplication();
    if (!hasMeaningfulData(d)) setEmpty(true);
    else setData(d);
  }, []);

  if (empty) {
    return (
      <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-xl text-ivory">
          아직 들려주신 이야기가 없습니다.
        </p>
        <p className="mt-4 text-sm text-ivory-dim">
          아직 들려주신 이야기가 없어요.
        </p>
        <Link
          href="/apply"
          className="mt-8 inline-flex h-13 items-center justify-center rounded-full border border-gold-dim/40 px-8 text-sm text-ivory"
        >
          내 이야기 들려주기
        </Link>
      </main>
    );
  }

  if (!data) return <main className="min-h-[100svh]" />;

  const painLabels = data.pain_points
    .map((v) => optionLabel(PAIN_POINT_OPTIONS, v))
    .join(", ");

  if (submitting) return <PreviewWaiting name={data.applicant_name} />;

  const chips = [
    data.relationship_type === "other"
      ? data.relationship_type_other
      : optionLabel(RELATIONSHIP_TYPE_OPTIONS, data.relationship_type),
    optionLabel(RELATIONSHIP_DURATION_OPTIONS, data.relationship_duration),
    data.breakup_elapsed ? `헤어진 지 ${optionLabel(BREAKUP_ELAPSED_OPTIONS, data.breakup_elapsed)}` : "",
    optionLabel(CONTACT_STATUS_OPTIONS, data.contact_status),
    optionLabel(MAIN_WISH_OPTIONS, data.main_wish),
  ].filter((c) => c && c.trim());
  const story = data.story.trim();
  const excerpt = story.length > 90 ? `${story.slice(0, 90)}…` : story;

  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-md pb-44">
      {/* 월화 영상 + 한 줄 */}
      <section className="relative">
        <video
          className="block aspect-[4/4.6] w-full object-cover object-top"
          src="/book/v3/w-reading.mp4"
          poster="/book/v3/w-reading.webp"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink via-ink/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-2">
          <p className="text-[0.7rem] tracking-[0.3em] text-gold/90">月下緣</p>
          <h1 className="font-display mt-2 text-[1.45rem] leading-[1.55] text-ivory">
            {data.applicant_name ? `${data.applicant_name}님의 이야기,` : "당신의 이야기,"}
            <br />
            <span className="text-gold">월화가 다 들었어요.</span>
          </h1>
        </div>
      </section>

      <div className="px-6">
        {/* 사연 한 장 요약 */}
        <section className="mt-6 rounded-2xl border border-gold-dim/30 bg-ink-soft/70 px-5 py-5">
          <div className="flex items-center justify-between">
            <p className="text-[0.86rem] text-ivory">
              {data.applicant_name || "나"}
              <span className="mx-1.5 text-thread">—</span>
              {data.partner_name || "그 사람"}
            </p>
            <span className="text-[0.66rem] tracking-[0.2em] text-gold/70">내 사연</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span key={c} className="rounded-full bg-ink px-2.5 py-1 text-[0.72rem] text-ivory-dim">
                {c}
              </span>
            ))}
          </div>
          {excerpt && (
            <p className="font-display mt-4 border-l-2 border-thread/50 pl-3 text-[0.86rem] leading-[1.9] text-ivory/90">
              “{excerpt}”
            </p>
          )}

          <details className="group mt-4">
            <summary className="cursor-pointer list-none text-[0.76rem] text-gold/80">
              <span className="group-open:hidden">내가 쓴 내용 전체 보기 ▾</span>
              <span className="hidden group-open:inline">접기 ▴</span>
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <Group title="나">
                <Row label="이름" value={data.applicant_name} />
                <Row
                  label="성별 / 출생연도"
                  value={`${optionLabel(APPLICANT_GENDER_OPTIONS, data.applicant_gender)} / ${data.applicant_birth_year ?? "-"}`}
                />
                <Row label="현재 생활" value={optionLabel(LIFE_STAGE_OPTIONS, data.life_stage)} />
              </Group>
              <Group title="그 사람">
                <Row label="상대 이름" value={data.partner_name} />
                <Row
                  label="상대 성별 / 출생연도"
                  value={`${data.partner_gender ? optionLabel(PARTNER_GENDER_OPTIONS, data.partner_gender) : "미입력"} / ${data.partner_birth_year ?? "미입력"}`}
                />
              </Group>
              <Group title="우리의 관계">
                {data.breakup_initiator !== null && (
                  <Row label="먼저 이야기한 사람" value={optionLabel(BREAKUP_INITIATOR_OPTIONS, data.breakup_initiator)} />
                )}
                <Row label="마지막 연락" value={optionLabel(LAST_CONVERSATION_OPTIONS, data.last_conversation)} />
                <Row
                  label="상대의 새로운 연인 여부"
                  value={optionLabel(PARTNER_NEW_RELATIONSHIP_OPTIONS, data.partner_new_relationship)}
                />
              </Group>
              <Group title="내 마음">
                <Row label="가장 힘든 것" value={painLabels} />
                <Row label="현재 감정" value={optionLabel(CURRENT_EMOTION_OPTIONS, data.current_emotion)} />
              </Group>
              <Group title="우리의 이야기">
                <Row label="상세 사연" value={data.story} />
                <Row label="마지막 대화에서 남은 말" value={data.last_conversation_memory} />
                <Row label="듣고 싶은 한마디" value={data.wish_sentence} />
                <Row label="다시 이어진다면 달라졌으면 하는 점" value={data.desired_change} />
              </Group>
            </div>
          </details>
        </section>

        {/* 마음이 놓이는 세 줄 */}
        <ul className="mt-6 space-y-3">
          {[
            ["결제 전, 무료로 먼저", "지금 연락해도 되는지부터 먼저 보여드려요."],
            ["오직 이 사연으로만", "누구에게나 같은 말이 아니라, 두 사람의 이야기로 써요."],
            ["서두르지 않게, 순서부터", "관계를 더 멀게 만드는 한 줄을 보내기 전에 멈출 수 있게."],
          ].map(([t, d]) => (
            <li key={t} className="flex gap-3">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-thread" />
              <p className="text-[0.86rem] leading-[1.75] text-ivory">
                {t}
                <span className="block text-[0.78rem] font-light text-ivory-dim">{d}</span>
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center text-xs text-ivory-dim/50">결과는 {data.email} 로 안내됩니다.</p>
      </div>

      {/* 하단 버튼 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold-dim/15 bg-ink/95 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md gap-3 px-6">
          <button
            type="button"
            onClick={() => router.push("/apply")}
            className="inline-flex h-14 w-28 items-center justify-center rounded-full border border-gold-dim/40 text-[0.92rem] text-ivory-dim active:bg-ivory/5"
          >
            수정하기
          </button>
          <button
            type="button"
            onClick={handleReadNow}
            disabled={submitting}
            className="cta-glow inline-flex h-14 flex-1 items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory active:opacity-85 disabled:opacity-60"
          >
            월화에게 먼저 읽혀보기
          </button>
        </div>
        <p className="mx-auto mt-2.5 max-w-md px-6 text-center text-[0.7rem] font-light text-ivory-dim/75">
          무료 미리보기 · 약 30초 · 결제는 미리보기를 본 뒤에
        </p>
        {errorMsg && (
          <p className="mx-auto mt-1 max-w-md px-6 text-center text-[0.75rem] text-thread">
            {errorMsg}
          </p>
        )}
      </div>
    </main>
  );
}
