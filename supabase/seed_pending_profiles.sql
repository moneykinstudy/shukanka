create table if not exists public.profiles_pending(
  email text primary key,
  nickname text,
  grade text,
  gender text,
  target_university text,
  target_faculty text,
  full_name text,
  created_at timestamp with time zone default now()
);

-- 誰でも INSERT/UPDATE できないように RLS を有効化し、Edge Function(Service Role)のみが動かす想定
alter table public.profiles_pending enable row level security;
drop policy if exists anon_rw on public.profiles_pending;
create policy anon_rw on public.profiles_pending for all
  to anon using (true) with check (true); -- 必要に応じて制限してください（最低限の検証用）
