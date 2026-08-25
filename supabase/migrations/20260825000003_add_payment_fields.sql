-- ============================================================
-- 월하연 — 6단계: 토스페이먼츠 결제 승인 정보 컬럼 추가
-- 파일: supabase/migrations/20260825000003_add_payment_fields.sql
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 붙여넣고 Run.
--
-- payment_key: 토스페이먼츠가 결제 건마다 발급하는 고유 키.
--   결제 조회/취소/환불에 필요하므로 반드시 저장합니다.
--   (개인정보 아님. unique — 같은 결제가 두 번 기록되지 않음)
-- payment_method: 구매자가 선택한 결제수단 표시용 (예: 카드)
-- paid_at: 결제 승인 완료 시각
-- ============================================================

alter table public.ritual_orders
  add column payment_key text unique,
  add column payment_method text,
  add column paid_at timestamptz;

comment on column public.ritual_orders.payment_key is
  '토스페이먼츠 paymentKey. 결제 취소/조회에 사용. 승인 성공 시에만 기록.';
