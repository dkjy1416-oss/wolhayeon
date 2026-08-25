/**
 * 서버 전용 Supabase 관리자 클라이언트.
 *
 * - `import "server-only"` 덕분에 이 파일을 클라이언트 컴포넌트에서
 *   import 하면 빌드가 실패합니다. → service_role key가 브라우저
 *   번들에 섞여 들어가는 사고를 원천 차단.
 * - 환경변수는 호출 시점에 읽으므로(지연 초기화) env 없이도
 *   `npm run build`가 통과합니다.
 * - service_role key는 RLS를 우회하므로 Route Handler /
 *   Server Action 안에서만 사용하세요.
 *
 * 다음 단계(주문 저장) 사용 예:
 *   // app/api/orders/route.ts
 *   import { getSupabaseAdmin } from "@/lib/supabase/server";
 *   const supabase = getSupabaseAdmin();
 *   await supabase.from("ritual_orders").insert(payload);
 */
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 환경변수로 들어온 Supabase URL 정리.
 * Vercel에 값을 붙여넣을 때 섞이기 쉬운 다음을 제거합니다:
 *  - 앞뒤 공백/개행/탭
 *  - 양쪽 따옴표 (" 또는 ')
 *  - 끝의 /rest/v1 또는 /rest/v1/ (문서에서 복사 시 흔한 실수)
 *  - 끝의 슬래시(/)
 * SDK에는 반드시 https://[project-ref].supabase.co 형태만 전달합니다.
 */
export function sanitizeSupabaseUrl(raw: string): string {
  let u = raw.trim().replace(/^["']+|["']+$/g, "").trim();
  u = u.replace(/\/rest\/v1\/?$/i, "");
  u = u.replace(/\/+$/g, "");
  return u;
}

/** 원본 값에 어떤 문제가 있었는지 boolean으로만 보고 (값 자체는 절대 노출 안 함) */
export function describeSupabaseUrlIssues(raw: string) {
  const sanitized = sanitizeSupabaseUrl(raw);
  return {
    "공백이나_개행_포함": raw !== raw.trim() || /[\r\n\t]/.test(raw),
    "따옴표_포함": /^["']|["']$/.test(raw.trim()),
    "rest_v1_접미사_포함": /\/rest\/v1\/?\s*$/i.test(raw.trim().replace(/^["']+|["']+$/g, "")),
    "끝_슬래시_포함": /\/\s*$/.test(raw) && !/\/rest\/v1\/?\s*$/i.test(raw),
    "정리_후_형식_정상": /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(sanitized),
  };
}

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rawUrl || !rawKey) {
    throw new Error(
      "Supabase 환경변수가 없습니다. .env.local 에 NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 를 설정하세요. (.env.example 참고)"
    );
  }

  const url = sanitizeSupabaseUrl(rawUrl);
  const serviceRoleKey = rawKey.trim().replace(/^["']+|["']+$/g, "");

  cached = createClient(url, serviceRoleKey, {
    auth: {
      // 서버 관리자 클라이언트: 세션/토큰 자동 관리 불필요
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}
