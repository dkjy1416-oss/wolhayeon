import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
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
  SAFETY_CONCERN_OPTIONS,
  optionLabel,
} from "@/lib/ritual-types";
import type { RitualOrderRow } from "@/lib/supabase/types";
import ReviewEditor from "@/components/admin/ReviewEditor";

export const dynamic = "force-dynamic";

const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

function Field({ label, value }: { label: string; value: string }) {
  const empty = !value || value.trim() === "";
  return (
    <div className="py-2">
      <dt className="text-[0.68rem] tracking-wide text-gold/80">{label}</dt>
      <dd
        className={`mt-0.5 whitespace-pre-wrap text-[0.85rem] leading-relaxed ${
          empty ? "text-ivory-dim/40" : "text-ivory"
        }`}
      >
        {empty ? "작성하지 않음" : value}
      </dd>
    </div>
  );
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const { orderNumber } = await params;
  if (!ORDER_NUMBER_RE.test(orderNumber)) redirect("/admin/orders");

  let order: (RitualOrderRow & { id: string }) | null = null;
  let result: {
    result_version: number;
    generated_content: unknown;
    reviewed_content: unknown;
    review_notes: string;
    generated_at: string | null;
    approved_at: string | null;
  } | null = null;

  try {
    const supabase = getSupabaseAdmin();
    const o = await supabase
      .from("ritual_orders")
      .select("*")
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (!o.error && o.data) order = o.data;

    if (order) {
      const r = await supabase
        .from("ritual_results")
        .select(
          "result_version, generated_content, reviewed_content, review_notes, generated_at, approved_at"
        )
        .eq("order_id", order.id)
        .order("result_version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!r.error && r.data) result = r.data;
    }
  } catch {
    order = null;
  }

  if (!order) {
    return (
      <main className="flex min-h-[100svh] flex-col items-center justify-center px-6">
        <p className="text-sm text-ivory-dim">주문을 찾을 수 없습니다.</p>
        <Link href="/admin/orders" className="mt-6 text-xs text-gold underline underline-offset-4">
          목록으로
        </Link>
      </main>
    );
  }

  const safetyRisky = order.safety_concerns.filter(
    (v) => v !== "none" && v !== "prefer_not_to_say"
  );

  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-5xl px-5 pb-40 pt-8">
      <Link href="/admin/orders" className="text-xs text-ivory-dim hover:text-gold">
        ← 주문 목록
      </Link>

      {/* 상단 요약 */}
      <div className="mt-4 rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="font-display text-lg tracking-wider text-gold">
            {order.order_number}
          </span>
          <span className="text-xs text-ivory-dim">
            결제: <b className="text-ivory">{order.payment_status}</b>
          </span>
          <span className="text-xs text-ivory-dim">
            생성: <b className="text-ivory">{order.generation_status}</b>
          </span>
          <span className="text-xs text-ivory-dim">
            검수: <b className="text-ivory">{order.review_status}</b>
          </span>
          {result && (
            <>
              <span className="text-xs text-ivory-dim">
                버전: <b className="text-ivory">v{result.result_version}</b>
              </span>
              {result.generated_at && (
                <span className="text-xs text-ivory-dim">
                  생성 시각:{" "}
                  {new Date(result.generated_at).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul",
                  })}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* 안전 경고 */}
      {safetyRisky.length > 0 && (
        <div className="mt-4 rounded-xl border border-thread/60 bg-thread/10 px-5 py-4">
          <p className="text-xs font-medium tracking-wide text-thread">
            ⚠ 안전/경계 응답 확인 필요
          </p>
          <p className="mt-1.5 text-[0.85rem] leading-relaxed text-ivory">
            {safetyRisky
              .map((v) => optionLabel(SAFETY_CONCERN_OPTIONS, v))
              .join(", ")}
            {order.safety_concerns_other &&
              ` / 직접 작성: ${order.safety_concerns_other}`}
          </p>
        </div>
      )}

      {/* A. 신청서 원문 */}
      <details className="mt-4 rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4" open>
        <summary className="cursor-pointer text-sm font-medium text-ivory">
          신청서 원문
        </summary>
        <dl className="mt-3 grid grid-cols-1 gap-x-8 divide-y divide-gold-dim/10 sm:grid-cols-2 sm:divide-y-0">
          <Field label="신청자 이름" value={order.applicant_name} />
          <Field label="상대 이름" value={order.partner_name} />
          <Field
            label="현재 관계"
            value={
              order.relationship_type === "other"
                ? `기타 — ${order.relationship_type_other}`
                : optionLabel(RELATIONSHIP_TYPE_OPTIONS, order.relationship_type)
            }
          />
          <Field
            label="관계 기간"
            value={optionLabel(RELATIONSHIP_DURATION_OPTIONS, order.relationship_duration)}
          />
          <Field
            label="이별 후 경과"
            value={optionLabel(BREAKUP_ELAPSED_OPTIONS, order.breakup_elapsed)}
          />
          <Field
            label="먼저 이야기한 사람"
            value={optionLabel(BREAKUP_INITIATOR_OPTIONS, order.breakup_initiator)}
          />
          <Field
            label="마지막 대화"
            value={optionLabel(LAST_CONVERSATION_OPTIONS, order.last_conversation)}
          />
          <Field
            label="연락 상태"
            value={optionLabel(CONTACT_STATUS_OPTIONS, order.contact_status)}
          />
          <Field
            label="상대의 새로운 연인"
            value={optionLabel(PARTNER_NEW_RELATIONSHIP_OPTIONS, order.partner_new_relationship)}
          />
          <Field
            label="가장 힘든 것"
            value={order.pain_points.map((v) => optionLabel(PAIN_POINT_OPTIONS, v)).join(", ")}
          />
          <Field label="가장 바라는 것" value={optionLabel(MAIN_WISH_OPTIONS, order.main_wish)} />
          <Field
            label="현재 감정"
            value={optionLabel(CURRENT_EMOTION_OPTIONS, order.current_emotion)}
          />
          <Field
            label="안전/경계 확인"
            value={
              order.safety_concerns
                .map((v) => optionLabel(SAFETY_CONCERN_OPTIONS, v))
                .join(", ") +
              (order.safety_concerns_other
                ? ` / 직접 작성: ${order.safety_concerns_other}`
                : "")
            }
          />
        </dl>
        <dl className="mt-2 border-t border-gold-dim/15 pt-2">
          <Field label="상세 사연" value={order.story} />
          <Field label="기억에 남은 대화" value={order.last_conversation_memory} />
          <Field label="듣고 싶은 말" value={order.wish_sentence} />
          <Field label="원하는 변화" value={order.desired_change} />
        </dl>
      </details>

      {/* B. AI 결과 검수 */}
      {!result ? (
        <p className="mt-10 text-center text-sm text-ivory-dim">
          아직 생성된 결과가 없습니다.
        </p>
      ) : (
        <ReviewEditor
          orderNumber={order.order_number}
          resultVersion={result.result_version}
          /* 편집 시작값: reviewed_content ?? generated_content (AI 원본은 보존) */
          initialContent={
            (result.reviewed_content ?? result.generated_content) as Record<
              string,
              unknown
            >
          }
          initialNotes={result.review_notes}
          initiallyApproved={
            order.review_status === "approved" && !!result.approved_at
          }
        />
      )}
    </main>
  );
}
