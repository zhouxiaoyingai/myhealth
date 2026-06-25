-- 2026-06-24 — myhealth 初始化 schema
-- 见 docs/superpowers/specs/2026-06-24-supabase-data-layer.md
-- 字段以 src/domain/types.ts 为准（已经定型的应用层类型）。

-- ============================================================
-- 1) profiles: 1-1 with auth.users
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  gender text not null check (gender in ('female','male','other')),
  age smallint not null check (age between 10 and 120),
  height_cm numeric(5,1) not null check (height_cm between 80 and 250),
  weight_kg numeric(5,1) not null check (weight_kg between 20 and 300),
  goal text not null check (goal in ('fat_loss','muscle_gain','maintenance')),
  activity text not null check (activity in ('sedentary','light','moderate','active')),
  diet text not null check (diet in (
    'balanced','mediterranean','dash','mind','low_carb',
    'high_protein','vegetarian','plant_based','intermittent_168'
  )),
  notes text not null default '',
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2) daily_advices: 当日营养 + 运动 + 配图
-- ============================================================
create table if not exists public.daily_advices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  source text not null check (source in ('local','fallback','doubao')),
  summary text not null,
  meals jsonb not null,        -- Meal[]: { name, items, protein, calories }
  exercise jsonb not null,     -- Exercise: { type, minutes, intensity, note }
  metrics jsonb not null,      -- Metrics: { bmr, tdee, targetCalories, protein, carbs, fat, bmi }
  images jsonb,                -- { dietKey?, exerciseKey?, source: 'doubao'|'fallback', error? }
  image_prompts jsonb,         -- { diet, exercise }
  warning text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists daily_advices_user_date_idx
  on public.daily_advices(user_id, date desc);

-- ============================================================
-- 3) daily_logs: 实际饮食 / 运动 / 体重 / 心情
-- ============================================================
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  meals_actual jsonb,          -- { breakfast, lunch, dinner, snack }
  exercise_actual jsonb,       -- { type, minutes, intensity, note }
  weight_kg numeric(5,1),
  mood smallint check (mood between 1 and 5),
  mood_note text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists daily_logs_user_date_idx
  on public.daily_logs(user_id, date desc);

-- ============================================================
-- 4) updated_at trigger
-- ============================================================
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.tg_touch_updated_at();

drop trigger if exists trg_advices_updated_at on public.daily_advices;
create trigger trg_advices_updated_at
  before update on public.daily_advices
  for each row execute function public.tg_touch_updated_at();

drop trigger if exists trg_logs_updated_at on public.daily_logs;
create trigger trg_logs_updated_at
  before update on public.daily_logs
  for each row execute function public.tg_touch_updated_at();

-- ============================================================
-- 5) RLS
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.daily_advices enable row level security;
alter table public.daily_logs    enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "own advices" on public.daily_advices;
create policy "own advices" on public.daily_advices
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own logs" on public.daily_logs;
create policy "own logs" on public.daily_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 6) Storage: advices bucket (private; 用 signed URL 访问)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('advices', 'advices', false)
on conflict (id) do nothing;

-- 路径约定：<userId>/<date>/<slot>.png  (slot ∈ {diet, exercise})
drop policy if exists "own advices read"   on storage.objects;
drop policy if exists "own advices write"  on storage.objects;
drop policy if exists "own advices update" on storage.objects;
drop policy if exists "own advices delete" on storage.objects;

create policy "own advices read"
  on storage.objects for select
  using (
    bucket_id = 'advices'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "own advices write"
  on storage.objects for insert
  with check (
    bucket_id = 'advices'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "own advices update"
  on storage.objects for update
  using (
    bucket_id = 'advices'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "own advices delete"
  on storage.objects for delete
  using (
    bucket_id = 'advices'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
