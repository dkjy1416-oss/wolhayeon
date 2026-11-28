/**
 * POST /api/chat/my — 11/28 결과 보관함: 이메일로 내 카톡 분석 결과 링크를 다시 보내 줌
 * - 결과가 있든 없든 같은 응답 (어떤 이메일이 손님인지 알 수 없게)
 * - 같은 이메일은 1시간에 한 번만 실제 발송 (Resend idempotencyKey)
 */
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { Resend } from "resend";
import { listChatOrders } from "@/lib/chat/store";
import { chatToken } from "@/lib/chat/auth";
import { sanitizeSiteUrl } from "@/lib/delivery-rules";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const VIEW_DAYS = 30;
const OK = { ok: true, message: "결과가 있다면 몇 분 안에 메일로 보내 드려요. 메일함과 스팸함을 확인해 주세요." };

export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase().slice(0, 120) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ ok: false, message: "이메일을 확인해 주세요." }, { status: 400 });
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const site = sanitizeSiteUrl(process.env.SITE_URL);
  if (!apiKey || !from || !site) return NextResponse.json(OK);

  const cutoff = Date.now() - VIEW_DAYS * 86400000;
  const mine = (await listChatOrders(600).catch(() => []))
    .filter((o) => o.email?.toLowerCase() === email && o.pay_status === "paid" && o.result && o.paid_at && new Date(o.paid_at).getTime() > cutoff)
    .slice(0, 10);
  if (!mine.length) return NextResponse.json(OK);

  const rows = mine.map((o) => {
    const url = `${site}/chat/result/${o.order_number}?t=${chatToken("result", o.order_number)}`;
    const d = new Date(new Date(o.paid_at as string).getTime() + 9 * 3600000);
    const label = `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 · ${(o.result?.type_label ?? "카톡 대화 분석").replace(/[<>&"]/g, "")}`;
    return { url, label };
  });
  const hour = Math.floor(Date.now() / 3600000);
  const key = createHash("sha256").update(email).digest("hex").slice(0, 16);
  try {
    await new Resend(apiKey).emails.send(
      {
        from: `월하연 月下緣 <${from}>`,
        to: email,
        subject: "[월하연] 내 카톡 분석 결과 다시 보기",
        text: `요청하신 카톡 분석 결과 링크예요. (결제일부터 ${VIEW_DAYS}일 동안 열람)\n\n${rows.map((r) => `${r.label}\n${r.url}`).join("\n\n")}\n\n요청하지 않았다면 이 메일은 무시해 주세요.\n\n— 월하연 月下緣`,
        html: `<div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;line-height:1.9;color:#2a2224"><p style="font-size:12px;letter-spacing:.25em;color:#8a6d3b">月下緣 · 월하연</p><p>요청하신 카톡 분석 결과 링크예요.<br/>결제일부터 ${VIEW_DAYS}일 동안 열어 볼 수 있어요.</p>${rows
          .map((r) => `<p style="margin:18px 0"><a href="${r.url}" style="display:block;background:#6d1f2c;color:#fff;text-decoration:none;border-radius:14px;padding:14px 18px;font-weight:600">${r.label} ›</a></p>`)
          .join("")}<p style="font-size:12px;color:#8d8779">요청하지 않았다면 이 메일은 무시해 주세요.</p></div>`,
      },
      { idempotencyKey: `chat-my-${key}-${hour}` }
    );
  } catch {
    /* 발송 실패도 같은 응답 */
  }
  return NextResponse.json(OK);
}
