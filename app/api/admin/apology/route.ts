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
  RITUAL_REGULAR_PRICE_KRW,
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

/** 사과 쿠폰 유효기한 (메일 안내용) */
const COUPON_DEADLINE_LABEL = "10월 4일(일) 밤 11시 59분";

/** 결제 후 받게 되는 내용 (메일 안내용 요약) */
const INCLUDED: Array<[string, string]> = [
  ["월화의 개인 편지", "들려주신 이야기에서 시작하는, 오직 한 분께만 쓰는 편지"],
  ["두 사람의 관계 이야기", "어디서부터 어긋났는지, 지금 두 분 사이의 흐름"],
  ["지금 내 마음 들여다보기", "그리움 뒤에 숨어 있는 진짜 마음"],
  ["관계에서 반복된 흐름", "다시 이어지기 전에 꼭 짚어야 할 것"],
  ["내가 정말 원하는 것", "재회인지, 연락인지, 사과인지, 정리인지"],
  ["붉은 인연의 실 리추얼", "상황에 맞춰 구성한 약 5분의 개인 리추얼"],
  ["리추얼 이후 24시간 가이드", "연락하고 싶어지는 순간을 넘기는 방법"],
  ["7일 행동 가이드", "다음 일주일, 무엇을 하고 무엇을 참을지"],
  ["21일 마음 회복 플랜", "관계를 다른 거리에서 바라보게 되는 3주"],
  ["BONUS 마음 기록 질문", "스스로의 마음에 답해 보는 개인 질문"],
];

function buildEmail(name: string, openUrl: string) {
  const safe = name.trim() || "고객";
  const esc = escapeHtml(safe);
  const price = APOLOGY_PRICE_KRW.toLocaleString();
  const before = RITUAL_PRICE_KRW.toLocaleString();
  const regular = RITUAL_REGULAR_PRICE_KRW.toLocaleString();
  const subject = `[월하연] ${safe}님, 결제 오류로 불편을 드려 진심으로 사과드립니다`;

  const text = [
    `${safe}님, 안녕하세요. 월하연입니다.`,
    ``,
    `먼저 진심으로 사과드립니다.`,
    `9월 24일부터 28일 사이, 저희 결제 시스템의 설정 오류로`,
    `${safe}님께서 어렵게 결정하신 결제가 끝까지 진행되지 못했습니다.`,
    `마음을 꺼내 이야기를 들려주시고 결과를 기다리셨을 텐데,`,
    `그 마음에 응답하지 못한 점 무겁게 받아들이고 있습니다.`,
    `(결제가 승인되지 않아 실제로 청구된 금액은 없습니다.)`,
    ``,
    `지금은 원인을 바로잡아 모든 결제가 정상적으로 이루어지고 있습니다.`,
    `죄송한 마음을 담아 ${safe}님의 신청서에 사과 쿠폰을 적용해 두었습니다.`,
    ``,
    `  정가 ${regular}원 · 현재 ${before}원 → ${safe}님 ${price}원`,
    `  쿠폰 유효기한: ${COUPON_DEADLINE_LABEL}까지`,
    ``,
    `들려주신 이야기와 미리보기는 그대로 보관되어 있어,`,
    `다시 작성하실 필요 없이 아래 링크에서 바로 이어서 보실 수 있습니다.`,
    openUrl,
    ``,
    `[결제 후 ${safe}님께 드리는 것 — 9가지 이야기 + BONUS]`,
    ...INCLUDED.map(([t, d], i) => `${i < 9 ? String(i + 1).padStart(2, "0") : "+"} ${t} — ${d}`),
    ``,
    `결과는 결제 직후 작성되어 이메일로 도착합니다.`,
    `결과를 열어보시기 전이라면 7일 이내 전액 환불되니, 부담 없이 받아보셔도 괜찮습니다.`,
    ``,
    `다시 한번 불편을 드려 죄송합니다.`,
    `${safe}님의 이야기에 끝까지 정성으로 답하겠습니다.`,
    ``,
    `— 월하연 月下緣 드림`,
    ``,
    `이 메일은 월하연에서 결제를 시도하셨던 분께 드리는 서비스 안내 메일입니다.`,
  ].join("\n");

  const rows = INCLUDED.map(
    ([t, d], i) => `<tr>
        <td style="width:58px;vertical-align:top;padding:9px 0;font-size:11px;letter-spacing:0.1em;color:${i < 9 ? "#c9a96e" : "#e2c48a"};">${i < 9 ? String(i + 1).padStart(2, "0") : "BONUS"}</td>
        <td style="vertical-align:top;padding:9px 0;border-bottom:1px solid rgba(201,169,110,.12);">
          <div style="font-size:14px;color:#efe9dc;">${escapeHtml(t.replace(/^BONUS /, ""))}</div>
          <div style="font-size:12.5px;color:#a89f8d;margin-top:3px;line-height:1.6;">${escapeHtml(d)}</div>
        </td></tr>`
  ).join("");

  const btn = `display:block;text-align:center;background:linear-gradient(#6d1f2c,#521722);color:#efe9dc;text-decoration:none;border:1px solid rgba(201,169,110,.35);border-radius:999px;padding:17px 20px;font-size:15px;`;

  const html = `<!doctype html><html lang="ko"><body style="margin:0;padding:0;background:#0a0908;">
  <div style="max-width:520px;margin:0 auto;padding:44px 24px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#efe9dc;">
    <p style="font-size:11px;letter-spacing:0.3em;color:#c9a96e;margin:0 0 28px;">月下緣 · 월하연</p>
    <p style="font-size:17px;line-height:1.9;margin:0 0 18px;">${esc}님, 안녕하세요.<br/>월하연입니다.</p>
    <p style="font-size:15px;line-height:2.05;color:#d8d2c6;margin:0 0 18px;">
      먼저 진심으로 사과드립니다.<br/>
      9월 24일부터 28일 사이, 저희 결제 시스템의 설정 오류로
      ${esc}님께서 어렵게 결정하신 결제가 끝까지 진행되지 못했습니다.
    </p>
    <p style="font-size:15px;line-height:2.05;color:#d8d2c6;margin:0 0 18px;">
      마음을 꺼내 이야기를 들려주시고 결과를 기다리셨을 텐데,
      그 마음에 제때 응답하지 못한 점 무겁게 받아들이고 있습니다.<br/>
      <span style="color:#a89f8d;font-size:13px;">결제가 승인되지 않아 실제로 청구된 금액은 없습니다.</span>
    </p>
    <p style="font-size:15px;line-height:2.05;color:#d8d2c6;margin:0 0 26px;">
      지금은 원인을 바로잡아 모든 결제가 정상적으로 이루어지고 있습니다.
      죄송한 마음을 담아 ${esc}님의 신청서에 <span style="color:#e2c48a;">사과 쿠폰</span>을 적용해 두었습니다.
    </p>

    <div style="border:1px solid rgba(201,169,110,.4);border-radius:18px;padding:22px 20px;text-align:center;margin:0 0 22px;background:rgba(201,169,110,.04);">
      <p style="font-size:12px;letter-spacing:0.2em;color:#c9a96e;margin:0 0 10px;">${esc}님께 드리는 사과 쿠폰</p>
      <p style="font-size:13.5px;color:#8d8779;margin:0;"><span style="text-decoration:line-through;">${regular}원</span>&nbsp;&nbsp;<span style="text-decoration:line-through;">${before}원</span></p>
      <p style="font-size:30px;font-weight:600;color:#e2c48a;margin:6px 0 0;">${price}원</p>
      <p style="font-size:12.5px;color:#d8a0a8;margin:10px 0 0;">${COUPON_DEADLINE_LABEL}까지</p>
    </div>

    <a href="${openUrl}" style="${btn}">${esc}님의 이야기 이어서 보기</a>
    <p style="font-size:12.5px;color:#a89f8d;line-height:1.9;margin:14px 0 36px;text-align:center;">
      들려주신 이야기와 미리보기는 그대로 보관되어 있어요.<br/>다시 작성하실 필요 없이 바로 이어집니다.
    </p>

    <p style="font-size:12px;letter-spacing:0.2em;color:#c9a96e;margin:0 0 6px;">결제 후 ${esc}님께 드리는 것</p>
    <p style="font-size:16px;color:#efe9dc;margin:0 0 10px;">월화가 준비하는 9가지 이야기 <span style="color:#e2c48a;">+ BONUS</span></p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 22px;">${rows}</table>

    <p style="font-size:13.5px;line-height:1.95;color:#d8d2c6;margin:0 0 26px;">
      결과는 결제 직후 작성되어 이메일로 도착합니다.<br/>
      <span style="color:#a89f8d;">결과를 열어보시기 전이라면 7일 이내 전액 환불되니, 부담 없이 받아보셔도 괜찮습니다.</span>
    </p>

    <a href="${openUrl}" style="${btn}">${price}원으로 결과 받아보기</a>

    <p style="font-size:14.5px;line-height:2;color:#d8d2c6;margin:36px 0 0;">
      다시 한번 불편을 드려 죄송합니다.<br/>
      ${esc}님의 이야기에 끝까지 정성으로 답하겠습니다.
    </p>
    <p style="font-size:14px;color:#c9a96e;margin:14px 0 0;">— 월하연 月下緣 드림</p>
    <p style="font-size:11.5px;color:#7d776b;line-height:1.9;margin:40px 0 0;">
      이 메일은 월하연에서 결제를 시도하셨던 분께 드리는 서비스 안내 메일입니다.
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
        { idempotencyKey: `apology-v2-${t.order_number}` }
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
