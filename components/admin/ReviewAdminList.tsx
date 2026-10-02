"use client";

/**
 * 후기 관리 — 등록 · 수정 · 공개/숨김 · 삭제 · 상태별 보기 · 검색
 * 실제 결제 주문번호에 연결된 후기만 등록할 수 있다.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import type { AdminReview } from "@/lib/reviews";

const LABEL: Record<string, string> = { message: "메시지", book: "책", bundle: "메시지 + 책" };
const STATUS: Record<AdminReview["status"], string> = {
  pending: "확인 전",
  approved: "공개 중",
  hidden: "숨김",
};
type Filter = "all" | AdminReview["status"];

const input =
  "w-full rounded-lg border border-gold-dim/30 bg-ink px-3 py-2 text-[0.85rem] text-ivory focus:border-gold/60 focus:outline-none";

async function post(payload: Record<string, unknown>) {
  const r = await fetch("/api/admin/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => null);
  if (!j?.ok) throw new Error(typeof j?.error === "string" ? j.error : "처리하지 못했어요.");
  return j;
}

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <span className="text-[1rem]">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={n <= value ? "text-gold" : "text-ivory-dim/30"}
          aria-label={`${n}점`}
        >
          ★
        </button>
      ))}
    </span>
  );
}

function ReviewForm({
  initial,
  withOrder,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: { order_number?: string; rating: number; body: string; display_name: string; consent_public: boolean; product: string; publish?: boolean };
  withOrder: boolean;
  submitLabel: string;
  onSubmit: (v: typeof initial) => Promise<void>;
  onCancel?: () => void;
}) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-2.5">
      {withOrder && (
        <label className="block text-[0.74rem] text-ivory-dim">
          주문번호 (결제 완료된 주문)
          <input
            className={`${input} mt-1 font-mono`}
            placeholder="WH-20261002-ABCDE"
            value={v.order_number ?? ""}
            onChange={(e) => setV({ ...v, order_number: e.target.value })}
          />
        </label>
      )}
      <div className="flex flex-wrap items-center gap-3 text-[0.74rem] text-ivory-dim">
        <span>별점</span>
        <Stars value={v.rating} onChange={(n) => setV({ ...v, rating: n })} />
        <span className="ml-2">상품</span>
        <select className="rounded-lg border border-gold-dim/30 bg-ink px-2 py-1 text-ivory" value={v.product} onChange={(e) => setV({ ...v, product: e.target.value })}>
          <option value="">주문 상품 그대로</option>
          <option value="message">메시지</option>
          <option value="book">책</option>
          <option value="bundle">메시지 + 책</option>
        </select>
      </div>
      <label className="block text-[0.74rem] text-ivory-dim">
        후기 내용 ({v.body.trim().length}/600자)
        <textarea className={`${input} mt-1 min-h-[7rem] leading-[1.8]`} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} />
      </label>
      <label className="block text-[0.74rem] text-ivory-dim">
        표시 이름 (비우면 &lsquo;익명&rsquo;, 최대 12자)
        <input className={`${input} mt-1`} value={v.display_name} onChange={(e) => setV({ ...v, display_name: e.target.value })} />
      </label>
      <label className="flex items-center gap-2 text-[0.8rem] text-ivory">
        <input type="checkbox" checked={v.consent_public} onChange={(e) => setV({ ...v, consent_public: e.target.checked })} />
        손님이 사이트 공개에 동의함
      </label>
      {withOrder && (
        <label className="flex items-center gap-2 text-[0.8rem] text-ivory">
          <input
            type="checkbox"
            checked={!!v.publish}
            disabled={!v.consent_public}
            onChange={(e) => setV({ ...v, publish: e.target.checked })}
          />
          등록과 동시에 공개
        </label>
      )}
      {err && <p className="text-xs text-thread">{err}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              await onSubmit(v);
            } catch (e) {
              setErr(e instanceof Error ? e.message : "처리하지 못했어요.");
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep px-5 py-2 text-xs text-ivory disabled:opacity-50"
        >
          {busy ? "저장 중…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-full border border-gold-dim/40 px-5 py-2 text-xs text-ivory-dim">
            취소
          </button>
        )}
      </div>
    </div>
  );
}

export default function ReviewAdminList({ initial }: { initial: AdminReview[] }) {
  const [list, setList] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return list.filter(
      (r) =>
        (filter === "all" || r.status === filter) &&
        (!k || r.body.toLowerCase().includes(k) || r.order_number.toLowerCase().includes(k) || (r.display_name ?? "").toLowerCase().includes(k))
    );
  }, [list, filter, q]);

  const act = async (id: number, action: "approve" | "hide" | "pending") => {
    setBusy(id);
    setErr(null);
    try {
      await post({ id, action });
      const status = action === "approve" ? "approved" : action === "hide" ? "hidden" : "pending";
      setList((l) => l.map((x) => (x.id === id ? { ...x, status } : x)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "바꾸지 못했어요.");
    } finally {
      setBusy(null);
    }
  };

  const del = async (id: number) => {
    setBusy(id);
    setErr(null);
    try {
      await post({ id, action: "delete" });
      setList((l) => l.filter((x) => x.id !== id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "삭제하지 못했어요.");
    } finally {
      setBusy(null);
      setConfirmDel(null);
    }
  };

  const count = (s: Filter) => (s === "all" ? list.length : list.filter((x) => x.status === s).length);

  return (
    <div className="space-y-4">
      {/* 등록 */}
      <div className="rounded-xl border border-gold/35 bg-ink-soft px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="text-[0.86rem] text-gold">후기 직접 등록</p>
          <button type="button" onClick={() => setAdding((v) => !v)} className="rounded-full border border-gold/50 px-4 py-1.5 text-xs text-gold">
            {adding ? "닫기" : "+ 새 후기 등록"}
          </button>
        </div>
        <p className="mt-1 text-[0.72rem] leading-relaxed text-ivory-dim">
          카카오톡·메일 등으로 받은 <b className="text-ivory">실제 손님 후기</b>를 그 손님의 결제 주문번호와 함께 등록해요. 공개는 손님이 동의한 경우에만 할 수 있어요.
        </p>
        {adding && (
          <div className="mt-4">
            <ReviewForm
              withOrder
              submitLabel="등록"
              initial={{ order_number: "", rating: 5, body: "", display_name: "", consent_public: false, product: "", publish: false }}
              onSubmit={async (v) => {
                const j = await post({
                  action: "create",
                  order_number: v.order_number,
                  rating: v.rating,
                  body: v.body,
                  display_name: v.display_name,
                  consent_public: v.consent_public,
                  product: v.product || undefined,
                  status: v.publish ? "approved" : "pending",
                });
                setList((l) => [j.review as AdminReview, ...l]);
                setAdding(false);
              }}
            />
          </div>
        )}
      </div>

      {/* 필터 · 검색 */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "pending", "approved", "hidden"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs ${filter === f ? "bg-gold/15 text-gold" : "border border-gold-dim/30 text-ivory-dim"}`}
          >
            {f === "all" ? "전체" : STATUS[f]} {count(f)}
          </button>
        ))}
        <input
          className="ml-auto w-full rounded-full border border-gold-dim/30 bg-ink px-4 py-1.5 text-xs text-ivory sm:w-56"
          placeholder="내용·주문번호·이름 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {err && <p className="text-xs text-thread">{err}</p>}

      {shown.length === 0 ? (
        <p className="rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-6 text-sm text-ivory-dim">
          {list.length === 0 ? "아직 후기가 없어요. 손님이 남기거나 위에서 직접 등록하면 여기에 쌓여요." : "조건에 맞는 후기가 없어요."}
        </p>
      ) : (
        shown.map((r) => (
          <div key={r.id} className="rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.76rem] text-ivory-dim">
              <Stars value={r.rating} />
              <span>{r.display_name?.trim() || "익명"}</span>
              <span>{LABEL[r.product] ?? r.product}</span>
              <Link href={`/admin/orders/${r.order_number}`} className="underline underline-offset-2">
                {r.order_number}
              </Link>
              <span>{new Date(r.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  r.status === "approved" ? "bg-gold/15 text-gold" : r.status === "hidden" ? "bg-ink text-ivory-dim" : "bg-thread/15 text-thread"
                }`}
              >
                {STATUS[r.status]}
              </span>
              {!r.consent_public && <span className="text-thread">공개 동의 안 함 (공개 불가)</span>}
            </div>

            {editing === r.id ? (
              <div className="mt-3">
                <ReviewForm
                  withOrder={false}
                  submitLabel="수정 저장"
                  initial={{ rating: r.rating, body: r.body, display_name: r.display_name ?? "", consent_public: r.consent_public, product: r.product }}
                  onCancel={() => setEditing(null)}
                  onSubmit={async (v) => {
                    await post({
                      id: r.id,
                      action: "update",
                      rating: v.rating,
                      body: v.body,
                      display_name: v.display_name,
                      consent_public: v.consent_public,
                      product: v.product || undefined,
                    });
                    setList((l) =>
                      l.map((x) =>
                        x.id === r.id
                          ? {
                              ...x,
                              rating: v.rating,
                              body: v.body.trim(),
                              display_name: v.display_name.trim() || null,
                              consent_public: v.consent_public,
                              product: v.product || x.product,
                              status: v.consent_public ? x.status : "pending",
                            }
                          : x
                      )
                    );
                    setEditing(null);
                  }}
                />
              </div>
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-[0.88rem] leading-[1.85] text-ivory">{r.body}</p>
            )}

            {editing !== r.id && (
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== "approved" && r.consent_public && (
                  <button type="button" disabled={busy === r.id} onClick={() => act(r.id, "approve")} className="rounded-full border border-gold/50 px-4 py-1.5 text-xs text-gold disabled:opacity-50">
                    공개
                  </button>
                )}
                {r.status !== "hidden" && (
                  <button type="button" disabled={busy === r.id} onClick={() => act(r.id, "hide")} className="rounded-full border border-gold-dim/40 px-4 py-1.5 text-xs text-ivory-dim disabled:opacity-50">
                    숨김
                  </button>
                )}
                <button type="button" onClick={() => setEditing(r.id)} className="rounded-full border border-gold-dim/40 px-4 py-1.5 text-xs text-ivory">
                  수정
                </button>
                {confirmDel === r.id ? (
                  <>
                    <button type="button" disabled={busy === r.id} onClick={() => del(r.id)} className="rounded-full bg-thread px-4 py-1.5 text-xs text-ivory disabled:opacity-50">
                      정말 삭제
                    </button>
                    <button type="button" onClick={() => setConfirmDel(null)} className="rounded-full border border-gold-dim/40 px-4 py-1.5 text-xs text-ivory-dim">
                      취소
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirmDel(r.id)} className="rounded-full border border-thread/40 px-4 py-1.5 text-xs text-thread">
                    삭제
                  </button>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
