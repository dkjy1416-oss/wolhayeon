/**
 * 결제 완료 주문 자동 처리 오케스트레이션 (서버 전용).
 *
 *  paid 확인 → [생성: 기존 generateRitualForOrder 재사용]
 *            → [자동 승인: autoApproveResult]
 *            → [이메일: 기존 sendApprovedResultEmail 재사용]
 *            → ready + resultPath
 *
 * 각 단계는 idempotent:
 *  - generating 중이면 "processing" (새로고침/동시 요청 시 AI 중복 실행 없음 —
 *    generateRitualForOrder의 waiting/failed→generating 원자 선점이 보장)
 *  - generated + 미승인이면 승인 단계부터 이어서 실행
 *  - approved면 이메일 상태만 확인하고 ready
 *  - 이메일 실패는 결과 공개를 막지 않음 (delivery 값으로만 구분)
 */
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { generateRitualForOrder } from "@/lib/ritual-generate";
import { autoApproveResult } from "@/lib/auto-approve-result";
import { sendApprovedResultEmail } from "@/lib/result-email";

export type ProcessOutcome =
  | { status: "ready"; resultPath: string; delivery: string }
  | { status: "processing" }
  | { status: "not_paid" }
  | { status: "delayed" } // 생성 실패/관리자 개입 필요 등 — 재시도 가능
  | { status: "server_error" };

export async function processPaidOrder(
  orderNumber: string
): Promise<ProcessOutcome> {
  try {
    const supabase = getSupabaseAdmin();
    const o = await supabase
      .from("ritual_orders")
      .select("payment_status, generation_status, review_status, delivery_status")
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (o.error || !o.data) return { status: "not_paid" };
    const order = o.data;

    /* DB 기준 결제 재확인 — success URL 도착 자체는 신뢰하지 않음 */
    if (order.payment_status !== "paid") return { status: "not_paid" };

    /* 1) 생성 단계 */
    if (order.review_status !== "approved") {
      if (order.generation_status === "generating") {
        return { status: "processing" };
      }
      if (
        order.generation_status === "waiting" ||
        order.generation_status === "failed"
      ) {
        const gen = await generateRitualForOrder(orderNumber);
        if (gen.status === "already_generating") return { status: "processing" };
        if (
          gen.status !== "success" &&
          gen.status !== "already_generated"
        ) {
          console.error(`[process] generation_${gen.status}`);
          return { status: "delayed" };
        }
      }
      /* generated(방금 또는 이전) → 승인 단계로 진행 */
    }

    /* 2) 자동 승인 (이미 승인이면 그대로 통과) */
    const approve = await autoApproveResult(orderNumber);
    if (approve.status === "needs_admin") return { status: "delayed" };
    if (approve.status === "not_ready") {
      /* 생성 직후 상태 전파 지연 등 — 재요청 시 이어서 처리 */
      console.error(`[process] approve_not_ready reason=${approve.reason}`);
      return { status: "processing" };
    }
    if (approve.status === "server_error") return { status: "server_error" };

    /* 3) 이메일 — 실패해도 결과는 공개 */
    let delivery = "failed";
    try {
      const mail = await sendApprovedResultEmail(orderNumber);
      delivery = mail.status;
    } catch {
      delivery = "failed";
    }

    return {
      status: "ready",
      resultPath: `/result/${approve.token}`,
      delivery,
    };
  } catch {
    console.error("[process] server_error");
    return { status: "server_error" };
  }
}
