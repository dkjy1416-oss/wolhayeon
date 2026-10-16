/**
 * 고객 후기 (서버 전용) — 실제 결제 고객이 남긴 후기만. 공개는 관리자 승인 + 고객 공개 동의가 있을 때만.
 */
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isOperatorEmail } from "@/lib/admin-util";

export interface PublicReview {
  id: number;
  rating: number;
  body: string;
  name: string;
  product: string;
  month: string;
  /** 후기 작성 혜택(책 추가 구매 쿠폰)을 받고 쓴 후기 — 공개 시 표시 의무 */
  incentive: boolean;
}

export interface AdminReview {
  id: number;
  order_number: string;
  product: string;
  rating: number;
  body: string;
  display_name: string | null;
  consent_public: boolean;
  status: "pending" | "approved" | "hidden";
  created_at: string;
  incentive?: string | null;
}

export const PRODUCT_LABEL: Record<string, string> = {
  message: "관계 리추얼",
  book: "책",
  bundle: "메시지 + 책",
};

function monthLabel(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월`;
}

/** 공개용 — 승인 + 공개 동의만. 테이블이 없거나 오류면 빈 목록 (페이지는 후기 칸을 숨김) */
export async function getPublicReviews(limit = 12): Promise<PublicReview[]> {
  try {
    const r = await getSupabaseAdmin()
      .from("reviews")
      .select("id, order_number, rating, body, display_name, product, approved_at, created_at, incentive")
      .eq("status", "approved")
      .eq("consent_public", true)
      .order("approved_at", { ascending: false })
      .limit(limit);
    if (r.error || !r.data) return [];
    /* 실제 결제 주문의 후기만 — 운영자·테스트 주문에 연결된 후기는 공개하지 않는다 (10/16 지시문 2.1) */
    const nums = r.data.map((x) => x.order_number as string).filter(Boolean);
    const ord = nums.length
      ? await getSupabaseAdmin().from("ritual_orders").select("order_number, email, payment_status").in("order_number", nums)
      : { data: [] as Array<{ order_number: string; email: string | null; payment_status: string }> };
    const real = new Set(
      ((ord.data ?? []) as Array<{ order_number: string; email: string | null; payment_status: string }>)
        .filter((o) => o.payment_status === "paid" && !isOperatorEmail(o.email))
        .map((o) => o.order_number)
    );
    return r.data.filter((x) => real.has(x.order_number as string)).map((x) => ({
      id: x.id as number,
      rating: x.rating as number,
      body: x.body as string,
      name: ((x.display_name as string | null) ?? "").trim() || "익명",
      product: PRODUCT_LABEL[x.product as string] ?? "월하연",
      month: monthLabel((x.approved_at as string | null) ?? (x.created_at as string)),
      incentive: Boolean(x.incentive),
    }));
  } catch {
    return [];
  }
}

export async function listReviewsForAdmin(): Promise<AdminReview[] | null> {
  try {
    const r = await getSupabaseAdmin()
      .from("reviews")
      .select("id, order_number, product, rating, body, display_name, consent_public, status, created_at, incentive")
      .order("created_at", { ascending: false })
      .limit(200);
    if (r.error || !r.data) return null;
    return r.data as AdminReview[];
  } catch {
    return null;
  }
}
