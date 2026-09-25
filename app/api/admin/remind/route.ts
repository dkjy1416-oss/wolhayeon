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
import { isValidEmail } from "@/lib/ritual-types";
import { sanitizeSiteUrl } from "@/lib/delivery-rules";

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

function buildEmail(name: string, openUrl: string, fromEmail: string) {
  const safeName = name.trim() || "당신";
  const esc = escapeHtml(safeName);
  /* 정보통신망법: 영리 목적 광고성 정보는 (광고) 표기 + 수신거부 안내 */
  const subject = `(광고) [월하연] ${safeName}님, 월화가 읽던 이야기가 아직 남아 있어요`;

  const text = [
    `${safeName}님,`,
    ``,
    `그날 들려주신 이야기, 월화가 먼저 읽은 마음이`,
    `그대로 남아 있어요.`,
    ``,
    `여기서 멈추면 이야기는 그 페이지에서 끝나요.`,
    `아래 링크에서 무료 미리보기부터 다시 이어집니다.`,
    ``,
    openUrl,
    ``,
    `— 월하연 月下緣`,
    ``,
    `이 메일은 월하연 소식 수신에 동의하신 분께 발송되었습니다.`,
    `더 받고 싶지 않으시면 이 메일에 "수신거부"라고 회신해 주세요.`,
  ].join("\n");

  const html = `<!doctype html><html lang="ko"><body style="margin:0;padding:0;background:#0a0908;">
  <div style="max-width:520px;margin:0 auto;padding:44px 24px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#efe9dc;">
    <p style="font-size:11px;letter-spacing:0.3em;color:#c9a96e;margin:0 0 28px;">月下緣 · 월하연</p>
    <p style="font-size:16px;line-height:2;margin:0 0 20px;">${esc}님,</p>
    <p style="font-size:15px;line-height:2.1;color:#d8d2c6;margin:0 0 20px;">
      그날 들려주신 이야기,<br/>
      월화가 먼저 읽은 마음이 그대로 남아 있어요.
    </p>
    <p style="font-size:15px;line-height:2.1;color:#d8d2c6;margin:0 0 32px;">
      여기서 멈추면 이야기는 그 페이지에서 끝나요.<br/>
      무료 미리보기부터 다시 이어집니다.
    </p>
    <a href="${openUrl}"
       style="display:block;text-align:center;background:linear-gradient(#6d1f2c,#521722);color:#efe9dc;text-decoration:none;border:1px solid rgba(201,169,110,.35);border-radius:999px;padding:16px 20px;font-size:15px;">
      ${esc}님의 이야기 이어서 읽기
    </a>
    <p style="font-size:12px;color:#8d8779;line-height:1.9;margin:36px 0 0;">
      이 메일은 월하연 소식 수신에 동의하신 분께 발송되었습니다.<br/>
      더 받고 싶지 않으시면 이 메일(${escapeHtml(fromEmail)})에
      "수신거부"라고 회신해 주세요.
    </p>
  </div></body></html>`;

  return { subject, text, html };
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!secretOk(body.adminSecret)) {
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
    const mail = buildEmail(row.applicant_name ?? "", openUrl, fromEmail!);

    try {
      const r = await resend.emails.send(
        {
          from: `월하연 月下緣 <${fromEmail}>`,
          to: row.email as string,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        },
        { idempotencyKey: `remind-v1-${row.order_number}` }
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
