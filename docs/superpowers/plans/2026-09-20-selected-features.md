# Selected Features Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans task by task. Independent domains may use superpowers:dispatching-parallel-agents; root owns integration and final review.

**Goal:** Deliver planning modes, useful owned search, Identity account lifecycle and manual Finance subscriptions.

**Architecture:** Extend the existing modular monolith and shared React interface. Keep provider delivery behind explicit configuration and create one additive EF migration after model changes are integrated.

**Tech Stack:** React/Vite JavaScript/JSX, ASP.NET Core Identity, EF Core, PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-09-20-selected-features-design.md`

## Global constraints

- No TypeScript, alternate authentication framework, bank connection or external search.
- Preserve previous quality-pass changes/staging; no commits, branch changes or owner-database migration.
- All private reads/writes use the principal's UserId. Keep CSRF and Identity password policy.
- Root owns AppDbContext integration, EF migration, App routes, main catalog and project docs. Agents own separate feature files. Authentication agent owns Program.cs/package changes until handoff.

## Review focus

- A token for another account/purpose, an expired token and replay must not succeed.
- SMTP/API failure or missing provider must not look like successful delivery or disclose forgot-password account existence.
- Two users with identical titles and foreign IDs must not leak search/subscription/settings data.
- Mode switches and mobile reflow must preserve tasks, drafts and existing completion behavior.
- Mixed currencies, zero/free prices, leap dates, cancelled/overdue records must have transparent totals and remain editable.

### Task 1: Identity account lifecycle

Files: `Features/Auth/Account*.cs`, `External*.cs`, `Data/OwnerProvisioning.cs`, shared workspace initialization, `Program.cs`, API project/lock, `tests/Lifemaxing.Api.Tests/AccountLifecycleTests.cs`.

- [x] Add API integration tests for registration, duplicate/invalid input, CSRF, unconfirmed login, confirmation, reset purpose/expiry/replay, neutral forgot responses and password-change session revocation.
- [x] Implement transactional workspace initialization reused by registration/provisioning/Google.
- [x] Implement delivery options, disabled/Resend/Development mailbox senders, trusted fragment links and bounded Identity token lifetime.
- [x] Implement Google handler/configured state and safe Identity mapping; document Apple disabled preparation.
- [x] Run focused backend tests after root integrates migration. Expected: all lifecycle tests pass against isolated PostgreSQL.

### Task 2: Planning modes and search

Files: UserSettings/SettingsEndpoints, Today UI, existing CommandMenu, `Features/Search`, dedicated frontend/backend tests. Root adds model configuration and endpoint mapping from handoff.

- [x] Add tests proving mode persistence/isolation and no task loss; search ranking, query bounds and ownership.
- [x] Extend settings with `planningMode`, default `FocusedDay`, and implement presentation modes over existing Today data.
- [x] Add `GET /api/v1/search?q=&areaId=` returning bounded `{ items: [{ id, kind, title, path, ... }] }` DTOs and documented rank order.
- [x] Extend command search with immediate page/action matches, deferred owner query, cancellation and accessible keyboard suggestions.
- [x] Run focused frontend/backend tests. Expected: all new behavior tests pass.

### Task 3: Manual subscriptions

Files: `Features/Finance`, `client/src/features/finance`, `AreaCard.jsx`, `tests/Lifemaxing.Api.Tests/SubscriptionTests.cs`, client tests. Root registers model/route/API.

- [x] Add meaningful tests for two-account CRUD, date/price/currency validation, cancellation and grouped recurrence estimates.
- [x] Implement Subscription entity/configuration and `/api/v1/finance/subscriptions` owned endpoints with bounded lists, summaries and retained cancellation.
- [x] Build responsive list, form, active/cancelled views and grouped summaries using existing primitives.
- [x] Add Finance-card entry and a separate translations catalog for this feature.
- [x] Run focused tests after migration integration. Expected: ownership, calculation and UI behavior tests pass.

### Task 4: Authentication UI and integration

Files: AuthLayout, account forms, LoginPage, Security settings, App routes, shared error copy, migration and snapshot, browser feature checks.

- [x] Write form/route tests before implementation; inspect original artwork.
- [x] Build signup, forgot/reset, verification/resend and change-password flows, matching backend contracts and honest provider status.
- [x] Register nested Finance and public auth routes. Preserve single navigation and previous session synchronization.
- [x] Generate additive migration through EF tooling; inspect Up/Down and SQL. Apply only to disposable test databases.
- [x] Run real browser account lifecycle (local mailbox), search, mode persistence and subscription CRUD at desktop/mobile, light/dark, keyboard and reduced motion.

### Task 5: Verification and documentation

- [x] Run `npm run lint`, `npm run test -- --run`, `npm run build`; expected success.
- [x] Run `node scripts/run-dotnet.mjs build -c Release` and `node scripts/run-dotnet.mjs test -c Release --no-build`; expected success, no skipped isolation checks.
- [x] Verify locked restore and no pending EF model changes; inspect migration upgrade preserves existing rows.
- [x] Obtain independent source/security review, resolve material findings and rerun affected checks.
- [x] Update product/architecture/database/roadmap/status and provider setup docs, clearly separating unconnected providers and planned bank boundary.
- [x] Review all changed/untracked files, stage explicit new project paths and end with Git status. Report limitations and suggested commits; do not commit.

## Execution record

The user's explicit implementation instruction authorizes this work; no additional approval gate, branch creation or commit step is introduced. Provider credentials are not presumed available. Previous quality-pass source and staging are preserved.

Completed 21 September. Root integrated the additive migration and all routes/catalogs; independent account, planning/search and Finance work received cross-feature source review. The review's punctuation word-boundary ranking defect was reproduced with a failing test and corrected before the full run. Final verification: lint, 72 frontend + 3 launcher tests, production frontend build, locked restore, zero-warning Release build and 76 backend tests passed. Generated SQL was inspected and the migration upgrade/model agreement test passed. Selected-feature Chromium browser checks passed 4/4; existing browser/restart regressions passed 11/11. See IMPLEMENTATION_STATUS.md for the second-engine result and complete file/commit grouping. The first Finance browser failure was a test-label mismatch, corrected before the complete successful rerun.

No real email/Google credentials were configured or external delivery claimed. Apple and bank integration remain explicitly planned. The owner's database was not migrated and ordinary development services were preserved. Required source/tests/configuration examples/migration metadata/docs are explicitly tracked; generated evidence and local secrets remain ignored. No commit or push.
