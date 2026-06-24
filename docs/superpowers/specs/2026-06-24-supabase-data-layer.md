# 2026-06-24 — Supabase 数据层接入设计

> 接 v2 需求文档（FR-41/42/44/64 等）。把数据层从「localStorage 唯一」升级为「匿名 → localStorage，登录后 → Supabase」，并把豆包 24h 过期图片转存到 Supabase Storage 永久保留。

## 目标

1. 登录用户的数据上云，多端一致。
2. 匿名用户继续可离线使用，数据存 localStorage。
3. AI 配图从「24h 签名 URL」改为「Supabase Storage 永久 key」，导出 / 分享 / 多端访问都不再受过期影响。
4. 现有页面体验不变；只是底层 repo 切换为 auth-aware。

## 范围

**做：**
- Supabase project：schema + RLS + Storage bucket
- Browser / Server clients
- 邮箱魔法链接登录 UI + callback
- `Repository` 抽象 + `LocalRepository` + `SupabaseRepository`
- `AuthProvider` 上下文
- 首次登录迁移弹窗
- `/api/advise` 改为落库前先把图传到 Supabase Storage
- 现有 5 个页面（home / log / history / profile / settings）改异步

**不做：**
- 多账号 / 团队 / 邀请
- 实时订阅（用 `refetch` 而非 `subscribe`）
- 离线 IndexedDB（用户明确跳过）
- 复杂的 conflict 合并（单写者，不做 OT/CRDT）

## 架构

### 目录
```
supabase/
  migrations/0001_init.sql        # schema + RLS + storage policies
src/
  lib/supabase/
    client.ts                     # createBrowserClient(URL, ANON_KEY)
    server.ts                     # createClient(URL, SERVICE_ROLE_KEY) — 仅 server
    storage.ts                    # uploadAdviceImage / getSignedUrl
  lib/repo/
    types.ts                      # Repository 接口
    local.ts                      # 现有 store.ts 行为封装
    supabase.ts                   # Supabase 实现
    index.ts                      # createRepository(session) → Local | Supabase
  components/AuthProvider.tsx     # user / signInWithMagicLink / signOut / loading
  app/auth/
    page.tsx                      # 邮箱表单
    callback/route.ts             # code → session
  app/api/
    image-storage/route.ts        # 由 storage key 返 signed URL（同源兜住 CORS）
```

### 数据流
- **匿名**：`createRepository(null) → LocalRepository`，所有 read/write 走 `window.localStorage`，现状 100% 兼容。
- **登录**：`createRepository(session) → SupabaseRepository`，所有 read/write 走 Postgres + RLS。
- **AI 图**：
  1. 客户端 POST `/api/advise`（带 session）
  2. 服务端跑 advice 逻辑、调豆包拿 URL
  3. 服务端 `fetch(豆包URL)` 拿二进制 → `supabase.storage.from('advices').upload('${userId}/${date}.png', blob)`
  4. DB 写 `image_storage_key = 'advices/${userId}/${date}.png'`
  5. 客户端读 advice → 拿 `image_storage_key` → 请求 `/api/image-storage?key=...` → 返回 signed URL → `html2canvas` 导出

### 关键 API 变化
- 全部 repo 方法从同步改 `async`
- 新增 hooks：`useProfile()` / `useAdvices()` / `useLogs()` / `useSettings()`，包 loading + error
- 旧的 `repo.getX()` / `repo.saveX()` 在 page 里消失

## Schema

```sql
-- profiles: 1-1 with auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  gender text not null check (gender in ('male','female')),
  age smallint not null check (age between 10 and 120),
  height_cm numeric(5,1) not null check (height_cm between 80 and 250),
  weight_kg numeric(5,1) not null check (weight_kg between 20 and 300),
  activity text not null check (activity in ('sedentary','light','moderate','active','very_active')),
  goal text not null check (goal in ('lose','maintain','gain')),
  diet_preference text not null check (diet_preference in ('balanced','low_carb','mediterranean','vegetarian','vegan','keto','high_protein','dash','halal')),
  updated_at timestamptz not null default now()
);

-- daily_advices: 当日营养 + 运动 + 配图
create table public.daily_advices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  source text not null check (source in ('local','doubao')),
  summary text not null,
  meals jsonb not null,            -- { breakfast, lunch, dinner, snacks? }
  exercise jsonb not null,         -- { warmup, main, cooldown, total_minutes, intensity }
  image_storage_key text,          -- 存到 storage 后回写；null 表示还没生成
  image_prompt text,
  bmr int not null,
  tdee int not null,
  bmi numeric(4,1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
create index on public.daily_advices(user_id, date desc);

-- daily_logs: 实际饮食 / 运动 / 体重 / 心情
create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  breakfast_actual text,
  lunch_actual text,
  dinner_actual text,
  exercise_actual text,
  weight_kg numeric(5,1),
  mood smallint check (mood between 1 and 5),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
create index on public.daily_logs(user_id, date desc);

-- 通用 updated_at trigger
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.tg_touch_updated_at();
create trigger trg_advices_updated_at before update on public.daily_advices
  for each row execute function public.tg_touch_updated_at();
create trigger trg_logs_updated_at before update on public.daily_logs
  for each row execute function public.tg_touch_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.daily_advices enable row level security;
alter table public.daily_logs enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own advices" on public.daily_advices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own logs" on public.daily_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket: advices (private; 用 signed URL)
insert into storage.buckets (id, name, public) values ('advices', 'advices', false) on conflict do nothing;

create policy "own advices read" on storage.objects
  for select using (bucket_id = 'advices' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own advices write" on storage.objects
  for insert with check (bucket_id = 'advices' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own advices update" on storage.objects
  for update using (bucket_id = 'advices' and auth.uid()::text = (storage.foldername(name))[1]);
```

## Auth

- `AuthProvider`（'use client'）在 layout 包一层：
  - `useEffect` 内 `supabase.auth.getSession()` 初始化
  - `supabase.auth.onAuthStateChange(...)` 推 user 状态
  - 暴露 `user / session / loading / signInWithMagicLink(email) / signOut()`
- `/auth` 页面：单输入框 + 「发送登录链接」按钮
- `/auth/callback`（route handler）：接 `code` query → `supabase.auth.exchangeCodeForSession(code)` → 302 → `/`
- 邮件模板用 Supabase 默认（Settings → Auth → Email Templates）

## 首次登录迁移

- `AuthProvider` 在 `SIGNED_IN` 事件触发时，检查 `localStorage` 里有没有 profile / advices / logs
- 有则 `setMigrationOffer({ profile, advices, logs })` → Shell 弹 modal
- modal 选项：
  1. **全部上传**：循环 `repo.supabase.upsertX(localX)`，图片逐条 `fetch(豆包URL) → supabase.storage.upload`
  2. **只迁 profile**：只 upsert profile，其它丢弃
  3. **跳过**：什么都不动，localStorage 数据保留作读缓存
- 完成后 modal 关，并把 `migration_offered_at = now()` 写进 `localStorage`，下次不再弹
- 错误：上传失败的图片 / 行进 `migration_errors[]` 显示给用户，可点重试

## 测试

- **单元**：`Repository` 契约（mock 两个实现跑同样用例）
  - profile upsert / get
  - advice upsert / list / getByDate
  - log upsert / list / getByDate
- **单元**：`localRepository` 行为不变（现有 5 个用例通过）
- **单元**：`migrateLocalToSupabase` mock fetch + supabase storage → 校验上传路径 / 错误聚合
- **单元**：`buildStoragePath(userId, date)` 单测
- **E2E**（playwright，跳过 e2e 跑通只跑 mock）：
  - 登录后生成 advice → 断言 image_storage_key 非空
  - 登出 → 重新登录 → advice 还在

## 风险 / 限制

- `supabase-js` 体积 +~30KB gzip，可接受
- 魔法链接可能进垃圾邮件 → README 文档告知
- 不做 conflict merge；最后写者赢（先 anon 再登录，迁移走 explicit 路径）
- 豆包 24h URL 在迁移阶段仍需 image-proxy；迁移完成后用 storage key
- 老的本地 advice 记录里 image_url 是豆包临时 URL，迁移时图过期了只能 re-call `/api/advise?force=true` 才能再画

## 凭证 / 配置

新增 env（`.env.example` 占位，`.env.local` 真实值不入仓）：
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # 仅服务端使用
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## 落地顺序

1. 装包 / 写 env / 写 migration SQL
2. supabase clients + AuthProvider
3. `/auth` 页面 + callback
4. repo 抽象 + LocalRepository
5. SupabaseRepository
6. `/api/advise` 改造（先拉图到 storage 再写库）
7. `/api/image-storage` 路由
8. 5 个页面改 async
9. 迁移 modal
10. 测试 / build / 文档同步
11. commit + push

## 验证

- `npx tsc --noEmit` 通过
- `npm run test` 全绿
- `npm run build` 成功
- 本地能跑通：匿名 demo 路径完全无感
- 真实 Supabase：注册 → 登录 → 生成 advice（图片落 storage）→ 登出 → 重新登录 → 数据 / 图片都在
- 文档：`README.md`、`DEVELOPMENT_LOG.md`、v2 需求文档同步
