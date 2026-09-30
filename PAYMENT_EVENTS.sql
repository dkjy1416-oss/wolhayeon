-- ============================================================
-- 결제 퍼널 이벤트 테이블
-- 주문번호 + 단계 이름 + (실패 시) 토스 오류 코드만 저장 — 개인정보 없음
--
-- 실행: Supabase 대시보드 → SQL Editor → 전체 붙여넣기 → Run
-- 코드 배포 전/후 순서 상관없음 (테이블이 없으면 기록만 조용히 생략)
-- ============================================================

create table if not exists payment_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  order_number text not null,
  event text not null,   -- preview_cta_click / pay_page_view / widget_ready / pay_request / pay_success / pay_fail ...
  code text              -- 토스 오류 코드(REJECT_CARD_COMPANY 등) 또는 open/closed
);

-- 외부(브라우저) 직접 접근 차단: 서버(service_role)만 기록·조회
alter table payment_events enable row level security;

create index if not exists payment_events_created_at_idx
  on payment_events (created_at desc);
create index if not exists payment_events_order_idx
  on payment_events (order_number);
