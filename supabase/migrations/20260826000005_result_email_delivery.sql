-- ============================================================
-- 월하연 — 결과 이메일 발송 필드
-- 파일: supabase/migrations/20260826000005_result_email_delivery.sql
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 붙여넣고 Run.
--
-- 1) delivery_status 허용값에 'sending' 추가
--    (동시 발송 방지를 위한 선점 상태)
-- 2) 발송 기록 컬럼 추가
--
-- RLS 정책은 변경하지 않습니다. (service_role 서버 접근만 유지)
-- ============================================================

alter table public.ritual_orders
  drop constraint ritual_orders_delivery_status_check;

alter table public.ritual_orders
  add constraint ritual_orders_delivery_status_check
  check (delivery_status in ('waiting', 'sending', 'sent', 'failed'));

alter table public.ritual_orders
  add column delivery_email_id text,
  add column delivery_to_email text,
  add column delivery_attempted_at timestamptz,
  add column delivered_at timestamptz,
  add column delivery_error_code text,
  add column delivery_attempt_count integer not null default 0;

comment on column public.ritual_orders.delivery_email_id is
  'Resend가 반환한 email id (발송 요청 접수 성공 시에만 기록)';
comment on column public.ritual_orders.delivery_to_email is
  '실제 발송 당시 수신 주소 스냅샷';
comment on column public.ritual_orders.delivery_attempted_at is
  '마지막 발송 시도 시각';
comment on column public.ritual_orders.delivered_at is
  'Resend API가 발송 요청을 성공적으로 접수한 시각';
comment on column public.ritual_orders.delivery_error_code is
  '관리자용 안전한 오류 코드만 저장 (원문 오류/개인정보 금지)';
comment on column public.ritual_orders.delivery_attempt_count is
  '발송 시도 횟수';
