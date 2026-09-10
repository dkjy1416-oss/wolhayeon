-- CS 자동화: 환불/열람 기록 필드 + CS 검증·액션·인시던트 테이블
-- (모든 접근은 service-role 전용 — 기존 테이블과 동일한 RLS 잠금 정책)

-- 1) 주문: 환불/결과 열람 기록 (기존 payment_status 제약은 이미 refunded 포함)
alter table public.ritual_orders
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_reason text,
  add column if not exists result_first_opened_at timestamptz,
  add column if not exists result_last_opened_at timestamptz,
  add column if not exists result_open_count integer not null default 0;

-- 2) OTP 본인확인 (plain OTP 저장 금지 — hash만)
create table if not exists public.cs_verifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ritual_orders(id) on delete cascade,
  email text not null,
  purpose text not null check (purpose in ('order_access', 'email_change_new')),
  otp_hash text not null,
  new_email text,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists cs_verifications_order_idx
  on public.cs_verifications (order_id, purpose, created_at desc);

-- 3) CS 자동 액션 로그 (민감정보 저장 금지 — 코드/상태만)
create table if not exists public.cs_actions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.ritual_orders(id) on delete set null,
  action_type text not null,
  status text not null,
  detail text,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);
create index if not exists cs_actions_order_idx
  on public.cs_actions (order_id, action_type, created_at desc);

-- 4) 자동 incident (사람 상담 없이 시스템이 추적)
create table if not exists public.cs_incidents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.ritual_orders(id) on delete set null,
  kind text not null,
  status text not null default 'open',
  detail text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- RLS: 전부 잠금 (service-role만)
alter table public.cs_verifications enable row level security;
alter table public.cs_actions enable row level security;
alter table public.cs_incidents enable row level security;
revoke all on public.cs_verifications from anon, authenticated;
revoke all on public.cs_actions from anon, authenticated;
revoke all on public.cs_incidents from anon, authenticated;
