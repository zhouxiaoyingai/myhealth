# Development Log

## Current Goal

Build the `myhealth` repository into a locally runnable MVP for the AI health assistant, then commit and push the result to `zhouxiaoyingai/myhealth`.

## Confirmed Decisions

- Build local-first now because Supabase and Doubao credentials are not available yet.
- Store app data in a local browser database, with fallback persistence.
- Use SVG illustrations for advice-card visuals before real text-to-image integration.
- Prioritize completed major pages, polished design, and good user experience.
- Use Next.js 15, TypeScript, Tailwind CSS, local shadcn-style UI primitives, react-hook-form, zod, Vitest, and Playwright.
- Commit directly to `main`.
- Organize the repository as a conventional software project.
- Treat health guidance as lifestyle advice only, not medical diagnosis.
- User needs development to continue after local shutdown; this requires a cloud/remote development environment, because the current workspace is local-only.

## Completed

- Initialized and pushed the documentation-only repository to GitHub.
- Read the requirement document and both design-system documents.
- Collected and resolved blocking product/technical questions.
- Wrote the proposed MVP implementation plan at `docs/superpowers/plans/2026-06-23-myhealth-mvp.md`.

## Completed

- Initialized Next.js 15 + TypeScript + Tailwind project files.
- Implemented local-first domain calculations, deterministic advice generation, and browser persistence.
- Built MVP pages: `/`, `/profile`, `/log`, `/history`, `/settings`, `/auth`.
- Added SVG fallback illustrations and local `/api/advise` route.
- Added Vitest domain coverage and Playwright route smoke tests.
- Added README and environment variable documentation.

## Current Blocker

None for local MVP implementation. Supabase and Doubao/Seedream integrations remain future work until credentials are available.

## Next Step

Run verification (`npm run lint`, `npm run test`, `npm run build`, `npm run test:e2e`), fix any issues, commit, and push `main`.

## 2026-06-23 MVP Implementation Update

- Built local runnable MVP structure with Next.js App Router pages and local-first persistence.
- Implemented deterministic health metrics, advice generation, compatibility warnings, daily logs, history, settings, auth placeholder, SVG illustrations, tests, and documentation.
- Verification attempted but dependency installation is blocked by registry 403 responses in the execution environment; npm scripts cannot run until dependencies are installable.

## 2026-06-23 Follow-up Polish

- Refactored the rushed one-line implementation into maintainable multi-line TypeScript and JSX files.
- Improved advice templates so each of the 9 diet plans has distinct meal guidance instead of reusing a single generic template.
- Improved profile validation feedback, log save feedback, settings repository names, navigation accessibility, and ESLint configuration.
- Dependency installation and GitHub push may still be blocked by the current environment's 403 network/proxy policy.

## 2026-06-24 AI Card 闭环 (FR-10 / FR-64)

- 豆包 Seedream 已接通：饮食 / 运动两张卡片均接入 `/api/advise` → `attachDoubaoImages`，并按 `images.source` 区分豆包 / 降级。
- 新增 `/api/image-proxy`（仅放行 `*.volces.com` / `ark.cn-beijing.volces.com` 等白名单），给 `crossOrigin="anonymous"` 的 `<img>` 配 `Access-Control-Allow-Origin: *`，解决豆包临时签名图导致 html2canvas 画布被污染的问题。
- 首页「保存卡片」从 `alert('本地 MVP…')` 改为真实 html2canvas → PNG → `<a download>` 流程：失败有降级文案，loading 期间按钮 disabled。
- `Illustration` 组件加水印「AI 生成 · 仅作示意」、加载态、失败角标 + 「重新生成」按钮，满足 FR-64。
- 新增 Vitest：`tests/domain/imageProxy.test.ts` 校验代理 URL 编码。
- 同步文档：需求文档 FR-06 / 场景 1 由「早/午/晚/加餐」→「早/午/晚 3 餐」；MVP 计划「Doubao unavailable / use SVG」→「Doubao available / SVG fallback retained」；README 补一句豆包 URL 24h 临时签名说明。
- 验证：`npx tsc --noEmit` / `npm run build` / `npm run test` 全绿；新增路由 `/api/image-proxy` 出现在 build 产物中。

## Next Step (2026-06-24+)

1. 本地数据层升级：repository 接口保留，底层 localStorage → IndexedDB，连同把豆包图转 blob 缓存，避免 24h 失效。
2. 历史页真实回看：点击某天 → 当日建议 + 实际打卡对比 + 简短差异。
3. Supabase / Auth：在前两步稳定后再接，避免把问题扩大到账号 + RLS + 同步冲突。
