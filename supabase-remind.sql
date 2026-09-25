-- 리마인드 메일 1회 발송 기록용 컬럼 (Supabase SQL Editor에서 실행)
alter table ritual_orders add column if not exists remind_sent_at timestamptz;
