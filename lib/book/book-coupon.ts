import "server-only";
/**
 * 책 출간 안내 + 3,000원 책 쿠폰 메일 (관리자 전용 — /admin/apology 의 두 번째 콘솔에서 실행)
 *
 * 대상: 9/24~9/28 결제 오류 사과 쿠폰을 받았던 고객 (주문번호 목록 → 이메일별 1명)
 * 처리(send):
 *  1) 이메일별로 사연이 담긴 주문 1건(결제 완료 주문 우선, 없으면 가장 최근 주문)을 고른다.
 *  2) 그 신청 내용을 화이트리스트 정제·재검증해 '책 쿠폰 주문'(26,000원, product=book)을 만든다.
 *     같은 이메일엔 1건만 (결제 대기 책 주문이 있으면 재사용).
 *  3) 메일 1통: 책 소개 + 쿠폰 버튼(사연 다시 쓰지 않고 바로 결제).
 *     아직 메시지를 결제하지 않은 분에겐 메시지 사과 쿠폰(9,900원, 10/4까지) 링크도 함께.
 * 광고성 정보이므로 제목에 (광고), 본문 끝에 수신거부 방법과 사업자 정보를 표기한다.
 */
import { createHash } from "crypto";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { createRemindToken } from "@/lib/remind-auth";
import { cloneOrderForBook } from "@/lib/book/clone-order";
import { sanitizeSiteUrl } from "@/lib/delivery-rules";
import {
  APOLOGY_PRICE_KRW,
  isPromoActive,
  BOOK_COUPON_PRICE_KRW,
  BOOK_PRICE_KRW,
  isValidEmail,
} from "@/lib/ritual-types";
import { BOOK_ONLY_SHORT } from "@/lib/book/book-contents";
import { BUSINESS } from "@/components/legal/LegalPage";

const EXCLUDED_EMAILS = new Set(["dkjy1416@naver.com", "tosstest@gmail.com"]);
const COUPON_DEADLINE_LABEL = "10월 11일(일) 밤 11시 59분";
const MESSAGE_COUPON_DEADLINE_LABEL = "10월 4일(일) 밤 11시 59분";

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function maskEmail(e: string): string {
  const [local, domain] = e.split("@");
  return domain ? `${local.slice(0, 2)}***@${domain}` : "***";
}

export function buildBookCouponEmail(opts: {
  name: string;
  siteUrl: string;
  bookUrl: string;
  /** 아직 메시지를 결제하지 않은 분 — 메시지 사과 쿠폰 링크 */
  messageUrl: string | null;
}) {
  const safe = opts.name.trim() || "고객";
  const n = esc(safe);
  const before = BOOK_PRICE_KRW.toLocaleString();
  const price = BOOK_COUPON_PRICE_KRW.toLocaleString();
  const msgPrice = APOLOGY_PRICE_KRW.toLocaleString();
  const subject = `(광고) [월하연] ${safe}님께만 — 새로 나온 책, 3,000원 쿠폰을 드려요`;

  const text = [
    `(광고) ${safe}님, 안녕하세요. 월하연입니다.`,
    ``,
    `지난번 결제와 결과 준비 과정에서 기다리게 해 드린 일, 다시 한번 죄송합니다.`,
    `그 마음을 잊지 않고, 이번에 새로 나온 책 소식을 가장 먼저 전해 드려요.`,
    ``,
    `《헤어진 뒤, 연락하지 말아야 할 때》 — ${safe}님 이름이 들어간 개인화 PDF 책 (약 120쪽)`,
    ...BOOK_ONLY_SHORT.map((b) => `· ${b.title} — ${b.body}`),
    ``,
    `[${safe}님께 드리는 책 쿠폰] ${before}원 → ${price}원 (${COUPON_DEADLINE_LABEL}까지)`,
    `들려주신 사연 그대로 만들어요. 다시 쓰실 필요 없이 바로 결제할 수 있어요.`,
    opts.bookUrl,
    ...(opts.messageUrl
      ? [``, `메시지 사과 쿠폰(${msgPrice}원)도 ${MESSAGE_COUPON_DEADLINE_LABEL}까지 그대로 남아 있어요.`, opts.messageUrl]
      : []),
    ``,
    `— 월하연 月下緣 드림`,
    ``,
    `이 메일은 월하연을 이용하신 분께 보내는 광고성 정보입니다.`,
    `더 이상 받기를 원하지 않으시면 이 메일에 '수신거부'라고 답장해 주세요.`,
    `${BUSINESS.company} · 대표 ${BUSINESS.ceo} · 사업자등록번호 ${BUSINESS.regNo} · ${BUSINESS.address} · ${BUSINESS.phone} · ${BUSINESS.email}`,
  ].join("\n");

  const btn = `display:block;text-align:center;background-color:#6d1f2c;background:linear-gradient(#6d1f2c,#521722);color:#efe9dc;text-decoration:none;border:1px solid rgba(201,169,110,.35);border-radius:999px;padding:17px 20px;font-size:15px;`;
  const btn2 = `display:block;text-align:center;color:#e2c48a;text-decoration:none;border:1px solid rgba(201,169,110,.45);border-radius:999px;padding:14px 20px;font-size:14px;`;

  const items = BOOK_ONLY_SHORT.map(
    (b) => `<tr><td style="width:22px;vertical-align:top;padding:8px 0;color:#e2c48a;font-size:13px;">✓</td>
      <td style="vertical-align:top;padding:8px 0;border-bottom:1px solid rgba(201,169,110,.12);">
        <div style="font-size:14px;color:#efe9dc;">${esc(b.title)}</div>
        <div style="font-size:12.5px;color:#a89f8d;margin-top:3px;line-height:1.65;">${esc(b.body)}</div>
      </td></tr>`
  ).join("");

  const pages = ["p03", "p06", "p08"]
    .map(
      (p) =>
        `<td style="width:33%;padding:0 3px;"><img src="${opts.siteUrl}/book/pages/${p}.webp" alt="책 페이지" width="150" style="display:block;width:100%;height:auto;border-radius:6px;border:1px solid rgba(201,169,110,.25);background:#f5efe3;" /></td>`
    )
    .join("");

  const html = `<!doctype html><html lang="ko"><body style="margin:0;padding:0;background-color:#0a0908;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0908" style="background-color:#0a0908;"><tr><td align="center" bgcolor="#0a0908" style="background-color:#0a0908;">
  <div style="background-color:#0a0908;text-align:left;max-width:520px;margin:0 auto;padding:40px 24px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#efe9dc;">
    <p style="font-size:11px;letter-spacing:0.3em;color:#c9a96e;margin:0 0 26px;">(광고) 月下緣 · 월하연</p>
    <p style="font-size:17px;line-height:1.9;margin:0 0 16px;">${n}님, 안녕하세요.<br/>월하연입니다.</p>
    <p style="font-size:15px;line-height:2.05;color:#d8d2c6;margin:0 0 26px;">
      지난번 결제와 결과 준비 과정에서 기다리게 해 드린 일, 다시 한번 죄송합니다.<br/>
      그 마음을 잊지 않고, 이번에 새로 나온 책 소식을 <span style="color:#e2c48a;">${n}님께 가장 먼저</span> 전해 드려요.
    </p>

    <div style="text-align:center;margin:0 0 8px;">
      <img src="${opts.siteUrl}/book/v2/cover-3d.webp" alt="《헤어진 뒤, 연락하지 말아야 할 때》" width="220" style="display:inline-block;width:220px;max-width:70%;height:auto;" />
    </div>
    <p style="font-size:19px;line-height:1.6;text-align:center;color:#efe9dc;margin:6px 0 4px;">《헤어진 뒤,<br/>연락하지 말아야 할 때》</p>
    <p style="font-size:12.5px;text-align:center;color:#a89f8d;margin:0 0 22px;">${n}님 이름이 들어간 개인화 PDF 책 · 약 120쪽</p>

    <p style="font-size:14.5px;line-height:2;color:#d8d2c6;margin:0 0 12px;">
      메시지가 <span style="color:#efe9dc;">“지금 무엇을 할지”</span>를 알려 드렸다면, 책은 그다음 —
      <span style="color:#efe9dc;">연락이 다시 오는 순간과 다시 만나기 시작할 때</span>까지 곁에 두고 펼치는 안내서예요.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 18px;">${items}</table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 6px;"><tr>${pages}</tr></table>
    <p style="font-size:11.5px;text-align:center;color:#7d776b;margin:0 0 26px;">실제 책 페이지</p>

    <div style="border:1px solid rgba(201,169,110,.45);border-radius:18px;padding:22px 20px;text-align:center;margin:0 0 18px;background:rgba(201,169,110,.05);">
      <p style="font-size:12px;letter-spacing:0.2em;color:#c9a96e;margin:0 0 10px;">${n}님께 드리는 책 쿠폰</p>
      <p style="font-size:13.5px;color:#8d8779;margin:0;"><span style="text-decoration:line-through;">${before}원</span></p>
      <p style="font-size:30px;font-weight:600;color:#e2c48a;margin:6px 0 0;">${price}원 <span style="font-size:13px;color:#d8a0a8;font-weight:400;">3,000원 할인</span></p>
      <p style="font-size:12.5px;color:#d8a0a8;margin:10px 0 0;">${COUPON_DEADLINE_LABEL}까지</p>
    </div>
    <a href="${opts.bookUrl}" style="${btn}">사연 다시 안 쓰고 책 받기 · ${price}원</a>
    <p style="font-size:12.5px;color:#a89f8d;line-height:1.9;margin:12px 0 30px;text-align:center;">
      들려주신 사연 그대로 만들어요. 결제 후 몇 분 안에 화면과 메일로 받아요.
    </p>

    ${
      opts.messageUrl
        ? `<div style="border-top:1px solid rgba(201,169,110,.15);padding-top:22px;margin:0 0 28px;">
      <p style="font-size:14px;line-height:1.95;color:#d8d2c6;margin:0 0 14px;text-align:center;">
        아직 받지 않으신 <span style="color:#efe9dc;">월화의 메시지</span> 사과 쿠폰(${msgPrice}원)도<br/>${MESSAGE_COUPON_DEADLINE_LABEL}까지 그대로 남아 있어요.
      </p>
      <a href="${opts.messageUrl}" style="${btn2}">내 이야기 이어서 보기 · 메시지 ${msgPrice}원</a>
    </div>`
        : ""
    }

    <p style="font-size:14px;color:#c9a96e;margin:0;">— 월하연 月下緣 드림</p>
    <p style="font-size:11px;color:#7d776b;line-height:1.9;margin:36px 0 0;">
      이 메일은 월하연을 이용하신 분께 보내는 광고성 정보입니다.<br/>
      더 이상 받기를 원하지 않으시면 이 메일에 ‘수신거부’라고 답장해 주세요.<br/>
      ${esc(BUSINESS.company)} · 대표 ${esc(BUSINESS.ceo)} · 사업자등록번호 ${esc(BUSINESS.regNo)}<br/>
      ${esc(BUSINESS.address)} · ${esc(BUSINESS.phone)} · ${esc(BUSINESS.email)}
    </p>
  </div></td></tr></table></body></html>`;

  return { subject, text, html };
}

interface Row {
  id: string;
  order_number: string;
  applicant_name: string | null;
  email: string | null;
  payment_status: string;
  created_at: string;
}

export async function runBookCoupon(orderNumbers: string[], mode: "preview" | "send") {
  const supabase = getSupabaseAdmin();
  const res = await supabase
    .from("ritual_orders")
    .select("id, order_number, applicant_name, email, payment_status, created_at")
    .in("order_number", orderNumbers);
  if (res.error) return { ok: false as const, error: "query_failed" };
  const rows = ((res.data ?? []) as Row[]).filter(
    (r) => typeof r.email === "string" && isValidEmail(r.email) && !EXCLUDED_EMAILS.has(r.email.toLowerCase())
  );

  /* 이메일별: 결제 완료 주문 우선, 없으면 가장 최근 주문 */
  const byEmail = new Map<string, { source: Row; paid: boolean; pendingLatest: Row | null }>();
  for (const r of rows) {
    const key = (r.email as string).toLowerCase();
    const cur = byEmail.get(key) ?? { source: r, paid: false, pendingLatest: null };
    if (r.payment_status === "paid") {
      if (!cur.paid || r.created_at > cur.source.created_at) cur.source = r;
      cur.paid = true;
    } else if (!cur.paid && r.created_at >= cur.source.created_at) {
      cur.source = r;
    }
    if (r.payment_status === "pending" && (!cur.pendingLatest || r.created_at > cur.pendingLatest.created_at)) {
      cur.pendingLatest = r;
    }
    byEmail.set(key, cur);
  }
  const targets = [...byEmail.entries()];

  const siteUrl = sanitizeSiteUrl(process.env.SITE_URL) ?? "https://thewolha.com";

  if (mode === "preview") {
    const first = targets[0];
    const sample = first
      ? buildBookCouponEmail({
          name: first[1].source.applicant_name ?? "",
          siteUrl,
          bookUrl: `${siteUrl}/book`,
          messageUrl: first[1].paid ? null : `${siteUrl}/apply`,
        })
      : null;
    return {
      ok: true as const,
      mode,
      recipients: targets.map(([email, t]) => ({
        order: t.source.order_number,
        name: (t.source.applicant_name ?? "").trim(),
        email: maskEmail(email),
        paid: t.paid,
      })),
      sampleSubject: sample?.subject ?? null,
      sampleHtml: sample?.html ?? null,
    };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !fromEmail) return { ok: false as const, error: "config_missing" };
  const resend = new Resend(apiKey);

  let sent = 0;
  let failed = 0;
  let created = 0;
  for (const [email, t] of targets) {
    try {
      /* 1) 책 쿠폰 주문 (이메일당 1건 — 결제 대기 책 주문이 있으면 재사용) */
      const cl = await cloneOrderForBook(t.source.id, BOOK_COUPON_PRICE_KRW, true);
      if (!cl.ok) {
        console.error(`[book-coupon] clone_failed reason=${cl.reason} code=${cl.code ?? "-"}`);
        failed += 1;
        continue;
      }
      const bookOrder = cl.orderNumber;
      if (cl.created) created += 1;

      /* 2) 메시지 미결제자 — 기존 사과 쿠폰 주문으로 이어 보기 링크 */
      let messageUrl: string | null = null;
      /* 사과 쿠폰(9,900원)은 10/4 23:59 마감 — 마감 뒤에는 메시지 쿠폰 안내를 넣지 않는다 */
      if (!t.paid && t.pendingLatest && isPromoActive()) {
        const tok = createRemindToken(t.pendingLatest.order_number);
        if (tok) {
          messageUrl = `${siteUrl}/api/remind/open?order=${encodeURIComponent(t.pendingLatest.order_number)}&t=${encodeURIComponent(tok)}`;
        }
      }

      const mail = buildBookCouponEmail({
        name: t.source.applicant_name ?? "",
        siteUrl,
        bookUrl: `${siteUrl}/apply/complete?order=${encodeURIComponent(bookOrder)}&product=book`,
        messageUrl,
      });
      const r = await resend.emails.send(
        {
          from: `월하연 月下緣 <${fromEmail}>`,
          to: email,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        },
        { idempotencyKey: `book-coupon-v1-${createHash("sha256").update(email).digest("hex").slice(0, 24)}` }
      );
      if (r.error) failed += 1;
      else sent += 1;
    } catch {
      failed += 1;
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return { ok: true as const, mode, created, sent, failed };
}
