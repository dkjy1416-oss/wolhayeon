-- ============================================================
-- 월하연 — 5단계: 중복 제출 방지(idempotency)용 컬럼 추가
-- 파일: supabase/migrations/20260825000002_add_submission_id.sql
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 붙여넣고 Run.
--
-- submission_id 는 브라우저가 신청 세션마다 1회 생성하는
-- 무작위 UUID입니다. (개인정보 아님, 이름/이메일과 무관)
-- 같은 신청 세션에서 버튼을 연속으로 눌러 요청이 두 번 와도
-- unique 제약 덕분에 주문은 1건만 생성되고, 서버는 이미 만들어진
-- 주문의 주문번호를 그대로 돌려줍니다.
-- ============================================================

alter table public.ritual_orders
  add column submission_id uuid unique;

comment on column public.ritual_orders.submission_id is
  '중복 제출 방지용 세션 UUID (개인정보 아님). 같은 값으로 두 번 insert 불가.';
