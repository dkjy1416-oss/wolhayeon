/** POST /api/reviews — 결제 고객이 후기 남기기 (후기 링크 토큰 필요, 주문 1건당 1개, 승인 전까지 수정 가능)
 *  선택형 후기(도움이 된 부분·이용 소감)는 choices 에 함께 저장.
 *  12,900원 분석 결제 고객이면 별점·내용과 관계없이 책 추가 구매 쿠폰(27,000원 주문)을 발급하고,
 *  후기에 incentive 를 기록해 공개 시 '혜택을 받고 쓴 후기'로 표시한다.
 *  쿠폰 메일은 고객이 '메일로도 받기'에 동의했을 때만 보낸다(광고성 정보). */
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyReviewToken } from "@/lib/review-auth";
import { cleanChoices } from "@/lib/review-choices";
import { checkUpgradeForOrder, issueUpgradeOrder } from "@/lib/book/book-upgrade";
import { buildUpgradeCouponEmail, sendMail } from "@/lib/book/upgrade-email";
import { sanitizeSiteUrl } from "@/lib/delivery-rules";
import { logPayEventServer } from "@/lib/pay-events-server";

export const dynamic = "force-dynamic";

const ORDER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const o = typeof b.o === "string" ? b.o : "";
  if (!ORDER_RE.test(o) || !verifyReviewToken(o, b.t)) {
    return NextResponse.json({ ok: false, error: "invalid_link" }, { status: 403 });
  }
  const rating = Number(b.rating);
  const body = typeof b.body === "string" ? b.body.trim().replace(/\s+\n/g, "\n") : "";
  const displayName =
    typeof b.name === "string" ? b.name.trim().replace(/[<>]/g, "").slice(0, 12) || null : null;
  const consent = b.consent === true;
  const mailCoupon = b.mailCoupon === true;
  const choices = cleanChoices(b.helped, b.impressions);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, error: "rating" }, { status: 400 });
  }
  if (body.length < 10 || body.length > 600) {
    return NextResponse.json({ ok: false, error: "body_length" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const ord = await supabase
      .from("ritual_orders")
      .select("payment_status, product")
      .eq("order_number", o)
      .maybeSingle();
    if (ord.error || !ord.data || ord.data.payment_status !== "paid") {
      return NextResponse.json({ ok: false, error: "not_paid" }, { status: 403 });
    }
    const prev = await supabase.from("reviews").select("status").eq("order_number", o).maybeSingle();
    if (prev.error) {
      console.error("[review] lookup_failed");
      return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
    }
    if (prev.data && prev.data.status !== "pending") {
      return NextResponse.json({ ok: false, error: "already_reviewed" }, { status: 409 });
    }
    /* 쿠폰 대상 여부 (별점·내용과 무관) */
    const elig = await checkUpgradeForOrder(o);
    const row = {
      choices,
      incentive: elig.ok ? "book_upgrade_coupon" : null,
      order_number: o,
      product: (ord.data.product as string | null) ?? "message",
      rating,
      body,
      display_name: displayName,
      consent_public: consent,
      status: "pending",
      updated_at: new Date().toISOString(),
    };
    const w = prev.data
      ? await supabase.from("reviews").update(row).eq("order_number", o).eq("status", "pending")
      : await supabase.from("reviews").insert(row);
    if (w.error) {
      console.error("[review] write_failed");
      return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
    }
    /* 쿠폰 발급 (같은 이메일에 유효한 쿠폰이 있으면 그대로 사용 — 중복 발급 없음) */
    let coupon: { bookUrl: string; payUrl: string; endsAt: number; mailed: boolean } | null = null;
    if (elig.ok) {
      const issued = await issueUpgradeOrder(o);
      if (issued.ok) {
        const siteUrl = sanitizeSiteUrl(process.env.SITE_URL) ?? "https://thewolha.com";
        const q = encodeURIComponent(issued.orderNumber);
        const bookUrl = `${siteUrl}/book?order=${q}`;
        const payUrl = `${siteUrl}/apply/complete?order=${q}&product=book`;
        let mailed = false;
        if (mailCoupon && elig.email) {
          const nm = await supabase.from("ritual_orders").select("applicant_name").eq("order_number", o).maybeSingle();
          const mail = buildUpgradeCouponEmail({
            name: (nm.data?.applicant_name as string | null) ?? "",
            siteUrl,
            bookUrl,
            payUrl,
            endsAt: issued.endsAt,
          });
          mailed = await sendMail(elig.email, mail, `upgrade-coupon-v1-${issued.orderNumber}`);
          if (!mailed) console.error("[review] coupon_mail_failed");
        }
        coupon = { bookUrl: `/book?order=${q}`, payUrl: `/apply/complete?order=${q}&product=book`, endsAt: issued.endsAt, mailed };
        if (issued.created) await logPayEventServer(o, "upgrade_issued", issued.orderNumber);
      } else {
        console.error(`[review] upgrade_issue_failed reason=${issued.reason}`);
      }
    }
    return NextResponse.json({ ok: true, coupon });
  } catch {
    console.error("[review] server_error");
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
