/**
 * POST /api/admin/upgrade-invite — 책 추가 구매 안내 메일 (관리자 전용)
 *
 * mode
 *  - preview : 발송 대상(마스킹)·제외 사유별 인원·메일 미리보기 2종(안내·쿠폰)
 *  - test    : 운영자 메일(dkjy1416@naver.com)로만 안내·쿠폰 메일 샘플 발송 (고객에게 안 감)
 *  - send    : 대상에게 안내 메일 발송 — 관리자가 버튼을 눌러야만 실행
 *
 * 대상: 결과를 받은(delivered_at) 12,900원 분석 결제 고객 중
 *       광고성 정보 수신 동의(consent_marketing) · 책/패키지 미구매 · 환불 아님 · 아직 후기 없음 · 운영자/테스트 제외.
 * 같은 주문에는 한 번만 보낸다 (idempotencyKey).
 */
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sanitizeSiteUrl } from "@/lib/delivery-rules";
import { isOperatorEmail } from "@/lib/admin-util";
import { isValidEmail, BOOK_UPGRADE_SOURCE_KRW, BOOK_UPGRADE_VALID_MS } from "@/lib/ritual-types";
import { judgeUpgradeSource, type OrderLite } from "@/lib/book/upgrade-rules";
import { buildUpgradeCouponEmail, buildUpgradeInviteEmail, sendMail } from "@/lib/book/upgrade-email";
import { reviewPath } from "@/lib/review-auth";
import { logPayEventServer } from "@/lib/pay-events-server";

export const dynamic = "force-dynamic";

const OPERATOR_TEST_EMAIL = "dkjy1416@naver.com";
const OPERATOR_TEST_ORDER = "WH-20261009-QWQS2";

function maskEmail(e: string): string {
  const [local, domain] = e.split("@");
  return domain ? `${local.slice(0, 2)}***@${domain}` : "***";
}

interface Row extends OrderLite {
  applicant_name: string | null;
  email: string | null;
  consent_marketing: boolean | null;
  delivered_at: string | null;
}

async function collect() {
  const supabase = getSupabaseAdmin();
  const res = await supabase
    .from("ritual_orders")
    .select("order_number, product, payment_status, payment_amount, created_at, applicant_name, email, consent_marketing, delivered_at")
    .in("payment_status", ["paid", "refunded", "pending"])
    .order("created_at", { ascending: false })
    .limit(2000);
  if (res.error) return null;
  const rows = (res.data ?? []) as Row[];
  const reviewed = await supabase.from("reviews").select("order_number").limit(2000);
  const reviewedSet = new Set(((reviewed.data ?? []) as Array<{ order_number: string }>).map((r) => r.order_number));
  /* 이미 안내 메일을 보낸 주문은 다시 보내지 않는다 */
  const invited = await supabase.from("payment_events").select("order_number").eq("event", "upgrade_invite_sent").limit(2000);
  const invitedSet = new Set(((invited.data ?? []) as Array<{ order_number: string }>).map((r) => r.order_number));

  const byEmail = new Map<string, Row[]>();
  for (const r of rows) {
    if (!r.email) continue;
    const k = r.email;
    byEmail.set(k, [...(byEmail.get(k) ?? []), r]);
  }

  const targets: Row[] = [];
  const skipped = { no_consent: 0, not_delivered: 0, already_reviewed: 0, not_eligible: 0, operator: 0, already_invited: 0 };
  const seen = new Set<string>();
  for (const r of rows) {
    if (r.payment_status !== "paid" || (r.product ?? "message") !== "message" || r.payment_amount !== BOOK_UPGRADE_SOURCE_KRW) continue;
    const email = r.email ?? "";
    if (!isValidEmail(email) || seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());
    if (isOperatorEmail(email)) { skipped.operator++; continue; }
    const judged = judgeUpgradeSource(byEmail.get(email) ?? []);
    if (!judged.ok) { skipped.not_eligible++; continue; }
    if (!r.delivered_at) { skipped.not_delivered++; continue; }
    if (reviewedSet.has(r.order_number)) { skipped.already_reviewed++; continue; }
    if (invitedSet.has(r.order_number)) { skipped.already_invited++; continue; }
    if (r.consent_marketing !== true) { skipped.no_consent++; continue; }
    targets.push(r);
  }
  return { targets, skipped };
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
  const mode = body.mode === "send" ? "send" : body.mode === "test" ? "test" : "preview";
  const siteUrl = sanitizeSiteUrl(process.env.SITE_URL) ?? "https://thewolha.com";

  /* 샘플 — 운영자 테스트 주문 링크 (실제 고객 링크를 쓰지 않는다) */
  const sampleReview = `${siteUrl}${reviewPath(OPERATOR_TEST_ORDER) ?? "/review"}`;
  const sampleEnds = Date.now() + BOOK_UPGRADE_VALID_MS;
  const sampleInvite = buildUpgradeInviteEmail({ name: "테스트", siteUrl, reviewUrl: sampleReview });
  const sampleCoupon = buildUpgradeCouponEmail({
    name: "테스트",
    siteUrl,
    bookUrl: `${siteUrl}/book`,
    payUrl: `${siteUrl}/book`,
    endsAt: sampleEnds,
  });

  if (mode === "test") {
    const stamp = Date.now();
    const a = await sendMail(OPERATOR_TEST_EMAIL, { ...sampleInvite, subject: `[테스트] ${sampleInvite.subject}` }, `upgrade-invite-test-${stamp}`);
    const b = await sendMail(OPERATOR_TEST_EMAIL, { ...sampleCoupon, subject: `[테스트] ${sampleCoupon.subject}` }, `upgrade-coupon-test-${stamp}`);
    return NextResponse.json({ ok: a && b, mode, sent: Number(a) + Number(b), to: maskEmail(OPERATOR_TEST_EMAIL) });
  }

  const c = await collect();
  if (!c) return NextResponse.json({ ok: false, error: "query_failed" }, { status: 500 });

  if (mode === "preview") {
    return NextResponse.json({
      ok: true,
      mode,
      recipients: c.targets.map((r) => ({ order: r.order_number, name: (r.applicant_name ?? "").trim(), email: maskEmail(r.email ?? "") })),
      skipped: c.skipped,
      inviteSubject: sampleInvite.subject,
      inviteHtml: sampleInvite.html,
      couponSubject: sampleCoupon.subject,
      couponHtml: sampleCoupon.html,
    });
  }

  let sent = 0;
  let failed = 0;
  for (const r of c.targets) {
    const rp = reviewPath(r.order_number);
    if (!rp || !r.email) { failed++; continue; }
    const mail = buildUpgradeInviteEmail({ name: r.applicant_name ?? "", siteUrl, reviewUrl: `${siteUrl}${rp}` });
    const ok = await sendMail(r.email, mail, `upgrade-invite-v1-${r.order_number}`);
    if (ok) {
      sent++;
      await logPayEventServer(r.order_number, "upgrade_invite_sent");
    } else failed++;
    await new Promise((res) => setTimeout(res, 600));
  }
  return NextResponse.json({ ok: true, mode, sent, failed });
}
