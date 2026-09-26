-- ============================================================
-- 월하연 가격 변경: 16,900원 → 12,900원 (런칭 특가)
--
-- ⚠ 반드시 "코드 배포 전에" 이 SQL을 먼저 실행하세요.
--    (코드가 먼저 배포되고 DB가 아직 16,900이면
--     새 주문·기존 대기 주문의 결제 검증이 어긋나 결제가 막힙니다)
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 아래 전체 붙여넣기 → Run
-- ============================================================

-- 1) 새 주문의 기본 결제 금액을 12,900원으로
alter table ritual_orders
  alter column payment_amount set default 12900;

-- 2) 아직 결제하지 않은 기존 주문도 새 가격으로 통일
--    (이미 결제된 paid 주문은 건드리지 않음)
update ritual_orders
  set payment_amount = 12900
  where payment_status = 'pending';

-- 3) 확인 (선택): 아래를 실행하면 pending 주문이 전부 12900인지 볼 수 있어요
-- select payment_status, payment_amount, count(*)
--   from ritual_orders
--   group by payment_status, payment_amount
--   order by payment_status;
