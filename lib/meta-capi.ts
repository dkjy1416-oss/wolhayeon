import "server-only";
/**
 * 메타 전환 API (서버) — 11/20 운영자 요청
 * - Lead(주문 생성) · Purchase(토스 승인 완료)만 서버에서 보낸다. 브라우저 픽셀과 같은 event_id → 메타가 중복 제거.
 * - 고객 정보는 이메일 SHA-256 해시(em)만. 이름·생년·성별·사연·상대 정보는 절대 보내지 않는다.
 * - 운영자·테스트 주문은 보내지 않는다. 단, META_TEST_EVENT_CODE 가 있으면 운영자 주문만 '이벤트 테스트'로 보낸다(실제 집계 X).
 * - 토큰은 서버 환경변수(META_CAPI_TOKEN)에만. 없으면 아무것도 하지 않는다. 실패해도 주문·결제에 영향 없음.
 */
import { createHash } from "crypto";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isOperatorEmail } from "@/lib/admin-util";

export type MetaCtx = {
  ip?: string | null;
  ua?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  url?: string | null;
};

const OPERATOR_EXTRA = new Set(["dkjy1416@gmail.com"]);

function cookieFrom(header: string | null, name: string): string | null {
  if (!header) return null;
  const m = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** 라우트 핸들러의 Request 에서 IP·UA·_fbp·_fbc·현재 화면 주소를 뽑는다 */
export function ctxFromRequest(req: Request): MetaCtx {
  const h = req.headers;
  const cookie = h.get("cookie");
  return {
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip"),
    ua: h.get("user-agent"),
    fbp: cookieFrom(cookie, "_fbp"),
    fbc: cookieFrom(cookie, "_fbc"),
    url: h.get("referer"),
  };
}

/** 서버 컴포넌트(결제 성공 화면)에서 같은 정보를 뽑는다 — 요청 밖(자동 재확인)에서는 빈 값 */
export async function ctxFromHeaders(fallbackUrl: string): Promise<MetaCtx> {
  try {
    const h = await headers();
    const cookie = h.get("cookie");
    return {
      ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip"),
      ua: h.get("user-agent"),
      fbp: cookieFrom(cookie, "_fbp"),
      fbc: cookieFrom(cookie, "_fbc"),
      url: fallbackUrl,
    };
  } catch {
    return { url: fallbackUrl };
  }
}

const sha256 = (s: string) => createHash("sha256").update(s.trim().toLowerCase()).digest("hex");

export async function sendMetaEvent(p: {
  event: "Lead" | "Purchase";
  orderNumber: string;
  email?: string | null;
  value?: number;
  contentName?: string;
  ctx?: MetaCtx;
}): Promise<void> {
  const pixel = (process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || "").trim();
  const token = (process.env.META_CAPI_TOKEN || "").trim();
  if (!pixel || !token) return;
  try {
    let email = p.email ?? null;
    if (!email) {
      const r = await getSupabaseAdmin().from("ritual_orders").select("email").eq("order_number", p.orderNumber).maybeSingle();
      email = (r.data as { email?: string | null } | null)?.email ?? null;
    }
    const e = (email ?? "").trim().toLowerCase();
    const operator = !e || isOperatorEmail(e) || OPERATOR_EXTRA.has(e);
    const testCode = (process.env.META_TEST_EVENT_CODE || "").trim();
    if (operator && !testCode) return;

    const c = p.ctx ?? {};
    const user_data: Record<string, unknown> = {};
    if (e) user_data.em = [sha256(e)];
    if (c.ip) user_data.client_ip_address = c.ip;
    if (c.ua) user_data.client_user_agent = c.ua;
    if (c.fbp) user_data.fbp = c.fbp;
    if (c.fbc) user_data.fbc = c.fbc;

    const custom_data: Record<string, unknown> = { currency: "KRW" };
    if (typeof p.value === "number") custom_data.value = p.value;
    if (p.contentName) custom_data.content_name = p.contentName;

    const body: Record<string, unknown> = {
      data: [
        {
          event_name: p.event,
          event_time: Math.floor(Date.now() / 1000),
          event_id: `${p.orderNumber}_${p.event}`,
          action_source: "website",
          event_source_url: c.url || `https://thewolha.com${p.event === "Purchase" ? "/payment/success" : "/apply/confirm"}`,
          user_data,
          custom_data,
        },
      ],
    };
    /* 운영자 주문은 테스트 코드로만 (이벤트 관리자 '이벤트 테스트'에만 보이고 광고 집계에는 안 들어감) */
    if (operator && testCode) body.test_event_code = testCode;

    const ver = (process.env.META_GRAPH_VERSION || "v23.0").trim();
    const res = await fetch(`https://graph.facebook.com/${ver}/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
    console.error(`[capi] ${p.event} ${res.ok ? "ok" : `failed status=${res.status}`}${operator ? " test" : ""}`);
  } catch (err) {
    console.error(`[capi] ${p.event} error ${err instanceof Error ? err.name : "unknown"}`);
  }
}
