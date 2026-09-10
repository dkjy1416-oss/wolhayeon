/**
 * CS 자동화 서버 액션 계층 (서버 전용).
 *
 * 원칙:
 * - AI는 여기 결과(안전 요약)만 전달받아 설명한다. 추측 금지.
 * - 주문 enumeration 방지: 주문 찾기는 존재 여부를 노출하지 않고
 *   "일치하면 인증번호 발송"으로만 응답한다.
 * - OTP: hash 저장·10분 만료·실패 5회 잠금·60초 재발송 쿨다운.
 * - 결과 링크/상태는 OTP 통과 후 발급되는 CS 토큰 세션에서만.
 */
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { RitualOrderRow } from "@/lib/supabase/types";
import {
  createCsToken,
  verifyCsToken,
  generateOtp,
  hashOtp,
  verifyOtpHash,
} from "@/lib/cs-auth";
import { evaluateRefund, refundReasonMessage } from "@/lib/refund-policy";
import { cancelTossPayment } from "@/lib/toss-cancel";
import { sendApprovedResultEmail } from "@/lib/result-email";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_RESEND_COOLDOWN_MS = 2 * 60 * 1000;

/* ---------------- 공통 ---------------- */

async function logAction(
  orderId: string | null,
  action_type: string,
  status: string,
  detail?: string,
  idempotency_key?: string
) {
  try {
    await getSupabaseAdmin().from("cs_actions").insert({
      order_id: orderId,
      action_type,
      status,
      detail: detail ?? null,
      idempotency_key: idempotency_key ?? null,
    });
  } catch {
    /* 로그 실패는 액션을 막지 않음 */
  }
}

export async function createIncident(
  orderId: string | null,
  kind: string,
  detail: string
) {
  try {
    await getSupabaseAdmin()
      .from("cs_incidents")
      .insert({ order_id: orderId, kind, detail });
  } catch {
    /* noop */
  }
}

function normEmail(v: string): string {
  return v.trim().toLowerCase();
}

async function findOrderByIdentity(
  name: string,
  birthYear: number,
  email: string
): Promise<RitualOrderRow | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("ritual_orders")
    .select("*")
    .eq("applicant_name", name.trim())
    .eq("applicant_birth_year", birthYear)
    .order("created_at", { ascending: false })
    .limit(10);
  const rows = (data ?? []) as RitualOrderRow[];
  return (
    rows.find((r) => normEmail(r.email ?? "") === normEmail(email)) ?? null
  );
}

async function getOrderByNumber(
  orderNumber: string
): Promise<RitualOrderRow | null> {
  const { data } = await getSupabaseAdmin()
    .from("ritual_orders")
    .select("*")
    .eq("order_number", orderNumber)
    .maybeSingle();
  return (data as RitualOrderRow | null) ?? null;
}

async function sendOtpEmail(to: string, otp: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `월하연 月下緣 <${from}>`,
        to: [to],
        subject: `[월하연] 본인확인 인증번호 ${otp}`,
        text: `월하연 본인확인 인증번호는 ${otp} 입니다.\n10분 안에 입력해주세요.\n본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ---------------- 1) 주문 찾기 → OTP 발송 ---------------- */

export async function startOrderVerification(input: {
  name: string;
  birthYear: number;
  email: string;
}): Promise<{ status: "sent_if_match" }> {
  const order = await findOrderByIdentity(
    input.name,
    input.birthYear,
    input.email
  );
  /* enumeration 방지: 일치 여부와 무관하게 동일 응답 */
  if (!order) return { status: "sent_if_match" };

  const supabase = getSupabaseAdmin();
  /* 재발송 쿨다운 */
  const { data: recent } = await supabase
    .from("cs_verifications")
    .select("created_at")
    .eq("order_id", order.id)
    .eq("purpose", "order_access")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (
    recent?.created_at &&
    Date.now() - Date.parse(recent.created_at) < OTP_RESEND_COOLDOWN_MS
  ) {
    return { status: "sent_if_match" };
  }

  const otp = generateOtp();
  const { data: row } = await supabase
    .from("cs_verifications")
    .insert({
      order_id: order.id,
      email: normEmail(order.email ?? ""),
      purpose: "order_access",
      otp_hash: "pending",
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    })
    .select("id")
    .single();
  if (!row?.id) return { status: "sent_if_match" };
  const hash = hashOtp(row.id, otp);
  if (!hash) return { status: "sent_if_match" };
  const hashSave = await supabase
    .from("cs_verifications")
    .update({ otp_hash: hash })
    .eq("id", row.id);
  if (hashSave.error) return { status: "sent_if_match" };
  const sent = await sendOtpEmail(order.email ?? "", otp);
  if (!sent) await createIncident(order.id, "otp_email_failed", "order_access");
  await logAction(order.id, "ORDER_LOOKUP", sent ? "otp_sent" : "otp_send_failed");
  return { status: "sent_if_match" };
}

/* ---------------- 2) OTP 확인 → CS 세션 ---------------- */

export async function confirmOrderVerification(input: {
  name: string;
  birthYear: number;
  email: string;
  otp: string;
}): Promise<
  | { status: "verified"; csToken: string; orderNumber: string }
  | { status: "invalid" | "expired" | "locked" }
> {
  const order = await findOrderByIdentity(
    input.name,
    input.birthYear,
    input.email
  );
  if (!order) return { status: "invalid" };
  const supabase = getSupabaseAdmin();
  const { data: v } = await supabase
    .from("cs_verifications")
    .select("*")
    .eq("order_id", order.id)
    .eq("purpose", "order_access")
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!v) return { status: "invalid" };
  if (v.attempts >= OTP_MAX_ATTEMPTS) return { status: "locked" };
  if (Date.parse(v.expires_at) < Date.now()) return { status: "expired" };
  if (!verifyOtpHash(v.id, input.otp.trim(), v.otp_hash)) {
    await supabase
      .from("cs_verifications")
      .update({ attempts: v.attempts + 1 })
      .eq("id", v.id);
    return v.attempts + 1 >= OTP_MAX_ATTEMPTS
      ? { status: "locked" }
      : { status: "invalid" };
  }
  await supabase
    .from("cs_verifications")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", v.id);
  const csToken = createCsToken(order.order_number);
  if (!csToken) return { status: "invalid" };
  return { status: "verified", csToken, orderNumber: order.order_number };
}

/* ---------------- 3) 인증 세션 공용 로더 ---------------- */

export async function loadCsOrder(
  orderNumber: string,
  csToken: string | null | undefined
): Promise<RitualOrderRow | null> {
  if (!/^WH-\d{8}-[A-Z0-9]{5}$/.test(orderNumber)) return null;
  if (!verifyCsToken(orderNumber, csToken)) return null;
  return getOrderByNumber(orderNumber);
}

/* ---------------- 4) 안전 상태 요약 ---------------- */

export interface CsStatus {
  payment: "paid" | "pending" | "failed" | "refunded";
  generation: "ready" | "generating" | "failed" | "waiting";
  delivery: "sent" | "waiting" | "failed" | "sending";
  resultPath: string | null;
}

export async function getCsStatus(order: RitualOrderRow): Promise<CsStatus> {
  const supabase = getSupabaseAdmin();
  let resultPath: string | null = null;
  if (
    order.payment_status === "paid" &&
    order.generation_status === "generated"
  ) {
    const { data: r } = await supabase
      .from("ritual_results")
      .select("result_token, reviewed_content, approved_at")
      .eq("order_id", order.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (r?.result_token && r.reviewed_content && r.approved_at) {
      resultPath = `/result/${r.result_token}`;
    }
  }
  const generation: CsStatus["generation"] =
    resultPath
      ? "ready"
      : order.generation_status === "generating"
        ? "generating"
        : order.generation_status === "failed"
          ? "failed"
          : "waiting";
  return {
    payment: (order.payment_status as CsStatus["payment"]) ?? "pending",
    generation,
    delivery: (order.delivery_status as CsStatus["delivery"]) ?? "waiting",
    resultPath,
  };
}

/* ---------------- 5) 액션들 ---------------- */

export async function actionResendResultEmail(
  order: RitualOrderRow
): Promise<{ ok: boolean; code: string }> {
  const supabase = getSupabaseAdmin();
  const { data: last } = await supabase
    .from("cs_actions")
    .select("created_at")
    .eq("order_id", order.id)
    .eq("action_type", "EMAIL_RESEND")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (
    last?.created_at &&
    Date.now() - Date.parse(last.created_at) < EMAIL_RESEND_COOLDOWN_MS
  ) {
    return { ok: false, code: "cooldown" };
  }
  /* 재발송을 위해 sent → waiting으로 되돌린 뒤 기존 발송 파이프라인 재사용 */
  if (order.delivery_status === "sent") {
    await supabase
      .from("ritual_orders")
      .update({ delivery_status: "waiting" })
      .eq("id", order.id)
      .eq("delivery_status", "sent");
  }
  try {
    const r = await sendApprovedResultEmail(order.order_number);
    const ok = r.status === "sent";
    await logAction(order.id, "EMAIL_RESEND", ok ? "sent" : `failed_${r.status}`);
    if (!ok) await createIncident(order.id, "email_resend_failed", r.status);
    return { ok, code: r.status };
  } catch {
    await logAction(order.id, "EMAIL_RESEND", "error");
    await createIncident(order.id, "email_resend_failed", "exception");
    return { ok: false, code: "error" };
  }
}

export async function startEmailChange(
  order: RitualOrderRow,
  newEmail: string
): Promise<{ ok: boolean; code: string }> {
  const email = normEmail(newEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, code: "invalid_email" };
  }
  const supabase = getSupabaseAdmin();
  const { data: recent } = await supabase
    .from("cs_verifications")
    .select("created_at")
    .eq("order_id", order.id)
    .eq("purpose", "email_change_new")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent?.created_at && Date.now() - Date.parse(recent.created_at) < OTP_RESEND_COOLDOWN_MS) return { ok: false, code: "cooldown" };
  const otp = generateOtp();
  const { data: row } = await supabase
    .from("cs_verifications")
    .insert({
      order_id: order.id,
      email,
      purpose: "email_change_new",
      new_email: email,
      otp_hash: "pending",
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    })
    .select("id")
    .single();
  if (!row?.id) return { ok: false, code: "db_error" };
  const hash = hashOtp(row.id, otp);
  if (!hash) return { ok: false, code: "no_secret" };
  const hashSave = await supabase
    .from("cs_verifications")
    .update({ otp_hash: hash })
    .eq("id", row.id);
  if (hashSave.error) return { ok: false, code: "db_error" };
  const sent = await sendOtpEmail(email, otp);
  await logAction(order.id, "EMAIL_CHANGE", sent ? "otp_sent" : "otp_failed");
  return sent ? { ok: true, code: "sent" } : { ok: false, code: "send_failed" };
}

export async function confirmEmailChange(
  order: RitualOrderRow,
  otp: string
): Promise<{ ok: boolean; code: string }> {
  const supabase = getSupabaseAdmin();
  const { data: v } = await supabase
    .from("cs_verifications")
    .select("*")
    .eq("order_id", order.id)
    .eq("purpose", "email_change_new")
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!v) return { ok: false, code: "invalid" };
  if (v.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, code: "locked" };
  if (Date.parse(v.expires_at) < Date.now())
    return { ok: false, code: "expired" };
  if (!verifyOtpHash(v.id, otp.trim(), v.otp_hash)) {
    await supabase
      .from("cs_verifications")
      .update({ attempts: v.attempts + 1 })
      .eq("id", v.id);
    return { ok: false, code: "invalid" };
  }
  await supabase
    .from("cs_verifications")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", v.id);
  await supabase
    .from("ritual_orders")
    .update({ email: v.new_email })
    .eq("id", order.id);
  await logAction(order.id, "EMAIL_CHANGE", "changed");
  return { ok: true, code: "changed" };
}

/* ---------------- 6) 환불 ---------------- */

async function isDuplicatePayment(_order: RitualOrderRow): Promise<boolean> {
  // 서로 다른 주문은 이름/이메일/시간만으로 자동 중복판정하지 않는다.
  return false;
}

export async function actionCheckRefund(order: RitualOrderRow) {
  const dup = await isDuplicatePayment(order);
  const evaln = evaluateRefund(order, { isDuplicatePayment: dup });
  await logAction(order.id, "REFUND_CHECK", evaln.reason_code);
  return { ...evaln, message: refundReasonMessage(evaln.reason_code) };
}

export async function actionExecuteRefund(
  order: RitualOrderRow
): Promise<{ ok: boolean; reason_code: string; message: string }> {
  if (process.env.CS_AUTO_REFUND_ENABLED?.trim() !== "true") {
    return { ok: false, reason_code: "POLICY_NOT_ACTIVATED", message: "환불 가능 여부는 확인할 수 있지만, 자동 결제 취소 기능은 아직 최종 정책 확인 전이라 잠겨 있어요." };
  }
  const dup = await isDuplicatePayment(order);
  const evaln = evaluateRefund(order, { isDuplicatePayment: dup });
  if (!evaln.eligible) {
    return {
      ok: false,
      reason_code: evaln.reason_code,
      message: refundReasonMessage(evaln.reason_code),
    };
  }
  if (!order.payment_key) {
    await createIncident(order.id, "refund_no_payment_key", evaln.reason_code);
    return {
      ok: false,
      reason_code: "SYSTEM",
      message:
        "자동 환불 처리가 완료되지 않았어요. 기록은 남겨두었고, 잠시 후 다시 확인하면 현재 상태를 다시 조회해드릴게요.",
    };
  }
  const idem = `cs-refund-${order.order_number}`;
  /* DB 차원 이중 방어: 같은 idempotency 액션이 성공 기록되어 있으면 재호출 안 함 */
  const { data: prev } = await getSupabaseAdmin()
    .from("cs_actions")
    .select("id, status")
    .eq("idempotency_key", idem)
    .maybeSingle();
  if (prev?.status === "refunded") {
    return {
      ok: true,
      reason_code: "ALREADY_REFUNDED",
      message: refundReasonMessage("ALREADY_REFUNDED"),
    };
  }
  const cancel = await cancelTossPayment(
    order.payment_key,
    `월하연 자동환불(${evaln.reason_code})`,
    idem
  );
  if (!cancel.ok) {
    await createIncident(order.id, "refund_toss_failed", cancel.code);
    await logAction(order.id, "REFUND_EXECUTE", `failed_${cancel.code}`);
    return {
      ok: false,
      reason_code: "SYSTEM",
      message:
        "결제 취소 요청이 바로 완료되지 않았어요. 중복 취소되지 않도록 기록은 남겨두었고, 잠시 후 다시 확인하면 결제 상태를 다시 조회해드릴게요.",
    };
  }
  await getSupabaseAdmin()
    .from("ritual_orders")
    .update({
      payment_status: "refunded",
      refunded_at: new Date().toISOString(),
      refund_reason: evaln.reason_code,
    })
    .eq("id", order.id)
    .eq("payment_status", "paid");
  await logAction(
    order.id,
    dup ? "DUPLICATE_PAYMENT_REFUND" : "REFUND_EXECUTE",
    "refunded",
    evaln.reason_code,
    idem
  );
  /* 환불 완료 안내 메일 (실패해도 환불은 완료 상태) */
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (from && apiKey && order.email) {
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `월하연 月下緣 <${from}>`,
        to: [order.email],
        subject: "[월하연] 결제 환불이 완료되었습니다",
        text: `주문(${order.order_number})의 결제 취소가 완료되었습니다.\n카드사·결제수단에 따라 실제 반영까지 영업일 기준 3~7일이 걸릴 수 있습니다.`,
      }),
    }).catch(() => {});
  }
  return {
    ok: true,
    reason_code: evaln.reason_code,
    message:
      evaln.reason_code === "DUPLICATE_PAYMENT"
        ? "중복 결제가 확인되어 한 건을 취소했어요. 카드사 반영까지는 결제수단에 따라 시간이 조금 걸릴 수 있어요."
        : "확인해보니 환불 가능한 상태라, 결제 취소를 처리했어요. 카드사 반영까지는 결제수단에 따라 시간이 조금 걸릴 수 있어요.",
  };
}
