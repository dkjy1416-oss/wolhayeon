-- ============================================================
-- 월하연 — 1차 개편: 신청자/상대 추가 정보 + 무료 미리보기 저장
-- 파일: supabase/migrations/20260827000006_applicant_profile_preview.sql
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 붙여넣고 Run.
--
-- 기존 행 보호: 모든 신규 컬럼은 nullable이며 CHECK는 null을
-- 허용하므로 기존 주문 데이터가 깨지지 않습니다.
-- RLS 정책은 변경하지 않습니다.
-- ============================================================

alter table public.ritual_orders
  add column applicant_gender text
    check (applicant_gender in ('female','male','other','prefer_not_to_say')),
  add column applicant_birth_year integer
    check (applicant_birth_year between 1900 and 2100),
  add column life_stage text
    check (life_stage in (
      'middle_high_school','university','job_seeking',
      'employee','self_employed','homemaker','other')),
  add column partner_gender text
    check (partner_gender in ('female','male','other','unknown')),
  add column partner_birth_year integer
    check (partner_birth_year between 1900 and 2100),
  add column preview_content jsonb,
  add column preview_generated_at timestamptz;

comment on column public.ritual_orders.applicant_gender is
  '신청자 성별 (female/male/other/prefer_not_to_say)';
comment on column public.ritual_orders.applicant_birth_year is
  '신청자 출생연도 4자리 (연령대 분기용 — 미성년자 보호 콘텐츠 기반)';
comment on column public.ritual_orders.life_stage is
  '신청자 현재 생활단계';
comment on column public.ritual_orders.partner_gender is
  '상대방 성별 (선택 입력, null 가능)';
comment on column public.ritual_orders.partner_birth_year is
  '상대방 출생연도 (선택/모름 — null 가능)';
comment on column public.ritual_orders.preview_content is
  '결제 전 무료 미리보기 JSON (전체 유료 결과 아님). 재호출 방지 캐시.';
comment on column public.ritual_orders.preview_generated_at is
  '미리보기 생성 선점/완료 시각 (Anthropic 중복 호출 방지)';
