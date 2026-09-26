-- ============================================================
-- CS 챗봇 이용 카운트 테이블 (익명 — 대화 내용·개인정보 저장 안 함)
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 전체 붙여넣기 → Run
-- 코드 배포 전이든 후든 상관없습니다. (테이블이 없으면 집계만 생략됨)
-- ============================================================

create table if not exists cs_chat_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  authenticated boolean not null default false,  -- 본인확인 후 대화였는지
  topic text                                     -- refund/payment/result/email/service/other
);

-- 외부(브라우저) 접근 차단: RLS 켜고 정책 없음 = service_role만 접근
alter table cs_chat_events enable row level security;

create index if not exists cs_chat_events_created_at_idx
  on cs_chat_events (created_at desc);
