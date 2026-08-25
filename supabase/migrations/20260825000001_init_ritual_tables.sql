-- ============================================================
-- 월하연 (月下緣) — 4단계 데이터베이스 초기 스키마
-- 파일: supabase/migrations/20260825000001_init_ritual_tables.sql
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 이 파일 전체를
-- 붙여넣고 Run. (또는 supabase CLI: supabase db push)
--
-- 설계 원칙
--  1) 컬럼 이름은 신청폼의 RitualApplication TypeScript key와
--     1:1로 완전히 동일합니다. (lib/ritual-types.ts 참고)
--     → 매핑 코드 없이 그대로 insert 가능, 필드 누락/오타 방지.
--  2) 상태값은 ENUM 대신 CHECK 제약을 사용합니다.
--     ENUM은 값 추가/삭제 시 ALTER TYPE이 번거롭지만,
--     CHECK는 제약만 교체하면 되어 유지보수가 쉽습니다.
--  3) RLS를 켜고 정책을 하나도 만들지 않습니다.
--     → 브라우저(anon/authenticated key)에서는 SELECT/INSERT/
--       UPDATE/DELETE 전부 거부됩니다.
--     → 서버(Next.js Route Handler/Server Action)에서
--       service_role key로만 접근합니다. (RLS 우회)
-- ============================================================

-- 필요 확장: gen_random_bytes(결과 토큰용) — Supabase에는 기본 활성화되어
-- 있어 이미 실행하셨다면 추가 조치가 필요 없습니다. (if not exists라 재실행 안전)
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 공용: updated_at 자동 갱신 트리거 함수
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 공용: 주문번호 생성 함수
-- 형식: WH-YYYYMMDD-XXXXX
--  - 개인정보를 포함하지 않음 (날짜 + 무작위 5자)
--  - 혼동되는 문자(O/0/I/1/L) 제외 알파벳 사용
--  - 주문번호만으로는 어떤 데이터에도 접근 불가
--    (결과 페이지 접근은 ritual_results.result_token 사용)
-- ------------------------------------------------------------
create or replace function public.generate_order_number()
returns text
language plpgsql
as $$
declare
  chars constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  suffix text := '';
  i int;
begin
  for i in 1..5 loop
    suffix := suffix || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  end loop;
  return 'WH-' || to_char(now() at time zone 'Asia/Seoul', 'YYYYMMDD') || '-' || suffix;
end;
$$;

-- ------------------------------------------------------------
-- 1) ritual_orders — 신청 원본 + 주문/진행 상태
-- ------------------------------------------------------------
create table public.ritual_orders (
  id uuid primary key default gen_random_uuid(),

  -- 사람이 관리하기 쉬운 주문번호 (예: WH-20260825-A7K3P)
  order_number text not null unique default public.generate_order_number(),

  /* ---------- 신청폼 필드 (RitualApplication과 1:1) ---------- */
  applicant_name text not null,                 -- Q1 신청자 이름/닉네임
  partner_name text not null,                   -- Q2 상대 이름/닉네임
  relationship_type text not null,              -- Q3 현재 관계 (영문 value)
  relationship_type_other text not null default '', -- Q3 '기타' 추가 입력
  relationship_duration text not null,          -- Q4 관계 기간
  breakup_elapsed text,                         -- Q5a 이별 후 경과 (조건부, null 허용)
  breakup_initiator text,                       -- Q5b 먼저 말한 사람 (조건부, null 허용)
  last_conversation text not null,              -- Q6 마지막 대화 시점
  contact_status text not null,                 -- Q7 연락 가능 상태 (안전 조절용 핵심)
  partner_new_relationship text not null,       -- Q8 상대의 새 연인 여부
  pain_points text[] not null default '{}',     -- Q9 가장 힘든 것 (최대 3)
  main_wish text not null,                      -- Q10 가장 바라는 것 (개인화 핵심)
  story text not null,                          -- Q11 상세 사연 (~2000자)
  last_conversation_memory text not null default '', -- Q12 마음에 남은 것 (선택)
  wish_sentence text not null default '',       -- Q13 듣고 싶은 한마디 (선택)
  desired_change text not null default '',      -- Q14 달라졌으면 하는 점 (선택)
  current_emotion text not null,                -- Q15 현재 감정
  safety_concerns text[] not null default '{}', -- Q16 안전/경계 (AI 안전수준 조절용)
  safety_concerns_other text not null default '', -- Q16 '기타' 추가 입력 (~300자)
  email text not null,                          -- Q17 결과 수신 이메일
  consent_processing boolean not null default false,   -- 동의: 정보 처리 (필수)
  consent_no_guarantee boolean not null default false, -- 동의: 결과 비보장 확인 (필수)
  consent_marketing boolean not null default false,    -- 동의: 마케팅 수신 (선택)

  /* ---------- 주문/진행 상태 ---------- */
  payment_amount integer not null default 16900,  -- 결제 금액(원)
  payment_status text not null default 'pending'
    constraint ritual_orders_payment_status_check
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  generation_status text not null default 'waiting'
    constraint ritual_orders_generation_status_check
    check (generation_status in ('waiting', 'generating', 'generated', 'failed')),
  review_status text not null default 'waiting'
    constraint ritual_orders_review_status_check
    check (review_status in ('waiting', 'reviewing', 'approved', 'revision_required')),
  delivery_status text not null default 'waiting'
    constraint ritual_orders_delivery_status_check
    check (delivery_status in ('waiting', 'sent', 'failed')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ritual_orders_set_updated_at
  before update on public.ritual_orders
  for each row execute function public.set_updated_at();

-- 관리/조회용 인덱스
create index ritual_orders_created_at_idx on public.ritual_orders (created_at desc);
create index ritual_orders_email_idx on public.ritual_orders (email);
create index ritual_orders_payment_status_idx on public.ritual_orders (payment_status);

-- ------------------------------------------------------------
-- 2) ritual_results — AI 생성 결과 (신청 원본과 분리)
--
-- 분리 이유:
--  - 결과는 재생성/수정(검수) 시 버전이 늘어날 수 있음 → 1:N
--  - 신청 원본(개인정보)과 접근 경로를 분리해 보안 관리 용이
--  - 결과 페이지는 result_token으로만 접근 (주문번호로 접근 불가)
--
-- generated_content 는 JSONB:
--  - PART 01~14 + BONUS를 { "part_01": {...}, ..., "bonus": {...} }
--    형태로 구조적으로 저장/부분 수정 가능
--  - 구조가 확정되기 전에도 스키마 변경 없이 확장 가능
-- ------------------------------------------------------------
create table public.ritual_results (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ritual_orders (id) on delete cascade,

  result_version integer not null default 1,      -- 재생성 시 2, 3, ...
  generated_content jsonb,                        -- PART 01~14 + BONUS 구조 저장
  generated_at timestamptz,                       -- AI 생성 완료 시각
  reviewed_at timestamptz,                        -- 관리자 검수 시각
  approved_at timestamptz,                        -- 승인(공개 가능) 시각

  -- 결과 페이지 접근 토큰: 48자리 hex (192bit 무작위) — 추측 불가
  -- 향후 URL 예: /result/{result_token}
  result_token text not null unique
    default encode(gen_random_bytes(24), 'hex'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 같은 주문의 같은 버전은 하나만
  constraint ritual_results_order_version_unique unique (order_id, result_version)
);

create trigger ritual_results_set_updated_at
  before update on public.ritual_results
  for each row execute function public.set_updated_at();

create index ritual_results_order_id_idx on public.ritual_results (order_id);

-- ------------------------------------------------------------
-- 3) RLS (Row Level Security)
--
-- 두 테이블 모두 RLS를 켜고 정책(policy)을 만들지 않습니다.
--  → anon key / authenticated key로는 모든 접근이 거부됩니다.
--  → 오직 서버 전용 service_role key만 접근할 수 있습니다.
--    (service_role은 RLS를 우회하며, 절대 브라우저에 노출 금지)
--
-- 향후 결과 페이지 공개가 필요해지면 그때 서버(Route Handler)에서
-- token 검증 후 조회하는 방식을 유지하고, 브라우저 직접 조회
-- 정책은 만들지 않는 것을 권장합니다.
-- ------------------------------------------------------------
alter table public.ritual_orders enable row level security;
alter table public.ritual_results enable row level security;

-- 명시적으로 기본 권한도 제거 (이중 안전장치)
revoke all on public.ritual_orders from anon, authenticated;
revoke all on public.ritual_results from anon, authenticated;

-- ------------------------------------------------------------
-- 설명 주석 (Supabase 대시보드에서 확인 가능)
-- ------------------------------------------------------------
comment on table public.ritual_orders is
  '월하연 리추얼 신청 원본 + 주문 상태. 컬럼명은 앱의 RitualApplication key와 1:1. 서버(service_role) 전용.';
comment on table public.ritual_results is
  'AI 생성 결과 (버전 관리). 결과 페이지는 result_token으로만 접근. 서버(service_role) 전용.';
comment on column public.ritual_orders.order_number is
  '고객 안내용 주문번호. 개인정보 미포함. 이 번호만으로는 데이터 접근 불가.';
comment on column public.ritual_results.result_token is
  '결과 페이지 접근용 192bit 무작위 토큰. 이메일 링크에 사용 예정.';
