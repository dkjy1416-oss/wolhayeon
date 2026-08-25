/**
 * Supabase 테이블 Row 타입.
 * supabase/migrations/20260825000001_init_ritual_tables.sql 과 1:1 대응.
 *
 * RitualOrderInsert 는 RitualApplication(신청폼)을 그대로 확장하므로,
 * 폼 필드와 DB 컬럼이 어긋나면 TypeScript 컴파일 단계에서 잡힙니다.
 */
import type { RitualApplication } from "@/lib/ritual-types";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type GenerationStatus = "waiting" | "generating" | "generated" | "failed";
export type ReviewStatus =
  | "waiting"
  | "reviewing"
  | "approved"
  | "revision_required";
export type DeliveryStatus = "waiting" | "sent" | "failed";

/** ritual_orders 테이블의 한 행 (조회 시) */
export interface RitualOrderRow extends RitualApplication {
  id: string;
  order_number: string;
  payment_amount: number;
  payment_status: PaymentStatus;
  generation_status: GenerationStatus;
  review_status: ReviewStatus;
  delivery_status: DeliveryStatus;
  created_at: string;
  updated_at: string;
}

/**
 * ritual_orders insert 시 서버에서 넘길 데이터.
 * id / order_number / 상태값 / 타임스탬프는 DB가 기본값으로 채우므로
 * 신청폼 데이터(RitualApplication)만 그대로 넘기면 됩니다.
 *
 * 다음 단계 사용 예 (Route Handler 안):
 *   const payload: RitualOrderInsert = application; // 매핑 코드 불필요
 *   await supabaseAdmin.from("ritual_orders").insert(payload);
 */
export type RitualOrderInsert = RitualApplication & {
  payment_amount?: number; // 생략 시 DB 기본값 16900
};

/** ritual_results 테이블의 한 행 */
export interface RitualResultRow {
  id: string;
  order_id: string;
  result_version: number;
  /** PART 01~14 + BONUS 구조를 담는 JSONB (형식은 AI 단계에서 확정) */
  generated_content: Record<string, unknown> | null;
  generated_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  /** 결과 페이지 접근 토큰 (DB가 자동 생성, 48자 hex) */
  result_token: string;
  created_at: string;
  updated_at: string;
}
