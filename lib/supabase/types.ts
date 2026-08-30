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
export type DeliveryStatus = "waiting" | "sending" | "sent" | "failed";

/** ritual_orders 테이블의 한 행 (조회 시) */
export interface RitualOrderRow extends RitualApplication {
  id: string;
  order_number: string;
  /** 결제 전 무료 미리보기 (전체 유료 결과 아님) */
  preview_content: Record<string, unknown> | null;
  preview_generated_at: string | null;
  payment_amount: number;
  payment_status: PaymentStatus;
  /** 토스페이먼츠 paymentKey (승인 성공 시에만 존재) */
  payment_key: string | null;
  payment_method: string | null;
  paid_at: string | null;
  generation_status: GenerationStatus;
  review_status: ReviewStatus;
  delivery_status: DeliveryStatus;
  /** Resend가 반환한 email id (발송 접수 성공 시) */
  delivery_email_id: string | null;
  /** 발송 당시 수신 주소 스냅샷 */
  delivery_to_email: string | null;
  /** 마지막 발송 시도 시각 */
  delivery_attempted_at: string | null;
  /** Resend 발송 요청 접수 성공 시각 */
  delivered_at: string | null;
  /** 관리자용 안전한 오류 코드 */
  delivery_error_code: string | null;
  /** 발송 시도 횟수 */
  delivery_attempt_count: number;
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
  /** 관리자 검수본 (고객 제공용 최종). AI 원본은 generated_content에 보존 */
  reviewed_content: Record<string, unknown> | null;
  /** 관리자 내부 검수 메모 */
  review_notes: string;
  generated_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  /** 결과 페이지 접근 토큰 (DB가 자동 생성, 48자 hex) */
  result_token: string;
  created_at: string;
  updated_at: string;
}
