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

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase 환경변수가 없습니다. .env.local 에 NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 를 설정하세요. (.env.example 참고)"
    );
  }

  cached = createClient(url, serviceRoleKey, {
    auth: {
      // 서버 관리자 클라이언트: 세션/토큰 자동 관리 불필요
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}
