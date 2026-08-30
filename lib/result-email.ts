/**
 * 승인된 고객 결과 이메일 발송 (서버 전용).
 *
 * - RESEND_API_KEY / RESEND_FROM_EMAIL / SITE_URL 은 서버에서만 읽음.
 *   하나라도 없거나 형식이 틀리면 발송하지 않음 (fail-closed).
 * - 클라이언트 상태를 신뢰하지 않고 DB를 다시 조회해 발송 조건 재확인.
 * - 고객 제공본은 reviewed_content 하나뿐 (generated_content 사용 금지).
 * - delivery_status 조건부 UPDATE(waiting/failed → sending)로 원자적 선점,
 *   같은 승인 결과에는 항상 같은 Resend idempotencyKey 사용 → 중복 방지.
 * - 로그에는 안전한 코드만 (token/이메일/사연/본문 출력 금지).
 */
import "server-only";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { RitualResultSchema } from "@/lib/ritual-result-schema";
import { isValidEmail } from "@/lib/ritual-types";
import {
  deliveryEligibility,
  sanitizeSiteUrl,
  buildResultUrl,
  buildIdempotencyKey,
  normalizeResendError,
} from "@/lib/delivery-rules";

export type DeliveryOutcome =
  | "sent"
  | "already_sent"
  | "sending_in_progress"
  | "not_eligible"
  | "invalid_recipient"
  | "failed"
  | "config_missing"
  | "server_error";

/** HTML 삽입용 escape (이름 등 사용자 입력 값) */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 이메일 본문 생성 — 이름/링크/짧은 안내만 (사연·결과 내용·token 별도 표기 없음) */
function buildEmail(name: string, resultUrl: string) {
  /* 제목·plain text는 HTML로 렌더되지 않으므로 원문 이름 사용,
     HTML 본문에 삽입되는 위치는 전부 escapedName 사용 */
  const escapedName = escapeHtml(name);
  const subject = `[월하연] ${name}님을 위한 월화의 리추얼이 도착했습니다`;

  const text = [
    `${name}님,`,
    ``,
    `월화가 당신의 이야기를 천천히 읽고`,
    `개인 리추얼을 준비했습니다.`,
    ``,
    `아래 링크에서 결과를 확인하실 수 있습니다.`,
    resultUrl,
    ``,
    `이 링크는 ${name}님만을 위한 개인 결과로 연결됩니다.`,
    `다른 사람에게 전달하지 않는 것을 권합니다.`,
    ``,
    `月下緣 월하연`,
    `붉은 인연의 실 리추얼`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="ko">
<body style="margin:0;padding:0;background-color:#0d0d0f;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0d0f;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#16110f;border:1px solid #3a2f22;border-radius:16px;padding:40px 28px;">
        <tr><td align="center" style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
          <p style="margin:0;font-size:11px;letter-spacing:6px;color:#c9a96a;">월하연 月下緣</p>
          <p style="margin:10px 0 0;font-size:10px;letter-spacing:3px;color:#b81e2d;">붉은 인연의 실 리추얼</p>
          <div style="width:48px;height:1px;background-color:#c9a96a;opacity:0.5;margin:28px auto;"></div>
          <p style="margin:0;font-size:18px;font-weight:600;line-height:1.6;color:#e8ddc8;">
            ${escapedName}님을 위한<br/>월화의 리추얼이 도착했습니다
          </p>
          <p style="margin:22px 0 0;font-size:14px;font-weight:300;line-height:2;color:#b8ab93;">
            ${escapedName}님,<br/>
            월화가 당신의 이야기를 천천히 읽고<br/>
            개인 리추얼을 준비했습니다.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px auto 0;">
            <tr><td style="border-radius:999px;background-color:#6e1c26;border:1px solid rgba(201,169,106,0.4);">
              <a href="${resultUrl}" target="_blank"
                 style="display:inline-block;padding:15px 34px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:14px;color:#e8ddc8;text-decoration:none;">
                나의 리추얼 열어보기
              </a>
            </td></tr>
          </table>
          <p style="margin:28px 0 0;font-size:11px;line-height:1.9;color:#7d735f;">
            이 링크는 ${escapedName}님만을 위한 개인 결과로 연결됩니다.<br/>
            다른 사람에게 전달하지 않는 것을 권합니다.
          </p>
          <div style="width:24px;height:1px;background-color:#b81e2d;opacity:0.6;margin:30px auto 0;"></div>
          <p style="margin:24px 0 0;font-size:10px;letter-spacing:4px;color:#8a7a5c;">月下緣</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

export async function sendApprovedResultEmail(
  orderNumber: string
): Promise<{ status: DeliveryOutcome; errorCode?: string }> {
  /* 환경변수 fail-closed */
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const siteUrl = sanitizeSiteUrl(process.env.SITE_URL);
  if (!apiKey || !fromEmail || !isValidEmail(fromEmail) || !siteUrl) {
    console.error("[delivery] config_missing");
    return { status: "config_missing" };
  }

  try {
    const supabase = getSupabaseAdmin();

    /* DB에서 발송 조건 전부 재확인 */
    const o = await supabase
      .from("ritual_orders")
      .select(
        "id, applicant_name, email, payment_status, generation_status, review_status, delivery_status, delivery_attempt_count"
      )
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (o.error || !o.data) return { status: "not_eligible" };
    const order = o.data;

    const r = await supabase
      .from("ritual_results")
      .select("id, result_version, approved_at, reviewed_content, result_token")
      .eq("order_id", order.id)
      .order("result_version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (r.error || !r.data) return { status: "not_eligible" };
    const result = r.data;

    if (deliveryEligibility(order, result) !== "ok") {
      return { status: "not_eligible" };
    }

    /* 고객 제공본 재검증 — reviewed_content만, fallback 금지 */
    const parsed = RitualResultSchema.safeParse(result.reviewed_content);
    if (!parsed.success) {
      console.error("[delivery] reviewed_content_invalid");
      return { status: "not_eligible" };
    }

    /* 발송 상태 확인: sent면 절대 재발송 안 함 */
    if (order.delivery_status === "sent") return { status: "already_sent" };
    if (order.delivery_status === "sending")
      return { status: "sending_in_progress" };

    /* 원자적 선점: waiting/failed → sending (동시 요청 중 한쪽만 성공) */
    const claim = await supabase
      .from("ritual_orders")
      .update({
        delivery_status: "sending",
        delivery_attempted_at: new Date().toISOString(),
        delivery_error_code: null,
        delivery_to_email: order.email,
        delivery_attempt_count: (order.delivery_attempt_count ?? 0) + 1,
      })
      .eq("id", order.id)
      .in("delivery_status", ["waiting", "failed"])
      .select("id")
      .maybeSingle();
    if (claim.error) {
      console.error(`[delivery] claim_error code=${claim.error.code}`);
      return { status: "server_error" };
    }
    if (!claim.data) {
      /* 다른 요청이 먼저 선점/발송 완료 */
      const probe = await supabase
        .from("ritual_orders")
        .select("delivery_status")
        .eq("id", order.id)
        .maybeSingle();
      if (probe.data?.delivery_status === "sent")
        return { status: "already_sent" };
      return { status: "sending_in_progress" };
    }

    /* 수신 주소 검증 — 실패 시 Resend 호출 없이 failed 처리.
       (Resend를 아직 호출하지 않았으므로 실제 발송은 일어나지 않은 상태) */
    if (!isValidEmail(order.email)) {
      const failUpd = await supabase
        .from("ritual_orders")
        .update({
          delivery_status: "failed",
          delivery_error_code: "invalid_recipient",
          delivery_email_id: null,
          delivered_at: null,
        })
        .eq("id", order.id)
        .eq("delivery_status", "sending");
      if (failUpd.error) {
        /* DB가 sending에 남아 있을 수 있음 — failed로 확정 반환하지 않음 */
        console.error("[delivery] delivery_failure_finalize_failed");
        return {
          status: "sending_in_progress",
          errorCode: "delivery_failure_finalize_failed",
        };
      }
      return { status: "invalid_recipient", errorCode: "invalid_recipient" };
    }

    /* Resend 발송 — 결과 링크는 SITE_URL 기반, 추적/UTM/token 별도 전송 없음 */
    const resultUrl = buildResultUrl(siteUrl, result.result_token as string);
    const { subject, text, html } = buildEmail(
      order.applicant_name,
      resultUrl
    );

    let emailId: string | null = null;
    let failCode: string | null = null;
    try {
      const resend = new Resend(apiKey);
      const sendRes = await resend.emails.send(
        {
          from: `월화 <${fromEmail}>`,
          to: order.email,
          subject,
          html,
          text,
        },
        {
          /* 같은 승인 결과에는 항상 같은 키 — 네트워크 재시도 중복 방지 */
          idempotencyKey: buildIdempotencyKey(result.id, result.result_version),
        }
      );
      if (sendRes.error) {
        const statusCode =
          typeof (sendRes.error as { statusCode?: number }).statusCode ===
          "number"
            ? (sendRes.error as { statusCode: number }).statusCode
            : 400;
        failCode = normalizeResendError(statusCode);
      } else {
        emailId = sendRes.data?.id ?? null;
        if (!emailId) failCode = "delivery_unknown_error";
      }
    } catch {
      failCode = normalizeResendError(null);
    }

    if (failCode) {
      /* Resend가 발송을 접수하지 않은 것이 명확한 경우에만 이 경로로 옴 */
      const failUpd = await supabase
        .from("ritual_orders")
        .update({
          delivery_status: "failed",
          delivery_error_code: failCode,
          delivery_email_id: null,
          delivered_at: null,
        })
        .eq("id", order.id)
        .eq("delivery_status", "sending");
      console.error(`[delivery] send_failed code=${failCode}`);
      if (failUpd.error) {
        /* 실패 기록조차 실패 — DB가 sending에 남을 수 있으므로
           failed로 확정 반환하지 않음. 안전 코드만 로그 */
        console.error("[delivery] delivery_failure_finalize_failed");
        return {
          status: "sending_in_progress",
          errorCode: "delivery_failure_finalize_failed",
        };
      }
      return { status: "failed", errorCode: failCode };
    }

    /* 성공 기록. Resend가 이미 발송을 접수했으므로 여기서 DB 기록이
       실패해도 중복 재발송 위험 때문에 절대 failed로 되돌리지 않는다.
       sending 상태를 그대로 유지하고, "sent"로 확정 반환하지도 않는다 —
       관리자 UI가 실제 DB 상태(sending)와 어긋나지 않도록. */
    const fin = await supabase
      .from("ritual_orders")
      .update({
        delivery_status: "sent",
        delivery_email_id: emailId,
        delivery_to_email: order.email,
        delivered_at: new Date().toISOString(),
        delivery_error_code: null,
      })
      .eq("id", order.id)
      .eq("delivery_status", "sending");
    if (fin.error) {
      console.error("[delivery] delivery_finalize_failed");
      return {
        status: "sending_in_progress",
        errorCode: "delivery_finalize_failed",
      };
    }
    console.error("[delivery] delivery_sent");
    return { status: "sent" };
  } catch {
    console.error("[delivery] server_error");
    return { status: "server_error" };
  }
}
