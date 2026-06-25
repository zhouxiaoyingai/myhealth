# MyHealth MVP

MyHealth 是一个本地优先 + Supabase 云端同步的 AI 健康生活方式助手 MVP。
- **匿名用户**：所有数据存在浏览器 localStorage，离线可用；
- **登录用户**（Supabase Auth 魔法链接）：档案、建议、打卡同步到 Supabase Postgres；
  AI 配图会经服务端代理后转存到 Supabase Storage（永久保存），不再依赖豆包临时 URL。

## 页面范围

- `/`：今日建议、饮食/运动卡片、BMR/TDEE/目标热量/BMI/宏量指标、提醒与免责声明
- `/profile`：8 字段档案表单，使用 `react-hook-form` + `zod` 做校验
- `/log`：饮食、运动、体重、心情打卡，支持 7 天内补录
- `/history`：30 天日历、体重趋势、心情趋势、连续打卡与勋章
- `/settings`：主题、账号状态、数据导出/清除
- `/auth`：魔法链接登录（Supabase Auth）

## 开发命令

```bash
npm install
npm run dev
npm run lint
npm run test
npm run build
npm run test:e2e
npm run migrate   # 跑 supabase/migrations/0001_init.sql
```

## Supabase 接入步骤（新项目最干净）

1. Supabase Dashboard → New project，记下 4 个值；项目创建完成（通常 1-2 分钟）后去 Project Settings 取：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **API → anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **API → service_role** → `SUPABASE_SERVICE_ROLE_KEY`（**仅服务端用，不要暴露给浏览器**）
   - **Database → Connection string → Direct connection** → `SUPABASE_DB_URL`
2. 把这 4 个值填到 `.env.local`（参考 `.env.example`）。
3. `npm run migrate` 一次：脚本会幂等跑 `0001_init.sql`，建好 3 张表 + RLS + `advices` storage bucket（private）+ owner-only 存储策略。
4. Dashboard → Authentication → URL Configuration → Redirect URLs 加 `<your-origin>/auth/callback`（点魔法链接时回跳用）。Email provider 默认就是开的，不用动。
5. 跑起来：`npm run dev` → 访问 `/auth` → 输入邮箱 → 收到一次性登录链接 → 点链接完成登录。
   首次登录若本地有数据会弹迁移对话框：全部上云 / 只上档案 / 暂不上传。

> 整个流程 0 个手工 SQL、0 个手工建表、0 个手工建 bucket —— 除了第 4 步加一个回跳 URL。

## 仓库抽象

`src/lib/repo/`：
- `types.ts` — `Repository` 接口 + 行/应用层互转
- `local.ts` — `LocalRepository`（localStorage）
- `supabase.ts` — `SupabaseRepository`（Postgres）
- `index.ts` — `useRepository()` hook：根据 `AuthProvider.status` 切换实现
- `migrate.ts` — `migrateLocalToSupabase(client, userId, mode)` 单测覆盖

页面里全部用 `const repo = useRepository()` 拿实例，所有方法都是 async。

## 本地数据

- 匿名模式：localStorage 键 `myhealth.local.v1`（profile / advices / logs / settings）
- 登录模式：Supabase 表 `profiles` / `daily_advices` / `daily_logs`
- AI 配图：登录用户走 Supabase Storage bucket `advices`，路径 `<userId>/<YYYY-MM-DD>/{diet|exercise}.png`，前端通过 `/api/image-storage?key=...` 拿 1h signed URL 后用 `<img>` 加载

## 豆包配图

- 豆包 Seedream 返回的图片 URL 是带签名的临时地址（24h 有效）
- `/api/advise`：登录用户会走「豆包 → 服务端 fetch → 上传 Supabase Storage」流水线，response 里多带 `images.dietKey` / `images.exerciseKey`
- `/api/image-proxy`：仅白名单 `*.volces.com` / `ark.cn-beijing.volces.com` 域名，用于 html2canvas 同源下载，绕过 CORS
- `/api/image-storage`：登录用户用 storage key 换 1h signed URL（按 user id 验所有权）

## 健康边界

MyHealth 只提供生活方式参考，不做医疗诊断。如有疾病、孕产、未成年或身体不适，请咨询医生。
