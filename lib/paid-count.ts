import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isOperatorEmail } from "@/lib/admin-util";

/** 실제 결제 완료 주문 수 (운영자·테스트 제외). 실패하면 0 — 지어낸 숫자 없음 */
export async function getPaidCount(): Promise<number> {
  try {
    const { data } = await getSupabaseAdmin().from("ritual_orders").select("email").eq("payment_status", "paid").limit(5000);
    return (data ?? []).filter((r: { email: string | null }) => !isOperatorEmail(r.email)).length;
  } catch {
    return 0;
  }
}
