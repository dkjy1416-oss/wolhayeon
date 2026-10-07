/**
 * POST /api/admin/remind — 미결제 신청자 리마인드 메일 (관리자 전용)
 *
 * body: { adminSecret: string, mode: "count" | "send", limit?: number }
 *
 * 대상 조건 (모두 만족):
 *  - payment_status = 'pending' (미결제)
 *  - consent_marketing = true   (광고성 수신 동의)
 *  - remind_sent_at IS NULL     (아직 한 번도 안 보냄 — 중복 발송 방지)
 *  - 신청 후 12시간 경과 (진행 중인 사람 제외) ~ 14일 이내
 *  - 유효한 이메일, 운영자 계정 제외
 *
 * mode=count : 발송하지 않고 대상 인원만 반환
 * mode=send  : 실제 발송 (기본 최대 60명) + remind_sent_at 기록
 *
 * 사전 준비: Supabase SQL Editor에서 아래 1줄 실행
 *   alter table ritual_orders add column if not exists remind_sent_at timestamptz;
 */
import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { createRemindToken } from "@/lib/remind-auth";
import {
  isValidEmail,
  FIRST_OFFER_PRICE_KRW,
  FIRST_OFFER_WINDOW_MS,
  RITUAL_REGULAR_PRICE_KRW,
} from "@/lib/ritual-types";
import { sanitizeSiteUrl } from "@/lib/delivery-rules";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EXCLUDED_EMAILS = new Set(["dkjy1416@naver.com", "tosstest@gmail.com"]);
const MIN_AGE_MS = 12 * 60 * 60 * 1000; // 신청 후 12시간 지난 사람만
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14일 이내 신청자만
const DEFAULT_LIMIT = 60;

function secretOk(input: unknown): boolean {
  const secret = process.env.RITUAL_ADMIN_SECRET?.trim();
  if (!secret || secret.length < 16 || typeof input !== "string") return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 리마인드 받은 때부터 24시간 첫 구매가 (lib/ritual-types offerAnchor 와 같은 규칙) */
function deadlineText(endMs: number): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(endMs));
}

function buildEmail(name: string, openUrl: string, fromEmail: string, endMs: number) {
  const safeName = name.trim() || "당신";
  const esc = escapeHtml(safeName);
  const offer = FIRST_OFFER_PRICE_KRW.toLocaleString();
  const regular = RITUAL_REGULAR_PRICE_KRW.toLocaleString();
  const until = deadlineText(endMs);
  /* 정보통신망법: 영리 목적 광고성 정보는 (광고) 표기 + 수신거부 안내 */
  const subject = `(광고) [월하연] ${safeName}님, 24시간 동안 ${offer}원으로 이어 볼 수 있어요`;

  const text = [
    `${safeName}님,`,
    ``,
    `그날 들려주신 이야기의 다음 장이 그대로 남아 있어요.`,
    `무료 미리보기에서 본 흐름에서, 이제 "그래서 어떻게 해야 하지?"를 정리할 차례예요.`,
    ``,
    `■ 이 메일을 받은 때부터 24시간, 첫 구매가 ${offer}원 (정가 ${regular}원)`,
    `   ${until}까지`,
    ``,
    `월화의 메시지에는 들려주신 사연을 바탕으로`,
    `· 지금 할 행동과 멈출 행동`,
    `· 연락을 고려할 때 쓸 첫 문장`,
    `· 상대의 반응에 따른 다음 행동`,
    `을 담아요.`,
    ``,
    `아래 링크를 누르면 다시 입력할 필요 없이 내 미리보기로 바로 이어집니다.`,
    openUrl,
    ``,
    `1회 결제 · 결제 후 보통 5분 안에 완성 · 결과를 열어보기 전이면 7일 안에 전액 환불`,
    ``,
    `— 월하연 月下緣`,
    ``,
    `이 메일은 월하연 소식 수신에 동의하신 분께 발송되었습니다.`,
    `더 받고 싶지 않으시면 이 메일에 "수신거부"라고 회신해 주세요.`,
  ].join("\n");

  const html = `<!doctype html><html lang="ko"><body style="margin:0;padding:0;background-color:#0a0908;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0908" style="background-color:#0a0908;"><tr><td align="center" bgcolor="#0a0908" style="background-color:#0a0908;">
  <div style="background-color:#0a0908;text-align:left;max-width:520px;margin:0 auto;padding:44px 24px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#efe9dc;">
    <p style="font-size:11px;letter-spacing:0.3em;color:#c9a96e;margin:0 0 28px;">月下緣 · 월하연</p>
    <p style="font-size:16px;line-height:2;margin:0 0 18px;">${esc}님,</p>
    <p style="font-size:15px;line-height:2.1;color:#d8d2c6;margin:0 0 26px;">
      그날 들려주신 이야기의 다음 장이 그대로 남아 있어요.<br/>
      무료 미리보기에서 본 흐름에서, 이제<br/>
      <b style="color:#efe9dc;">“그래서 어떻게 해야 하지?”</b>를 정리할 차례예요.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(201,169,110,.45);border-radius:14px;"><tr><td bgcolor="#16110d" style="background-color:#16110d;border-radius:14px;padding:22px 20px;text-align:center;">
      <p style="font-size:12px;letter-spacing:0.12em;color:#c9a96e;margin:0 0 10px;">이 메일을 받은 때부터 24시간 · 첫 구매가</p>
      <p style="margin:0 0 6px;font-size:14px;color:#8d8779;text-decoration:line-through;">${regular}원</p>
      <p style="margin:0;font-size:34px;font-weight:700;color:#efe9dc;letter-spacing:0.02em;">${offer}원</p>
      <p style="margin:12px 0 0;font-size:13px;color:#d4a24c;">${escapeHtml(until)}까지</p>
    </td></tr></table>
    <p style="font-size:14px;line-height:2.05;color:#d8d2c6;margin:26px 0 8px;">월화의 메시지에는 들려주신 사연을 바탕으로</p>
    <p style="font-size:14px;line-height:2.05;color:#efe9dc;margin:0 0 30px;">
      · 지금 할 행동과 멈출 행동<br/>
      · 연락을 고려할 때 쓸 첫 문장<br/>
      · 상대의 반응에 따른 다음 행동<br/>
      <span style="color:#d8d2c6;">을 담아요.</span>
    </p>
    <a href="${openUrl}"
       style="display:block;text-align:center;background-color:#6d1f2c;background:linear-gradient(#6d1f2c,#521722);color:#efe9dc;text-decoration:none;border:1px solid rgba(201,169,110,.35);border-radius:999px;padding:17px 20px;font-size:16px;font-weight:600;">
      ${offer}원으로 내 이야기 이어 보기
    </a>
    <p style="font-size:12px;line-height:1.9;color:#a9a294;text-align:center;margin:14px 0 0;">
      다시 입력할 필요 없이 내 미리보기로 바로 이어져요<br/>
      1회 결제 · 결제 후 보통 5분 안에 완성 · 열어보기 전이면 7일 안에 전액 환불
    </p>
    <p style="font-size:12px;color:#8d8779;line-height:1.9;margin:36px 0 0;">
      이 메일은 월하연 소식 수신에 동의하신 분께 발송되었습니다.<br/>
      더 받고 싶지 않으시면 이 메일(${escapeHtml(fromEmail)})에
      "수신거부"라고 회신해 주세요.
    </p>
  </div></td></tr></table></body></html>`;

  return { subject, text, html };
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  /* 관리자 로그인 세션 또는 비밀번호 둘 중 하나면 허용 */
  if (!secretOk(body.adminSecret) && !(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const mode = body.mode === "send" ? "send" : "count";
  const limit = Math.min(
    Math.max(Number(body.limit) || DEFAULT_LIMIT, 1),
    200
  );

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const siteUrl = sanitizeSiteUrl(process.env.SITE_URL);
  if (mode === "send" && (!apiKey || !fromEmail || !siteUrl)) {
    return NextResponse.json({ ok: false, error: "config_missing" }, { status: 500 });
  }

  const now = Date.now();
  const newest = new Date(now - MIN_AGE_MS).toISOString();
  const oldest = new Date(now - MAX_AGE_MS).toISOString();

  const supabase = getSupabaseAdmin();
  const res = await supabase
    .from("ritual_orders")
    .select(
      "id, order_number, applicant_name, email, created_at, remind_sent_at"
    )
    .eq("payment_status", "pending")
    .eq("consent_marketing", true)
    .is("remind_sent_at", null)
    .lt("created_at", newest)
    .gt("created_at", oldest)
    .order("created_at", { ascending: true })
    .limit(500);

  if (res.error) {
    /* remind_sent_at 컬럼이 아직 없으면 42703 */
    return NextResponse.json(
      { ok: false, error: "query_failed", code: res.error.code },
      { status: 500 }
    );
  }

  const targets = (res.data ?? []).filter(
    (r) =>
      typeof r.email === "string" &&
      isValidEmail(r.email) &&
      !EXCLUDED_EMAILS.has(r.email.toLowerCase())
  );

  if (mode === "count") {
    return NextResponse.json({
      ok: true,
      mode,
      eligible: targets.length,
      window: { from: oldest, to: newest },
    });
  }

  const resend = new Resend(apiKey);
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of targets.slice(0, limit)) {
    const token = createRemindToken(row.order_number);
    if (!token) {
      failed += 1;
      continue;
    }
    const openUrl = `${siteUrl}/api/remind/open?order=${encodeURIComponent(
      row.order_number
    )}&t=${encodeURIComponent(token)}`;
    /* 발송 직전 시각 기준 24시간 — 실제 기록(remind_sent_at)은 발송 직후라 안내한 마감보다 몇 초 늦게 끝나 손님에게 불리하지 않음 */
    const sendStart = Date.now();
    const mail = buildEmail(row.applicant_name ?? "", openUrl, fromEmail!, sendStart + FIRST_OFFER_WINDOW_MS);

    try {
      const r = await resend.emails.send(
        {
          from: `월하연 月下緣 <${fromEmail}>`,
          to: row.email as string,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        },
        { idempotencyKey: `remind-v2-${row.order_number}` }
      );
      if (r.error) {
        failed += 1;
        errors.push(`${row.order_number}:${r.error.name ?? "send_error"}`);
      } else {
        sent += 1;
        await supabase
          .from("ritual_orders")
          .update({ remind_sent_at: new Date().toISOString() })
          .eq("id", row.id)
          .is("remind_sent_at", null);
      }
    } catch {
      failed += 1;
      errors.push(`${row.order_number}:exception`);
    }
    /* Resend rate limit 보호 */
    await new Promise((r) => setTimeout(r, 600));
  }

  return NextResponse.json({
    ok: true,
    mode,
    eligible: targets.length,
    sent,
    failed,
    errors: errors.slice(0, 10),
  });
}
