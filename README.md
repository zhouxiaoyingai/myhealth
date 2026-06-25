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

## Supabase 接入步骤

1. 拿到项目 URL、Anon Key、Service Role Key，填到 `.env.local`（参考 `.env.example`）。
2. 在 Supabase Dashboard → Project Settings → Database → Connection string 拿 **Direct connection** URL，填到 `SUPABASE_DB_URL`。
3. `npm run migrate` 一次（创建表 + RLS + Storage policies）。
4. 在 Dashboard → Auth → URL Configuration → Redirect URLs 加入 `<your-origin>/auth/callback`。
5. 在 Dashboard → Authentication → Providers 确认 Email provider 开启（默认就是开）。
6. 在 Dashboard → Storage → advices bucket **创建 bucket**（如果 SQL 没自动建），把 Privacy 设成 private。

登录后：访问 `/auth` → 输入邮箱 → 收到一次性登录链接 → 点链接即完成登录。
首次登录时如果本地有数据，会弹迁移对话框：全部上云 / 只上档案 / 暂不上传。

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
