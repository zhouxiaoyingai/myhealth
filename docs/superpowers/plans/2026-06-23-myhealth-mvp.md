# MyHealth MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `E:\myhealth` into a locally runnable AI health assistant MVP with polished core pages, local persistence, SVG-based generated-card visuals, tests, documentation, commits, and push to `zhouxiaoyingai/myhealth`.

**Architecture:** Use a Next.js App Router application with a local-first data layer. The app stores profiles, daily advice, and daily logs in IndexedDB through a typed repository interface, while API/provider boundaries are shaped so Supabase and Doubao can be added later without rewriting screens. Health advice uses deterministic local generation and safe fallback copy; generated images are SVG compositions rendered inside the app.

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind CSS, shadcn-style local UI primitives, react-hook-form, zod, IndexedDB/localStorage fallback, Recharts or lightweight SVG charts, Vitest, Playwright.

---

## Confirmed Product Decisions

- Supabase is not available yet; implement local database storage first.
- Doubao/Seedream is now wired through the server-side `/api/advise` route and shows a real AI image on the home card; keep the SVG illustration as the explicit fallback for offline / credential-missing / upstream-error cases.
- Prioritize completing major functional pages and a good user experience.
- Use the recommended technical stack.
- Commit directly to `main`.
- Reorganize the repository according to software engineering conventions.
- Health boundary is agreed: lifestyle guidance only, not medical diagnosis.
- User also requires development to continue after the local computer is shut down; this requires a cloud/remote execution environment because the current `E:\myhealth` checkout is local-only.

## MVP Scope

- `/`: today dashboard with two advice cards, metrics, reminder card, regenerate action, save-as-image action, and medical disclaimer.
- `/profile`: 8-field profile form with validation and local persistence.
- `/log`: daily check-in for meals, exercise, weight/BMI, mood, and note.
- `/history`: 30-day calendar, weight trend, mood trend, selected-day review, streak and badge summary.
- `/settings`: theme preference, export local data, clear local data, future cloud sync placeholder.
- `/auth`: non-blocking future Supabase login screen explaining that local mode is active.

## Execution Environment Requirement

The implementation can start locally, but uninterrupted development after shutdown requires moving execution to a cloud workspace that can clone `https://github.com/zhouxiaoyingai/myhealth.git`, install dependencies, run tests/builds, commit, and push without relying on `E:\myhealth`. The preferred path is a Codex cloud/remote project connected to the GitHub repository. If that is not available in the current Codex app, the fallback is GitHub Codespaces or another always-on remote VM with GitHub push credentials.

## File Structure

- Create `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `tailwind.config.ts`, `eslint.config.mjs`, `.gitignore`, `.env.example`, `README.md`.
- Create `src/app/` routes for `layout.tsx`, `page.tsx`, `profile/page.tsx`, `log/page.tsx`, `history/page.tsx`, `settings/page.tsx`, `auth/page.tsx`, and API stubs under `src/app/api/advise/route.ts`.
- Create `src/components/` for app shell, navigation, cards, forms, charts, SVG illustrations, and shared UI primitives.
- Create `src/domain/` for profile, advice, daily log, health calculation, recommendation generation, compatibility warnings, and sample data.
- Create `src/lib/` for local database, repository interfaces, date utilities, export/import helpers, class name helpers, and image export helpers.
- Create `src/styles/globals.css` for the design system and responsive layout.
- Create `tests/` for domain unit tests and Playwright smoke tests.
- Maintain `DEVELOPMENT_LOG.md`.

## Implementation Tasks

### Task 1: Scaffold The Application

- [ ] Initialize Next.js app files in the existing repository without overwriting the current requirement/design documents.
- [ ] Add npm scripts: `dev`, `build`, `lint`, `test`, `test:e2e`.
- [ ] Add `.gitignore` and `.env.example`.
- [ ] Run install, lint baseline, and first build check.
- [ ] Commit as `chore: scaffold next app`.

### Task 2: Define Domain And Local Storage

- [ ] Add TypeScript domain models for profile, advice, meal plans, exercise plans, daily logs, moods, and settings.
- [ ] Implement BMR, TDEE, BMI, target calories, macro estimate, and goal/diet compatibility warning logic.
- [ ] Implement IndexedDB repository with localStorage fallback for browsers where IndexedDB is unavailable.
- [ ] Add Vitest coverage for calculations, recommendation generation, and local repository behavior.
- [ ] Commit as `feat: add local health domain`.

### Task 3: Build The Design System And App Shell

- [ ] Implement the warm Figma/Notion-inspired visual system: milk-white background, mint/orange/lilac/lemon/pink/sky blocks, large rounded cards, restrained black text, and mobile bottom tab bar.
- [ ] Add responsive shell: desktop two-column dashboard, tablet adaptive layout, mobile single column and bottom navigation.
- [ ] Add accessible buttons, inputs, tabs, cards, badges, dialogs, and toasts as local components.
- [ ] Verify 44px touch targets and readable Chinese typography.
- [ ] Commit as `feat: add app shell and design system`.

### Task 4: Implement Profile And Advice

- [ ] Build `/profile` with the 8 required fields and zod/react-hook-form validation.
- [ ] Build deterministic local `/api/advise` generation for all 9 diet plans and 3 goals.
- [ ] Build `/` dashboard with diet and exercise advice cards, BMR/TDEE/target/macro metrics, compatibility warning, regenerate action, SVG fallback illustrations, and the Doubao Seedream image path with same-origin proxy + html2canvas PNG export.
- [ ] Add fallback state banner and a real save-card-as-PNG flow (proxying remote Doubao images through `/api/image-proxy` so html2canvas can read them cross-origin).
- [ ] Add tests for all 27 diet-plan and goal combinations.
- [ ] Commit as `feat: add profile and advice flow`.

### Task 5: Implement Daily Logs

- [ ] Build `/log` with four check-in blocks: meals, exercise, weight/BMI, mood/note.
- [ ] Save one daily log per date with upsert semantics.
- [ ] Allow selecting dates within the last 7 days for backfill.
- [ ] Add friendly empty/reminder states on the dashboard.
- [ ] Add unit tests for daily-log upsert and date constraints.
- [ ] Commit as `feat: add daily check-ins`.

### Task 6: Implement History And Settings

- [ ] Build `/history` with 30-day calendar markers for meals, exercise, weight, and mood.
- [ ] Add 7/30-day weight trend and mood trend views.
- [ ] Add selected-day review comparing advice with actual log.
- [ ] Add streak and 7/30/100-day badge display.
- [ ] Build `/settings` with theme mode, export JSON, clear local data, and future cloud sync status.
- [ ] Commit as `feat: add history and settings`.

### Task 7: Add Auth And Cloud-Ready Boundaries

- [ ] Build `/auth` as a local-mode screen with disabled/future Supabase magic-link controls.
- [ ] Add repository interfaces and env wiring for future Supabase/Doubao provider adapters.
- [ ] Ensure no API keys are required for local MVP and no secret values are committed.
- [ ] Document future env variables in `.env.example` and `README.md`.
- [ ] Commit as `chore: prepare cloud provider boundaries`.

### Task 8: Verification, Polish, And Push

- [ ] Run `npm run lint`, `npm run test`, `npm run build`.
- [ ] Start the dev server and inspect desktop, tablet, and mobile layouts.
- [ ] Run Playwright smoke tests for `/`, `/profile`, `/log`, `/history`, `/settings`, and `/auth`.
- [ ] Fix layout, accessibility, and functional issues found during verification.
- [ ] Update `README.md` and `DEVELOPMENT_LOG.md`.
- [ ] Commit final polish as `chore: verify mvp`.
- [ ] Push `main` to `https://github.com/zhouxiaoyingai/myhealth.git`.

### Task 9: Cloud Continuation Setup

- [ ] Confirm whether a Codex cloud/remote project is available for `zhouxiaoyingai/myhealth`.
- [ ] If available, create or continue the project from the GitHub repository and run implementation there instead of relying on the local `E:\myhealth` checkout.
- [ ] If unavailable, use GitHub Codespaces or another remote development host that can clone, build, test, commit, and push the repository.
- [ ] Keep `DEVELOPMENT_LOG.md` current so a cloud worker can resume from GitHub state without needing local context.

## Acceptance Mapping

- Profile persistence: local database now; Supabase boundary documented for later.
- 27 advice combinations: deterministic local generation and tests.
- Two generated-card images: SVG illustration system now; Doubao boundary documented for later.
- Four daily check-in types: implemented in `/log`.
- History calendar, weight trend, mood trend: implemented in `/history`.
- PC/tablet/mobile: verified with responsive layout and Playwright/screenshots.
- Auth/data isolation: local mode now; Supabase magic link deferred until keys exist.
- AI failure behavior: local fallback is the default behavior; UI never depends on remote AI.
- Vercel: deployment config documented; actual deployment deferred until account/env are available.
- Lighthouse target: build and responsive smoke checks now; full hosted Lighthouse deferred until deployment exists.
