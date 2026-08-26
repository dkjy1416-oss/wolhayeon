-- ============================================================
-- 월하연 — 관리자 검수 필드 추가
-- 파일: supabase/migrations/20260826000004_admin_review_fields.sql
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 붙여넣고 Run.
--
-- generated_content = AI가 처음 생성한 원본. 절대 수정하지 않음.
-- reviewed_content  = 관리자가 검수·수정한 고객 제공용 최종 콘텐츠.
-- review_notes      = 관리자 내부 검수 메모.
--
-- RLS는 기존 그대로 유지됩니다. (정책 없음 → anon/authenticated
-- 전면 차단, service_role 서버 접근만 가능)
-- ============================================================

alter table public.ritual_results
  add column reviewed_content jsonb,
  add column review_notes text not null default '';

comment on column public.ritual_results.reviewed_content is
  '관리자 검수본(고객 제공용 최종). AI 원본 generated_content는 절대 덮어쓰지 않음.';
comment on column public.ritual_results.review_notes is
  '관리자 내부 검수 메모 (고객에게 노출되지 않음).';
