"use client";

/**
 * 구조화된 결과 편집기 (관리자 전용).
 * raw JSON textarea 대신 파트별 카드 form으로 편집합니다.
 * 저장/승인 시 서버가 RitualResultSchema로 전체 재검증하므로
 * 여기서는 편집 편의만 담당합니다.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

type Titled = { title: string; content: string };
type Day = { day: number; title: string; action: string; reflection: string };

interface Content {
  part_01_letter: Titled;
  part_02_relationship_story: Titled;
  part_03_current_emotion: Titled;
  part_04_repeated_pattern: Titled;
  part_05_true_wish: Titled;
  part_06_controllable_now: Titled;
  part_07_ritual: { title: string; meaning: string };
  part_08_preparation: { items: string[] };
  part_09_ritual_steps: { steps: string[] };
  part_10_personal_words: { lines: string[] };
  part_11_24h_guide: { items: string[] };
  part_12_7day_guide: { items: string[] };
  part_13_21day_plan: { days: Day[] };
  part_14_final_letter: Titled;
  bonus_journal_questions: { title: string; intro: string; questions: string[] };
}

const TITLED_PARTS: Array<{ key: keyof Content; label: string }> = [
  { key: "part_01_letter", label: "PART 01 · 첫 편지" },
  { key: "part_02_relationship_story", label: "PART 02 · 관계 이야기" },
  { key: "part_03_current_emotion", label: "PART 03 · 현재 마음" },
  { key: "part_04_repeated_pattern", label: "PART 04 · 반복 흐름" },
  { key: "part_05_true_wish", label: "PART 05 · 진짜 원하는 것" },
  { key: "part_06_controllable_now", label: "PART 06 · 지금 할 수 있는 것" },
];

const LIST_PARTS: Array<{
  key: "part_08_preparation" | "part_09_ritual_steps" | "part_10_personal_words" | "part_11_24h_guide" | "part_12_7day_guide";
  field: "items" | "steps" | "lines";
  label: string;
}> = [
  { key: "part_08_preparation", field: "items", label: "PART 08 · 준비물" },
  { key: "part_09_ritual_steps", field: "steps", label: "PART 09 · 리추얼 순서" },
  { key: "part_10_personal_words", field: "lines", label: "PART 10 · 개인 문장" },
  { key: "part_11_24h_guide", field: "items", label: "PART 11 · 24시간 가이드" },
  { key: "part_12_7day_guide", field: "items", label: "PART 12 · 7일 가이드" },
];

function normalizeContent(raw: Record<string, unknown>): Content {
  const t = (v: unknown): Titled => {
    const o = (v ?? {}) as Record<string, unknown>;
    return {
      title: typeof o.title === "string" ? o.title : "",
      content: typeof o.content === "string" ? o.content : "",
    };
  };
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : "")) : [];
  const p13 = (raw.part_13_21day_plan ?? {}) as Record<string, unknown>;
  const rawDays = Array.isArray(p13.days) ? p13.days : [];
  const days: Day[] = Array.from({ length: 21 }, (_, i) => {
    const d = (rawDays[i] ?? {}) as Record<string, unknown>;
    return {
      day: i + 1,
      title: typeof d.title === "string" ? d.title : "",
      action: typeof d.action === "string" ? d.action : "",
      reflection: typeof d.reflection === "string" ? d.reflection : "",
    };
  });
  const p07 = (raw.part_07_ritual ?? {}) as Record<string, unknown>;
  const bonus = (raw.bonus_journal_questions ?? {}) as Record<string, unknown>;
  return {
    part_01_letter: t(raw.part_01_letter),
    part_02_relationship_story: t(raw.part_02_relationship_story),
    part_03_current_emotion: t(raw.part_03_current_emotion),
    part_04_repeated_pattern: t(raw.part_04_repeated_pattern),
    part_05_true_wish: t(raw.part_05_true_wish),
    part_06_controllable_now: t(raw.part_06_controllable_now),
    part_07_ritual: {
      title: typeof p07.title === "string" ? p07.title : "",
      meaning: typeof p07.meaning === "string" ? p07.meaning : "",
    },
    part_08_preparation: { items: arr((raw.part_08_preparation as Record<string, unknown> | undefined)?.items) },
    part_09_ritual_steps: { steps: arr((raw.part_09_ritual_steps as Record<string, unknown> | undefined)?.steps) },
    part_10_personal_words: { lines: arr((raw.part_10_personal_words as Record<string, unknown> | undefined)?.lines) },
    part_11_24h_guide: { items: arr((raw.part_11_24h_guide as Record<string, unknown> | undefined)?.items) },
    part_12_7day_guide: { items: arr((raw.part_12_7day_guide as Record<string, unknown> | undefined)?.items) },
    part_13_21day_plan: { days },
    part_14_final_letter: t(raw.part_14_final_letter),
    bonus_journal_questions: {
      title: typeof bonus.title === "string" ? bonus.title : "",
      intro: typeof bonus.intro === "string" ? bonus.intro : "",
      questions: arr(bonus.questions),
    },
  };
}

const inputCls =
  "w-full rounded-lg border border-gold-dim/30 bg-ink px-3 py-2 text-[0.85rem] leading-relaxed text-ivory focus:border-gold/60 focus:outline-none";
const cardCls = "rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4";

export default function ReviewEditor({
  orderNumber,
  resultVersion,
  initialContent,
  initialNotes,
  initiallyApproved,
}: {
  orderNumber: string;
  resultVersion: number;
  initialContent: Record<string, unknown>;
  initialNotes: string;
  initiallyApproved: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState<Content>(() =>
    normalizeContent(initialContent)
  );
  const [notes, setNotes] = useState(initialNotes);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [approved, setApproved] = useState(initiallyApproved);

  const set = <K extends keyof Content>(key: K, value: Content[K]) =>
    setContent((c) => ({ ...c, [key]: value }));

  const setListItem = (
    key: (typeof LIST_PARTS)[number]["key"],
    field: string,
    idx: number,
    value: string
  ) =>
    setContent((c) => {
      const list = [
        ...(c[key] as unknown as Record<string, string[]>)[field],
      ];
      list[idx] = value;
      return { ...c, [key]: { [field]: list } } as Content;
    });

  const listOp = (
    key: (typeof LIST_PARTS)[number]["key"],
    field: string,
    op: "add" | "remove",
    idx?: number
  ) =>
    setContent((c) => {
      const list = [
        ...(c[key] as unknown as Record<string, string[]>)[field],
      ];
      if (op === "add") list.push("");
      else if (idx !== undefined) list.splice(idx, 1);
      return { ...c, [key]: { [field]: list } } as Content;
    });

  const post = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, resultVersion, ...payload }),
      });
      const json = await res.json().catch(() => null);
      return { ok: res.ok && json?.ok === true, json };
    } catch {
      return { ok: false, json: null };
    } finally {
      setBusy(false);
    }
  };

  const errText = (json: { error?: string; invalid_paths?: string } | null) => {
    const map: Record<string, string> = {
      validation_failed: `내용 검증 실패: ${json?.invalid_paths ?? ""} — 해당 항목을 확인해주세요.`,
      notes_required: "수정 필요 처리는 관리자 메모가 필요합니다.",
      already_approved: "이미 승인된 주문입니다.",
      stale_version: "새 결과 버전이 있습니다. 새로고침 후 다시 확인해주세요.",
      not_paid: "결제 완료(paid) 주문만 승인할 수 있습니다.",
      not_generated: "생성 완료 상태의 주문만 승인할 수 있습니다.",
      final_content_invalid: "최종 콘텐츠가 검증을 통과하지 못했습니다. 저장 후 다시 시도해주세요.",
      unauthorized: "세션이 만료되었습니다. 다시 로그인해주세요.",
    };
    return map[json?.error ?? ""] ?? "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
  };

  const save = async () => {
    const r = await post({ action: "save", content, notes });
    setMsg(
      r.ok
        ? { ok: true, text: "검수 내용을 저장했습니다. (검수 중 상태)" }
        : { ok: false, text: errText(r.json) }
    );
    if (r.ok) router.refresh();
  };

  const revision = async () => {
    if (notes.trim().length === 0) {
      setMsg({ ok: false, text: "수정 필요 처리는 관리자 메모를 먼저 적어주세요." });
      return;
    }
    const r = await post({ action: "revision", notes });
    setMsg(
      r.ok
        ? { ok: true, text: "수정 필요 상태로 표시했습니다." }
        : { ok: false, text: errText(r.json) }
    );
    if (r.ok) router.refresh();
  };

  const approve = async () => {
    if (
      !window.confirm(
        "현재 검수 내용을 저장한 뒤 최종 승인합니다.\n승인 후 고객 제공본으로 고정됩니다."
      )
    )
      return;
    /* 화면의 미저장 수정사항 유실 방지:
       1) 현재 편집 내용을 먼저 저장(서버 스키마 검증 포함)
       2) 저장이 성공한 경우에만 승인 요청 */
    const saved = await post({ action: "save", content, notes });
    if (!saved.ok) {
      setMsg({
        ok: false,
        text: `저장에 실패해 승인을 진행하지 않았습니다. ${errText(saved.json)}`,
      });
      return;
    }
    const r = await post({ action: "approve" });
    if (r.ok) {
      setApproved(true);
      setMsg({ ok: true, text: "검수 내용 저장 후 최종 승인이 완료되었습니다." });
      router.refresh();
    } else {
      setMsg({ ok: false, text: errText(r.json) });
    }
  };

  const bonus = content.bonus_journal_questions;

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-ivory">
          AI 결과 검수 <span className="text-ivory-dim">(v{resultVersion})</span>
        </h2>
        {approved && (
          <span className="rounded-full border border-emerald-500/60 px-3 py-1 text-xs text-emerald-400">
            ✓ 승인 완료
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {/* PART 01~06 */}
        {TITLED_PARTS.map(({ key, label }) => {
          const v = content[key] as Titled;
          return (
            <div key={key} className={cardCls}>
              <p className="text-xs font-medium tracking-wide text-gold">{label}</p>
              <input
                className={`${inputCls} mt-2`}
                value={v.title}
                onChange={(e) => set(key, { ...v, title: e.target.value } as never)}
                placeholder="제목"
              />
              <textarea
                className={`${inputCls} mt-2 min-h-32 resize-y`}
                value={v.content}
                onChange={(e) => set(key, { ...v, content: e.target.value } as never)}
                placeholder="내용"
              />
            </div>
          );
        })}

        {/* PART 07 */}
        <div className={cardCls}>
          <p className="text-xs font-medium tracking-wide text-gold">PART 07 · 리추얼</p>
          <input
            className={`${inputCls} mt-2`}
            value={content.part_07_ritual.title}
            onChange={(e) =>
              set("part_07_ritual", { ...content.part_07_ritual, title: e.target.value })
            }
            placeholder="리추얼 이름"
          />
          <textarea
            className={`${inputCls} mt-2 min-h-24 resize-y`}
            value={content.part_07_ritual.meaning}
            onChange={(e) =>
              set("part_07_ritual", { ...content.part_07_ritual, meaning: e.target.value })
            }
            placeholder="리추얼의 의미"
          />
        </div>

        {/* 배열형 파트 */}
        {LIST_PARTS.map(({ key, field, label }) => {
          const list = (content[key] as unknown as Record<string, string[]>)[field];
          return (
            <div key={key} className={cardCls}>
              <p className="text-xs font-medium tracking-wide text-gold">{label}</p>
              <div className="mt-2 flex flex-col gap-2">
                {list.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <textarea
                      className={`${inputCls} min-h-10 flex-1 resize-y`}
                      rows={1}
                      value={item}
                      onChange={(e) => setListItem(key, field, i, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => listOp(key, field, "remove", i)}
                      className="mt-1 shrink-0 rounded-full border border-gold-dim/40 px-2.5 py-1 text-xs text-ivory-dim hover:border-thread/60 hover:text-thread"
                      aria-label="항목 삭제"
                    >
                      −
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => listOp(key, field, "add")}
                className="mt-3 rounded-full border border-gold-dim/40 px-3 py-1 text-xs text-ivory-dim hover:border-gold/60 hover:text-gold"
              >
                + 항목 추가
              </button>
            </div>
          );
        })}

        {/* PART 13 · DAY 1~21 */}
        <div className={cardCls}>
          <p className="text-xs font-medium tracking-wide text-gold">
            PART 13 · 21일 마음 회복 플랜 (DAY 1~21)
          </p>
          <div className="mt-3 flex flex-col gap-4">
            {content.part_13_21day_plan.days.map((d, i) => (
              <div key={d.day} className="rounded-lg border border-gold-dim/20 p-3">
                <p className="text-[0.7rem] font-medium text-gold/90">DAY {d.day}</p>
                <input
                  className={`${inputCls} mt-1.5`}
                  value={d.title}
                  placeholder="제목"
                  onChange={(e) => {
                    const days = [...content.part_13_21day_plan.days];
                    days[i] = { ...d, title: e.target.value };
                    set("part_13_21day_plan", { days });
                  }}
                />
                <textarea
                  className={`${inputCls} mt-1.5 min-h-12 resize-y`}
                  value={d.action}
                  placeholder="오늘의 행동"
                  onChange={(e) => {
                    const days = [...content.part_13_21day_plan.days];
                    days[i] = { ...d, action: e.target.value };
                    set("part_13_21day_plan", { days });
                  }}
                />
                <textarea
                  className={`${inputCls} mt-1.5 min-h-12 resize-y`}
                  value={d.reflection}
                  placeholder="잠들기 전 질문/문장"
                  onChange={(e) => {
                    const days = [...content.part_13_21day_plan.days];
                    days[i] = { ...d, reflection: e.target.value };
                    set("part_13_21day_plan", { days });
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* PART 14 */}
        <div className={cardCls}>
          <p className="text-xs font-medium tracking-wide text-gold">PART 14 · 마지막 편지</p>
          <input
            className={`${inputCls} mt-2`}
            value={content.part_14_final_letter.title}
            onChange={(e) =>
              set("part_14_final_letter", {
                ...content.part_14_final_letter,
                title: e.target.value,
              })
            }
            placeholder="제목"
          />
          <textarea
            className={`${inputCls} mt-2 min-h-32 resize-y`}
            value={content.part_14_final_letter.content}
            onChange={(e) =>
              set("part_14_final_letter", {
                ...content.part_14_final_letter,
                content: e.target.value,
              })
            }
            placeholder="내용"
          />
        </div>

        {/* BONUS */}
        <div className={cardCls}>
          <p className="text-xs font-medium tracking-wide text-gold">
            BONUS · 월화의 마음 기록장 (질문 7~10개)
          </p>
          <input
            className={`${inputCls} mt-2`}
            value={bonus.title}
            placeholder="기록장 이름"
            onChange={(e) =>
              set("bonus_journal_questions", { ...bonus, title: e.target.value })
            }
          />
          <textarea
            className={`${inputCls} mt-2 min-h-20 resize-y`}
            value={bonus.intro}
            placeholder="여는 글"
            onChange={(e) =>
              set("bonus_journal_questions", { ...bonus, intro: e.target.value })
            }
          />
          <div className="mt-2 flex flex-col gap-2">
            {bonus.questions.map((q, i) => (
              <div key={i} className="flex items-start gap-2">
                <input
                  className={`${inputCls} flex-1`}
                  value={q}
                  onChange={(e) => {
                    const questions = [...bonus.questions];
                    questions[i] = e.target.value;
                    set("bonus_journal_questions", { ...bonus, questions });
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const questions = bonus.questions.filter((_, x) => x !== i);
                    set("bonus_journal_questions", { ...bonus, questions });
                  }}
                  className="mt-1 shrink-0 rounded-full border border-gold-dim/40 px-2.5 py-1 text-xs text-ivory-dim hover:border-thread/60 hover:text-thread"
                  aria-label="질문 삭제"
                >
                  −
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              set("bonus_journal_questions", {
                ...bonus,
                questions: [...bonus.questions, ""],
              })
            }
            className="mt-3 rounded-full border border-gold-dim/40 px-3 py-1 text-xs text-ivory-dim hover:border-gold/60 hover:text-gold"
          >
            + 질문 추가
          </button>
        </div>

        {/* 관리자 메모 */}
        <div className={cardCls}>
          <p className="text-xs font-medium tracking-wide text-gold">
            관리자 검수 메모 (내부용 · 고객에게 노출되지 않음)
          </p>
          <textarea
            className={`${inputCls} mt-2 min-h-20 resize-y`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="검수 메모 / 수정 필요 사유"
          />
        </div>
      </div>

      {/* sticky 작업 버튼 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold-dim/20 bg-ink/95 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-5">
          {msg && (
            <p
              className={`w-full text-xs ${msg.ok ? "text-emerald-400" : "text-thread"}`}
            >
              {msg.text}
            </p>
          )}
          <button
            type="button"
            onClick={save}
            disabled={busy || approved}
            className="h-11 rounded-full border border-gold/40 px-5 text-sm text-ivory hover:border-gold disabled:opacity-40"
          >
            검수 내용 저장
          </button>
          <button
            type="button"
            onClick={revision}
            disabled={busy || approved}
            className="h-11 rounded-full border border-thread/50 px-5 text-sm text-thread hover:border-thread disabled:opacity-40"
          >
            수정 필요
          </button>
          <button
            type="button"
            onClick={approve}
            disabled={busy || approved}
            className="ml-auto h-11 rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep px-6 text-sm font-medium text-ivory active:opacity-85 disabled:opacity-40"
          >
            {approved ? "승인 완료" : busy ? "처리 중…" : "최종 승인"}
          </button>
        </div>
      </div>
    </section>
  );
}
