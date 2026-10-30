/**
 * GET /api/remind/px?order=WH-...&t=<remindToken>&src=remind
 *
 * 메일 열람 기록용 1×1 투명 이미지 (10/30 요청 5 — 리마인드 열람률).
 * 토큰이 맞을 때만 payment_events 에 mail_open(code: src) 을 남긴다.
 * 이미지 차단·애플 메일 보호 기능 때문에 실제보다 높거나 낮게 잡힐 수 있어, 클릭(mail_click)과 함께 본다.
 */
import { verifyRemindToken } from "@/lib/remind-auth";
import { logPayEventServer } from "@/lib/pay-events-server";

export const dynamic = "force-dynamic";

const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(request: Request) {
  const url = new URL(request.url);
  const order = url.searchParams.get("order") ?? "";
  const token = url.searchParams.get("t") ?? "";
  const src = (url.searchParams.get("src") ?? "mail").replace(/[^a-z_]/g, "").slice(0, 20) || "mail";
  if (ORDER_NUMBER_RE.test(order) && verifyRemindToken(order, token)) {
    await logPayEventServer(order, "mail_open", src);
  }
  return new Response(GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
