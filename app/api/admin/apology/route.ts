/**
 * POST /api/admin/apology — 결제 오류 사과 쿠폰 + 안내 메일 (관리자 세션 전용)
 *
 * body: { orderNumbers: string[], mode: "preview" | "send" }
 *
 * 배경: 9/24~9/28 결제위젯 상점(vwolha95uh) 계약 미완료로 승인 단계에서
 * 결제가 전부 거절됨(NOT_AVAILABLE_PAYMENT_BY_MERCHANT). 결제를 시도했던
 * 고객에게 사과 쿠폰가(APOLOGY_PRICE_KRW)를 적용하고 안내 메일을 보낸다.
 *
 * - preview: 대상(이메일별 1건으로 묶음)만 반환. 아무것도 바꾸지 않음.
 * - send   : 전달된 결제 대기 주문 전부에 쿠폰가 적용 + 이메일별 1통 발송.
 * - 결제 시도 고객 대상의 서비스 안내 메일(광고 아님). 중복 발송은
 *   Resend idempotencyKey로 방지.
 */
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { createRemindToken } from "@/lib/remind-auth";
import {
  APOLOGY_PRICE_KRW,
  RITUAL_PRICE_KRW,
  isValidEmail,
} from "@/lib/ritual-types";
import { sanitizeSiteUrl } from "@/lib/delivery-rules";
import { logPayEventServer, ORDER_NUMBER_RE } from "@/lib/pay-events-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EXCLUDED_EMAILS = new Set(["dkjy1416@naver.com", "tosstest@gmail.com"]);

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function maskEmail(e: string): string {
  const [local, domain] = e.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 2)}***@${domain}`;
}

function buildEmail(name: string, openUrl: string) {
  const safe = name.trim() || "고객";
  const esc = escapeHtml(safe);
  const price = APOLOGY_PRICE_KRW.toLocaleString();
  const before = RITUAL_PRICE_KRW.toLocaleString();
  const subject = `[월하연] ${safe}님, 결제 오류로 불편을 드려 죄송해요`;
  const text = [
    `${safe}님, 안녕하세요. 월하연입니다.`,
    ``,
    `며칠 전 결제를 시도하셨을 때 저희 결제 시스템 오류로`,
    `결제가 완료되지 않았어요. 불편을 드려 정말 죄송합니다.`,
    `(결제가 승인되지 않아 청구된 금액은 없어요.)`,
    ``,
    `지금은 오류를 바로잡아 정상적으로 결제하실 수 있어요.`,
    `사과의 마음을 담아 ${safe}님 주문에 사과 쿠폰을 적용해 두었어요.`,
    `  ${before}원 → ${price}원`,
    ``,
    `아래 링크에서 들려주신 이야기와 미리보기부터 그대로 이어집니다.`,
    openUrl,
    ``,
    `— 월하연 月下緣`,
    ``,
    `이 메일은 월하연에서 결제를 시도하신 분께 드리는 안내 메일입니다.`,
  ].join("\n");

  const html = `<!doctype html><html lang="ko"><body style="margin:0;padding:0;background:#0a0908;">
  <div style="max-width:520px;margin:0 auto;padding:44px 24px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#efe9dc;">
    <p style="font-size:11px;letter-spacing:0.3em;color:#c9a96e;margin:0 0 28px;">月下緣 · 월하연</p>
    <p style="font-size:16px;line-height:2;margin:0 0 20px;">${esc}님, 안녕하세요.</p>
    <p style="font-size:15px;line-height:2.1;color:#d8d2c6;margin:0 0 20px;">
      며칠 전 결제를 시도하셨을 때 저희 결제 시스템 오류로<br/>
      결제가 완료되지 않았어요. 불편을 드려 정말 죄송합니다.<br/>
      <span style="color:#a89f8d;font-size:13px;">(결제가 승인되지 않아 청구된 금액은 없어요.)</span>
    </p>
    <p style="font-size:15px;line-height:2.1;color:#d8d2c6;margin:0 0 24px;">
      지금은 오류를 바로잡아 정상적으로 결제하실 수 있어요.<br/>
      사과의 마음을 담아 ${esc}님 주문에 사과 쿠폰을 적용해 두었어요.
    </p>
    <div style="border:1px solid rgba(201,169,110,.35);border-radius:16px;padding:18px 20px;text-align:center;margin:0 0 28px;">
      <p style="font-size:12px;letter-spacing:0.2em;color:#c9a96e;margin:0 0 8px;">결제 오류 사과 쿠폰</p>
      <p style="font-size:14px;color:#8d8779;margin:0;"><span style="text-decoration:line-through;">${before}원</span></p>
      <p style="font-size:26px;font-weight:600;color:#e2c48a;margin:4px 0 0;">${price}원</p>
    </div>
    <a href="${openUrl}"
       style="display:block;text-align:center;background:linear-gradient(#6d1f2c,#521722);color:#efe9dc;text-decoration:none;border:1px solid rgba(201,169,110,.35);border-radius:999px;padding:16px 20px;font-size:15px;">
      ${esc}님의 이야기 ${price}원으로 이어서 읽기
    </a>
    <p style="font-size:12.5px;color:#a89f8d;line-height:1.9;margin:20px 0 0;">
      들려주신 이야기와 미리보기는 그대로 보관되어 있어요.
    </p>
    <p style="font-size:12px;color:#8d8779;line-height:1.9;margin:36px 0 0;">
      이 메일은 월하연에서 결제를 시도하신 분께 드리는 안내 메일입니다.
    </p>
  </div></body></html>`;

  return { subject, text, html };
}

interface OrderRow {
  id: string;
  order_number: string;
  applicant_name: string | null;
  email: string | null;
  payment_status: string;
  payment_amount: number;
  created_at: string;
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const mode = body.mode === "send" ? "send" : "preview";
  const orderNumbers = Array.isArray(body.orderNumbers)
    ? [...new Set(
        (body.orderNumbers as unknown[])
          .filter((v): v is string => typeof v === "string")
          .map((v) => v.trim())
          .filter((v) => ORDER_NUMBER_RE.test(v))
      )].slice(0, 200)
    : [];
  if (orderNumbers.length === 0) {
    return NextResponse.json({ ok: false, error: "no_orders" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const res = await supabase
    .from("ritual_orders")
    .select(
      "id, order_number, applicant_name, email, payment_status, payment_amount, created_at"
    )
    .in("order_number", orderNumbers);
  if (res.error) {
    return NextResponse.json({ ok: false, error: "query_failed" }, { status: 500 });
  }
  const rows = (res.data ?? []) as OrderRow[];

  /* 결제 대기 + 유효 이메일 + 운영자 제외 */
  const pending = rows.filter(
    (r) =>
      r.payment_status === "pending" &&
      typeof r.email === "string" &&
      isValidEmail(r.email) &&
      !EXCLUDED_EMAILS.has(r.email.toLowerCase())
  );

  /* 이메일별 가장 최근 주문 1건으로 안내 (같은 사람이 여러 번 신청한 경우) */
  const byEmail = new Map<string, OrderRow>();
  for (const r of pending) {
    const key = (r.email as string).toLowerCase();
    const cur = byEmail.get(key);
    if (!cur || r.created_at > cur.created_at) byEmail.set(key, r);
  }
  const targets = [...byEmail.values()];

  if (mode === "preview") {
    return NextResponse.json({
      ok: true,
      mode,
      requested: orderNumbers.length,
      found: rows.length,
      alreadyPaidOrOther: rows.length - pending.length,
      recipients: targets.map((t) => ({
        order: t.order_number,
        name: (t.applicant_name ?? "").trim(),
        email: maskEmail(t.email as string),
      })),
    });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const siteUrl = sanitizeSiteUrl(process.env.SITE_URL);
  if (!apiKey || !fromEmail || !siteUrl) {
    return NextResponse.json({ ok: false, error: "config_missing" }, { status: 500 });
  }

  /* 1) 쿠폰가 적용 — 전달된 결제 대기 주문 전부 (결제 전 상태만) */
  const applyIds = pending.map((r) => r.id);
  if (applyIds.length > 0) {
    const upd = await supabase
      .from("ritual_orders")
      .update({ payment_amount: APOLOGY_PRICE_KRW })
      .in("id", applyIds)
      .eq("payment_status", "pending");
    if (upd.error) {
      return NextResponse.json({ ok: false, error: "coupon_apply_failed" }, { status: 500 });
    }
  }

  /* 2) 안내 메일 — 이메일별 1통 */
  const resend = new Resend(apiKey);
  let sent = 0;
  let failed = 0;
  for (const t of targets) {
    const token = createRemindToken(t.order_number);
    if (!token) {
      failed += 1;
      continue;
    }
    const openUrl = `${siteUrl}/api/remind/open?order=${encodeURIComponent(
      t.order_number
    )}&t=${encodeURIComponent(token)}`;
    const mail = buildEmail(t.applicant_name ?? "", openUrl);
    try {
      const r = await resend.emails.send(
        {
          from: `월하연 月下緣 <${fromEmail}>`,
          to: t.email as string,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        },
        { idempotencyKey: `apology-v1-${t.order_number}` }
      );
      if (r.error) {
        failed += 1;
      } else {
        sent += 1;
        await logPayEventServer(t.order_number, "apology_sent");
      }
    } catch {
      failed += 1;
    }
    await new Promise((r) => setTimeout(r, 600)); // Resend rate limit 보호
  }

  return NextResponse.json({
    ok: true,
    mode,
    couponApplied: applyIds.length,
    sent,
    failed,
  });
}
