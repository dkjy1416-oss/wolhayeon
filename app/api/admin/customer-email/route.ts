/**
 * POST /api/admin/customer-email — 운영자가 쓴 안내 메일을 고객에게 발송 (관리자 세션 전용)
 *
 * body: { orderNumber, subject, body }
 * - 받는 사람은 body로 받지 않고 서버가 주문의 email을 DB에서 읽는다.
 * - 발신자는 결과 메일과 같은 공식 주소(월화 <RESEND_FROM_EMAIL>).
 * - 같은 주문·같은 내용은 Resend idempotencyKey로 중복 발송 방지.
 */
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { Resend } from "resend";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isValidEmail } from "@/lib/ritual-types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const orderNumber = raw?.orderNumber;
  const subject = typeof raw?.subject === "string" ? raw.subject.trim() : "";
  const body = typeof raw?.body === "string" ? raw.body.trim() : "";
  if (typeof orderNumber !== "string" || !ORDER_NUMBER_RE.test(orderNumber)) {
    return NextResponse.json({ ok: false, error: "invalid_order_number" }, { status: 400 });
  }
  if (!subject || subject.length > 150 || !body || body.length > 5000) {
    return NextResponse.json({ ok: false, error: "invalid_content" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !fromEmail || !isValidEmail(fromEmail)) {
    return NextResponse.json({ ok: false, error: "config_missing" }, { status: 500 });
  }

  const supabase = getSupabaseAdmin();
  const o = await supabase
    .from("ritual_orders")
    .select("id, email")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (o.error || !o.data) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const to = String(o.data.email ?? "").trim();
  if (!isValidEmail(to)) {
    return NextResponse.json({ ok: false, error: "invalid_recipient" }, { status: 400 });
  }

  const html = `<!doctype html><html lang="ko"><body style="margin:0;background:#f6f2ec;padding:32px 16px;font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px 28px;color:#2a1f1a;font-size:15px;line-height:1.85">
${body
  .split(/\n{2,}/)
  .map((p) => `<p style="margin:0 0 16px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
  .join("\n")}
</div></body></html>`;

  const key = createHash("sha256")
    .update(`${orderNumber}|${subject}|${body}`)
    .digest("hex")
    .slice(0, 32);

  try {
    const resend = new Resend(apiKey);
    const res = await resend.emails.send(
      { from: `월화 <${fromEmail}>`, to, subject, text: body, html },
      { idempotencyKey: `customer-email/${key}` }
    );
    if (res.error) {
      console.error("[customer-email] send_failed");
      return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
    }
    console.log(`[customer-email] sent order=${orderNumber}`);
    return NextResponse.json({ ok: true });
  } catch {
    console.error("[customer-email] send_error");
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
  }
}
