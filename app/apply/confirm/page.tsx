"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
} from "@/lib/ritual-types";
import { loadApplication, hasMeaningfulData } from "@/lib/ritual-storage";

function Row({ label, value }: { label: string; value: string }) {
  const empty = value.trim() === "";
  return (
    <div className="flex flex-col gap-1 py-3">
      <dt className="text-xs tracking-wide text-gold/80">{label}</dt>
      <dd
        className={`text-[0.92rem] leading-relaxed ${
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
    <section className="rounded-2xl border border-gold-dim/25 bg-ink-soft px-6 py-5">
      <h2 className="font-display border-b border-gold-dim/20 pb-3 text-base font-semibold text-ivory">
        {title}
      </h2>
      <dl className="divide-y divide-gold-dim/10">{children}</dl>
    </section>
  );
}

export default function ConfirmPage() {
  const router = useRouter();
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
          신청서를 먼저 작성해주세요.
        </p>
        <Link
          href="/apply"
          className="mt-8 inline-flex h-13 items-center justify-center rounded-full border border-gold-dim/40 px-8 text-sm text-ivory"
        >
          신청서 작성하기
        </Link>
      </main>
    );
  }

  if (!data) return <main className="min-h-[100svh]" />;

  const painLabels = data.pain_points
    .map((v) => optionLabel(PAIN_POINT_OPTIONS, v))
    .join(", ");

  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-md px-6 pb-44 pt-16">
      <h1 className="font-display text-center text-xl font-semibold leading-[1.6] text-ivory">
        당신의 이야기를
        <br />
        이렇게 들었습니다.
      </h1>

      <div className="mt-10 flex flex-col gap-4">
        <Group title="나">
          <Row label="이름" value={data.applicant_name} />
        </Group>

        <Group title="그 사람">
          <Row label="상대 이름" value={data.partner_name} />
        </Group>

        <Group title="우리의 관계">
          <Row
            label="현재 관계"
            value={
              data.relationship_type === "other"
                ? `기타 — ${data.relationship_type_other}`
                : optionLabel(RELATIONSHIP_TYPE_OPTIONS, data.relationship_type)
            }
          />
          <Row
            label="관계 기간"
            value={optionLabel(
              RELATIONSHIP_DURATION_OPTIONS,
              data.relationship_duration
            )}
          />
          {data.breakup_elapsed !== null && (
            <Row
              label="이별 시점"
              value={optionLabel(BREAKUP_ELAPSED_OPTIONS, data.breakup_elapsed)}
            />
          )}
          {data.breakup_initiator !== null && (
            <Row
              label="먼저 이야기한 사람"
              value={optionLabel(
                BREAKUP_INITIATOR_OPTIONS,
                data.breakup_initiator
              )}
            />
          )}
          <Row
            label="마지막 연락"
            value={optionLabel(LAST_CONVERSATION_OPTIONS, data.last_conversation)}
          />
        </Group>

        <Group title="지금의 상황">
          <Row
            label="연락 가능 여부"
            value={optionLabel(CONTACT_STATUS_OPTIONS, data.contact_status)}
          />
          <Row
            label="상대의 새로운 연인 여부"
            value={optionLabel(
              PARTNER_NEW_RELATIONSHIP_OPTIONS,
              data.partner_new_relationship
            )}
          />
        </Group>

        <Group title="내 마음">
          <Row label="가장 힘든 것" value={painLabels} />
          <Row
            label="가장 바라는 것"
            value={optionLabel(MAIN_WISH_OPTIONS, data.main_wish)}
          />
          <Row
            label="현재 감정"
            value={optionLabel(CURRENT_EMOTION_OPTIONS, data.current_emotion)}
          />
        </Group>

        <Group title="우리의 이야기">
          <Row label="상세 사연" value={data.story} />
        </Group>

        <Group title="마음에 남은 말">
          <Row label="마지막 대화" value={data.last_conversation_memory} />
        </Group>

        <Group title="듣고 싶은 한마디">
          <Row label="입력 내용" value={data.wish_sentence} />
        </Group>

        <Group title="다시 이어진다면">
          <Row label="달라졌으면 하는 점" value={data.desired_change} />
        </Group>

        <p className="mt-2 text-center text-xs text-ivory-dim/50">
          결과는 {data.email} 로 안내됩니다.
        </p>
      </div>

      {/* 하단 버튼 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold-dim/15 bg-ink/95 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md gap-3 px-6">
          <button
            type="button"
            onClick={() => router.push("/apply")}
            className="inline-flex h-14 w-32 items-center justify-center rounded-full border border-gold-dim/40 text-[0.95rem] text-ivory-dim active:bg-ivory/5"
          >
            수정하기
          </button>
          <button
            type="button"
            onClick={() => router.push("/apply/ready")}
            className="inline-flex h-14 flex-1 items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory active:opacity-85"
          >
            이 내용으로 계속하기
          </button>
        </div>
      </div>
    </main>
  );
}
