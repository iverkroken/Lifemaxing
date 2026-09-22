# LIFEMAXING Implementation Status

## Daily planning and progression — 21 September 2026

Implemented the approved connected redesign. Today now derives its main tasks from the exact PlannedDate, habits from schedules and goals from task relationships plus explicit daily selections. Planning modes remain presentation/guidance; Focus references existing tasks, goals or habits. Capture exposes Life Area and distinguishes Add to today from Inbox. Habit XP is consistently 1–75, preserving the shared 75 XP daily cap.

Ranks now consume the unchanged server Level calculation through RankRules: Iron through Challenger, four divisions each, and Challenger I at 98+. Progress retains statistics/activity/ledger/rewards and adds the prominent rank/level/division presentation; `/progress/ranks` shows the full catalog. Historical events and command receipts are not rewritten. The older independent-rank/Backlog proposals are superseded for this scope.

Two additive migrations create DailyGoalSelections, expand Habit configuration and add nullable Focus goal/habit references. Existing Life Area relationships were reused. Verification used isolated PostgreSQL 18 databases; **this task did not migrate the normal/private database**. All ten existing PNGs remain tracked in `client/public/images/ranks` and are served from `/images/ranks/`.

Verification: 97 frontend tests plus 3 launcher tests pass; 93 Release backend tests pass with no skips; frontend lint and production build pass; backend Debug/Release builds pass; EF reports no pending model changes. Fresh migration, legacy upgrade and preservation checks pass. The existing Chromium browser suite passes all 11 scenarios, including API/browser restart persistence. The new daily/progression flow, responsive matrix and goal-Focus restart checks pass in both Chromium and Firefox (3 scenarios per browser). Final Git inventory and evidence are recorded in [DAILY_PLANNING_PROGRESSION.md](DAILY_PLANNING_PROGRESSION.md), alongside exact thresholds, changed files, decisions and limitations.

No commit, push or branch change was performed. Local screenshots, traces, build output, logs and disposable database credentials remain outside Git. See the linked report before applying migrations to a normal database; rollback is not lossless after using the new fields or configuring Habit XP above 25.

## Local development and Life Area completion pass - 21 September 2026

This approved follow-up supersedes the earlier statement below that only disposable databases were migrated. It retains the existing feature implementations and provider boundaries; it is not a new roadmap phase.

- **Normal local database:** Applied the already reviewed `20260920220222_PlanningModesAndSubscriptions` migration to the configured local Development PostgreSQL database. A private backup was created and validated first. Counts and aggregate row fingerprints for all 24 existing tables matched before and after migration, excluding the new PlanningMode field and migration metadata. Verified the required mode column/default, Subscriptions columns, ownership foreign key, four checks, index and migration history. No reset, recreation, reseeding or historical data deletion occurred.
- **Planning Mode diagnosis:** The normal database lacked PlanningMode, and a direct query reproduced the missing-column error. The current settings projection needs this column; a failed settings load correctly disables the selector. The schema is repaired and normal API/Vite processes are running current code. A new regression verifies settings retry restores the selector while retaining tasks and habits. Actual existing-account selector/save/refresh/logout/login verification remains pending interactive sign-in in the open local verification browser; isolated tests are not substituted for this check.
- **Every Life Area:** `/areas/:areaKey` now resolves the signed-in user's area and renders its existing image, Overview, Tasks, Goals, Habits and Back to Life Areas. Stable keys cover fitness, university, career, finance, home, style, food, creative, travel and personal. Nested lists use the actual owned area ID, including resets, pagination and conflicting query parameters. Scoped Habits uses its ID-filtered library/week view because the Today response does not carry area IDs. Task, goal and habit capture inherit the current area.
- **Finance and search:** Finance overview and area navigation expose the existing Subscriptions page and a return to Overview. Other areas cannot render Finance subscriptions through their nested route. Search ranks exact page/action matches before prefixes and substrings, includes Finance Subscriptions, resolves nested-area context to its owned ID, and sends area entity matches to their own overviews. Backend entity ranking, ownership, debounce, cancellation and keyboard behavior are retained.

### Verification for this follow-up

| Check | Result |
| --- | --- |
| Frontend lint | Passed. |
| Full frontend tests | 89 tests in 29 files and 3 launcher tests passed. |
| Frontend production build | Passed. |
| Locked backend restore | Passed. |
| Debug and Release backend builds | Passed, zero warnings/errors. The initial Debug attempt encountered the old watch process's file lock; it passed after that verified local process was stopped and restarted. |
| Full Release backend tests | 76 passed, zero failures/skips. |
| New area browser suite | 3/3 Chromium and 3/3 Firefox passed. All ten image-card clicks and their three scoped tabs, conflicting filters, capture persistence, renamed/inactive/unknown areas, Finance navigation and responsive checks are covered. |
| Changed artwork and Finance regressions | 3/3 artwork and 1/1 Finance CRUD/discovery checks passed in Chromium. |
| Existing browser regressions | 11/11 passed on the corrected full rerun, including actual API/browser restart persistence, remembered sessions, productivity, Focus and dialogs. Together with the area/artwork/Finance checks, 21 browser scenarios passed in this follow-up. |
| Normal Development migration/data integrity | Passed, including a subsequent baseline recheck. |
| Normal existing-account Planning Mode browser flow | Pending interactive sign-in; not claimed complete. |

Area browser coverage includes 1440, 1280, 1024, 768, 430 and 390px, both themes, enlarged text, keyboard navigation and reduced motion. Representative desktop/mobile screenshots were inspected. An independent source review found no material defects in owned-area resolution, scoped filters, capture defaults or route guards. The first existing-regression run exposed a test timing defect: its goal-note assertion matched the editable textarea, then reloaded before the second POST completed (confirmed aborted in the browser trace). Assertions now target the saved Progress history region before refreshing. [COMPLETION_AUDIT.md](COMPLETION_AUDIT.md) maps the original 17 requirements and separates implemented code from external configuration.

### Changed files and suggested commits

1. **Owned Life Area navigation and lists:** `client/src/features/areas/AreaDetail{.jsx,.module.css,.test.jsx}`, `areaDetailCatalog.js`, AreaCard/AreaPage styles, `app/App.jsx`, settings language wiring, scoped Tasks/Goals/Habits pages, capture forms, AuthenticatedShell, and the Finance route guard. New source files are explicitly tracked.
2. **Search and Planning Mode regressions:** CommandMenu and tests, backend SearchEndpoints/PlanningSearchTests, and PlanningModes.test.jsx. The local migration applies the existing reviewed migration; this follow-up adds no schema migration.
3. **Browser verification and documentation:** area-detail.spec.js, existing artwork/selected-feature/phase2 checks and isolated runner; README, architecture/database/design/product/implementation docs, completion audit and approved follow-up plan.

Earlier staged and working-tree changes are preserved. Required source/tests/docs belong in Git; `artifacts/`, Playwright results, build outputs, dependencies, temporary browser helpers, private backups and User Secrets stay outside tracking. No commit, push or branch operation occurred. Live Google, Resend and Apple configuration remains outside this pass, and no external credentials were added.

## Selected feature additions - 21 September 2026

Implemented the explicit follow-on feature brief while retaining the existing quality pass below. React/Vite JavaScript, ASP.NET Core Identity, EF Core and PostgreSQL remain the architecture. No next roadmap phase is implied.

- **Today and search:** Simple, 3:3:3, Focused Day and Custom are persisted per user through settings. Switching changes presentation over the same tasks, mission and habits. 3:3:3 explains a flexible framework; Custom reserves the template key without a builder. Existing command search adds bounded, ranked, owner-scoped tasks/goals/habits/Life Areas, immediate page/action suggestions, cancellation, keyboard navigation and useful loading/empty/failure states. No Project entity or search service was introduced.
- **Accounts:** Identity registration atomically creates the user, settings and ten standard areas. Confirmation/resend, neutral forgot-password, expiring reset, current-password change and session revocation are implemented. Public forms share the original No Risk No Story image, shared controls, responsive composition, four languages and both themes. Routes: `/signup`, `/verify-email`, `/resend-verification`, `/forgot-password`, `/reset-password`; redesigned `/login`; password change lives in `/settings?section=security`.
- **Provider status:** Disabled/Development/Resend email boundary is implemented; the private Development mailbox was exercised end to end. Real email delivery is not configured or verified. Google uses Microsoft's supported handler and local Identity logins, tested with a simulated backchannel; real Google login is not configured or verified. Apple has disabled UI and bound configuration only; its handler/key rotation remain planned. [ACCOUNT_SETUP.md](ACCOUNT_SETUP.md) lists all required settings and exact callback URLs. No provider secrets were added.
- **Finance:** `/areas/finance/subscriptions` is linked from the existing Finance card. Manual records support create/edit, active/cancelled status, category, amount/currency, weekly/monthly/quarterly/yearly interval, start/next dates and notes. Totals use all active owned records, sum decimals before rounding and keep currencies separate. Six earliest billing dates include overdue records for review; no automatic date advancement or inferred payment. Cancellation retains the record and does not cancel the real provider. Bank import/matching is documented as a future boundary only.

### Database and security

Migration `20260920220222_PlanningModesAndSubscriptions` adds `UserSettings.PlanningMode` with a `FocusedDay` backfill and the owned `Subscriptions` table, validation constraints and `(UserId, Status, NextBillingDate)` index. Existing Identity tables supply registration/external logins. The generated SQL is additive; existing tasks/history survive the tested upgrade. Model/snapshot agreement is covered by the migration integration test. Only disposable databases were migrated; the owner's normal database and running services were left untouched. Apply the reviewed migration before running this version against an existing database. Rollback removes subscription data and must not be used casually after real records exist.

Every new private query/mutation derives ownership from the authenticated principal; foreign subscription IDs return 404. CSRF, rate limits, confirmed-email login and existing Identity password hashing/policy remain. Forgot/resend never disclose account existence. Tokens use purpose-bound Identity protection, two-hour default expiry, fragment links removed from browser history and explicit confirmation POST; tokens are absent from API responses/logs. Development mail files are outside Git/webroot with private permissions. Google requires verified email and never silently links an existing local email. Password change participates in the existing cross-tab ownership verification. No important user data is stored authoritatively on a device.

### Verification

| Check | Result |
| --- | --- |
| `npm run lint` | Passed, no warnings/errors. |
| `npm run test -- --run` | 72 frontend tests in 28 files plus 3 launcher tests passed. |
| `npm run build` | Production build passed. |
| `node scripts/run-dotnet.mjs restore --locked-mode` | Passed. |
| Release backend build | Passed, zero warnings/errors. Debug output was occupied by the existing development API, which was preserved. |
| Full Release backend tests | 76 passed, zero failures/skips, including real PostgreSQL ownership/migration and Identity token tests. |
| Selected-feature production-preview Chromium browser suite | 4/4 passed: real local-mailbox account lifecycle, mode preservation/search, Finance create/edit/cancel/reactivate and public-page responsive matrix. |
| Selected-feature production-preview Firefox checks | All four scenarios passed across the initial run and corrected Finance rerun. |
| Existing isolated browser regressions | 11/11 passed, including actual API/browser restart persistence, remembered sessions, productivity, Focus, keyboard dialogs and mobile navigation. |

The browser matrix covers 1440/1280/1024/768/430/390px account and Finance screens in light/dark, 200% account-page text and reduced motion. Planning modes were checked at 1440/768/390px with identical task/habit IDs after reload. Representative desktop/mobile screenshots, image framing and editor layout were inspected manually. Independent source/security reviews found one punctuation-boundary search ranking defect; a regression first failed, then passed after SQL candidate ordering and final ranking were aligned. The first Finance browser attempt used an incorrect test label; the corrected complete run passed. Firefox exposed a second test-only assumption: UUID tie ordering can place either record first when billing dates match. Cancellation now targets the named record, and the focused Firefox rerun passed. Physical Safari/iPhone/iPad testing and real provider callbacks/delivery remain unverified.

### Changed files and logical commits

All paths are repository-relative. Previous quality-pass files are grouped in the preceding task's section below; their edits/staging are preserved.

| Suggested commit / purpose | Files |
| --- | --- |
| Identity backend and configuration | `server/Lifemaxing.Api/Features/Auth/{AccountOptions,AccountEmailSender,AccountRegistration,AccountEndpoints,ExternalAccountEndpoints}.cs`; `Data/{WorkspaceInitialization,OwnerProvisioning}.cs`; `Program.cs`; API project/lock and test lock; `appsettings.Accounts.example.json`; `tests/Lifemaxing.Api.Tests/{AccountLifecycleTests,Phase1IntegrationTests}.cs`; `docs/ACCOUNT_SETUP.md` |
| Account interface and session integration | `client/src/features/auth/{AccountPage,AccountPages.test,AuthLayout,ChangePassword,ExternalSignIn,LoginPage,LoginPage.test}.jsx`; `AuthLayout.module.css`, `LoginPage.module.css`, `accountApi.js`, `accountCatalog.js`, `accountForms.js`, `sessionIsolation.test.jsx`; `features/settings/SettingsPage.jsx`; `shared/api/client.js` |
| Planning and search | `features/today/{PlanningModeControl,PlanningModes.test,TodayPage}.jsx`, `TodayPage.module.css`, `usePlanningMode.js`; `features/search/*`; `features/auth/{CommandMenu,CommandMenu.test}.jsx`; backend `Data/UserSettings.cs`, `Features/Settings/SettingsEndpoints.cs`, `Features/Search/SearchEndpoints.cs`; `tests/Lifemaxing.Api.Tests/PlanningSearchTests.cs` |
| Manual Finance and additive schema | `client/src/features/finance/*`; `features/areas/AreaCard.jsx`; backend `Features/Finance/*`, `Data/AppDbContext.cs`, `Data/Migrations/20260920220222_PlanningModesAndSubscriptions{,.Designer}.cs`, `AppDbContextModelSnapshot.cs`; `tests/Lifemaxing.Api.Tests/{SubscriptionTests,PreferenceMigrationTests}.cs` |
| Shared wiring, verification and documentation | `client/src/app/App.jsx`, `features/settings/language.js`, `client/PRODUCT.md`; `tests/browser/{selected-features.spec.js,run-isolated.ps1}`; README; project/spec/roadmap/architecture/database/design/engineering/implementation/risk docs; `docs/superpowers/{specs/2026-09-20-selected-features-design,plans/2026-09-20-selected-features}.md` |

For independently buildable commits, land the combined model/migration wiring with both planning and Finance backend sources, then split frontend/authentication work as practical. Shared route/catalog/Program hunks cross feature boundaries. New source, maintained tests, migration metadata, safe configuration example and documentation belong in Git. Evidence under `artifacts/selected-features*`, Playwright results, build output, dependencies, `.env`, User Secrets and private mailboxes do not. No commit, push or branch operation was performed.

## Existing application quality pass - 20 September 2026

Implemented within the existing product scope. No new roadmap phase, framework, dependency, backend contract, schema or migration was introduced.

- Expanded the shared workspace ceiling from 1440px to 1600px. Goals, Progress and Rewards now use larger responsive artwork with the shared subtle media radius and intentional mobile aspect ratios. Existing image assignments, Life Area card geometry and focal positions are preserved; Personal, Home and Health & Fitness were visually checked at desktop and mobile widths.
- Today keeps its original full-viewport artwork and normal-flow title. The reproduced scrolling defect was the fixed transparent header remaining transparent until the entire hero left view, allowing the title/content to pass behind navigation. Its observer now tracks a content boundary against the measured header height. There is no scroll-driven font transform to remove. Also removed duplicate anchor clearance, improved hero text contrast, and surfaced existing task/habit progress, the daily mission and its existing Focus entry point.
- Plan identifies the all-date task list and links to the daily plan. Goals aligns heading, artwork, actions, identity and progress. Life Areas uses a tighter introductory composition so the first complete card is visible at all six audited widths without shrinking the cards. Shared navigation spacing, wrapping and immediate opaque-header switching preserve the single top navigation and existing drawer.
- Shared fields use readable 16px text. Native selects receive progressive customizable-picker styling where supported; native semantics and fallback remain. Task menus stay inside narrow screens, with consistent surface styling; dialog close controls cannot shrink. Native date-picker popups remain platform controlled, while their input surfaces use the shared application styling.

### User data isolation

The backend audit found no unscoped private-data query or mutation in the implemented Tasks, Habits, Goals, plans/daily mission, Life Areas, Focus, Progress/Rewards or Settings flows. Ownership comes from the authenticated principal, including validation of linked entities and child history. Important data remains PostgreSQL-backed; localStorage contains only the approved display preferences, not authoritative tasks, goals or other user records. Same-account cross-device data uses the same API and database.

A client isolation issue was found and fixed: switching the shared authentication cookie in another tab could leave a tab displaying the previous account's cached data. Tabs now send a data-free session-change signal and revalidate on focus/visibility changes. Private requests wait for verification; stale responses are discarded when ownership changes. Private query/mutation caches are cleared and the private view remounts for a different owner. During same-account verification, hidden/inert content preserves scroll height and unsaved drafts. A top-layer verification dialog keeps retry usable even when a form dialog was already open. Automated tests cover switching owners, sign-out, stale responses and recoverable verification failure.

The audit does not claim physical iPhone/iPad certification or public deployment verification. No implemented feature was found to store important user data solely on the client.

### Preservation and review

Preserved original artwork, palette, Life Area ordering/filter/editor behavior, domain rules, XP history, persisted Focus, four languages, both themes, native form accessibility and the existing top-navigation hierarchy. No working sections were replaced for stylistic reasons and no unverified dead code was removed. Independent ownership and final source reviews found no remaining material issue in the changed implementation.

### Changed files by purpose

Paths below are relative to the repository; braces list individual files in the same directory.

| Purpose | Files |
| --- | --- |
| Shared sizing, controls and navigation | `client/src/shared/styles/tokens.css`; `client/src/shared/ui/{Input.module.css,Dialog.module.css}`; `client/src/features/auth/{AuthenticatedShell.jsx,AuthenticatedShell.module.css,Navigation.module.css}` |
| Today composition and scrolling | `client/src/features/today/{TodayHero.jsx,TodayPage.module.css}` |
| Plan and Goals hierarchy | `client/src/features/tasks/{TasksPage.jsx,TasksPage.module.css,TaskRow.module.css}`; `client/src/features/goals/{GoalsPage.jsx,GoalsPage.module.css}`; `client/src/features/settings/catalog.js` |
| Life Areas and large imagery | `client/src/features/areas/{AreaPage.jsx,AreaPage.module.css}`; `client/src/features/progress/{ProgressPage.module.css,RewardsPage.jsx,RewardsPage.module.css}` |
| Session ownership and regressions | `client/src/features/auth/{ProtectedRoute.jsx,ProtectedRoute.module.css,authApi.js,useCurrentUser.js,sessionSynchronization.js,sessionIsolation.test.jsx}`; `client/src/shared/api/client.js` |
| Browser checks and current documentation | `tests/browser/{quality.spec.js,artwork.spec.js,run-isolated.ps1}`; `docs/{ARCHITECTURE.md,DESIGN_SYSTEM.md,IMPLEMENTATION_STATUS.md}` |

Suggested commits: (1) session ownership synchronization and its tests, with the architecture note; (2) existing-interface polish and shared design documentation; (3) browser quality coverage, isolated-runner support and implementation status. The browser session test in the third group depends on the first.

### Verification

| Check | Result |
| --- | --- |
| `npm run lint` | Passed. |
| `npm run test -- --run` | 58 frontend tests in 23 files and 3 launcher tests passed. |
| `npm run build` | Passed. |
| `node scripts/run-dotnet.mjs build -c Release --no-restore` | Passed, zero warnings/errors. |
| `node scripts/run-dotnet.mjs test -c Release --no-build --no-restore --logger 'console;verbosity=minimal'` | 56 passed, zero failures/skips; real PostgreSQL-backed tests included. |
| Isolated production-preview Chromium quality checks | All five scenarios passed across the full run and focused session rerun. |
| Isolated production-preview Firefox quality checks | Final complete run: 5/5 passed. |
| Existing isolated browser workflows and persistence | 11/11 passed: core workflows, authentication, actual browser profile restart, API restart, historical records, Focus and Remember Me. |
| Final navigation regressions | 2/2 passed: active/hover/keyboard indicators in both themes, and Today text/header boundary across desktop/mobile resizes. |

The quality suite runs with `powershell -NoProfile -ExecutionPolicy Bypass -File tests/browser/run-isolated.ps1 -Quality` and accepts `-BrowserEngine firefox`. It exercises 13 populated routes at 1440/1280/1024/768/430/390px in both themes, image decoding, no horizontal overflow, initial Life Area visibility, Today scrolling, task menus, select keyboard use, capture dialogs, 200% text, short landscape, reduced motion, session retry/draft preservation and cross-tab sign-out. Screenshot crops and compositions were inspected manually; architecture and changed source were also reviewed. The session ownership unit regressions use distinct account identities, and existing backend tests exercise real two-account isolation.

Today scrolling first failed against the old transparent-header behavior. Test-only corrections account for half-pixel scroll rounding and required-field accessible names. Firefox's headless native OS popup does not receive simulated keys (also reproduced on plain HTML), so its fallback test uses closed-select arrow navigation; Chromium exercises the customizable popup and nested Escape behavior. Physical Safari/iOS picker interaction remains unverified.

Reviewed new session source/tests and browser coverage are added to tracking by explicit path. Evidence and generated output stay ignored under `artifacts/quality-*`, `test-results/`, build directories and dependency caches. Local `.env` and User Secrets remain outside tracking. Disposable test databases and test-owned services were cleaned up. No commit, push or branch operation was performed.

## Life Areas filters and whole-card dragging - 17 September 2026

COMPLETE implementation; account-specific live save confirmation remains pending. Filter opens a responsive panel for My layout, localized alphabetical order, most/fewest open tasks, active goals and active habits, plus all/active/inactive and with/without content. Choices use URL parameters, combine without writes, preserve saved order for ties, and can be reset. Unknown counts are not zero; count-dependent controls/views wait for complete counts. Personal is a standard card under automatic sorting and wide in My layout. Customize layout clears viewing filters and edits the complete owned collection.

Drag can start on the image, heading or non-interactive card surface. Native image dragging is disabled in editing; interactive move buttons remain separate, keyboard controls and focus remain available. Touch uses hold-to-drag while quick swipes continue scrolling. Save 404 now explains that the running API lacks layout saving, preserving the draft.

The user's running Debug API predated the order endpoint. Replaced the verified project watcher/API processes with the current Debug API; normal Vite on 5173 now forwards PUT /api/v1/areas/order to an authenticated route (anonymous request returns 401). dev:api now uses watch --no-hot-reload so backend changes restart startup endpoint registration rather than leave a stale route table. Vite HMR remains unchanged. No backend contract/schema/authentication changes. A live authenticated check was attempted using local provisioning credentials, but login returned 401; no password reset, auth bypass or account-data mutation was performed. User was asked to retry Save in their existing session; do not claim that account-specific confirmation was obtained without a response.

Verification: production frontend build and lint passed, frontend 52/52 plus launcher 3/3 passed; Release backend build passed with no warnings and relevant PostgreSQL-backed RedesignTests 4/4 passed. Seven relevant Chromium scenarios passed across the suite and focused rerun: filters/count ordering/missing counts/URL reload, save 503 and 404 recovery/readback, image/text dragging and Escape, touch hold and swipe scrolling, existing all-image/responsive/edit flows, filtered Tasks/Goals/Habits navigation and four-language enlarged text. The first cold login exceeded the old test helper's 5-second navigation wait during concurrent builds; trace showed the login request still pending, so the helper now allows 15 seconds and the focused rerun passed. Desktop/light and mobile/dark filter screenshots were inspected. Evidence is ignored under artifacts/area-filters*. Isolated databases and services were cleaned up; the updated normal development API remains running.

Three new filter UI/logic/test files are tracked. Existing images, layout proportions and prior work are preserved. No commit or push.

## Life Areas layout editor - 17 September 2026

COMPLETE. Customize layout (Tilpass oppsett) opens a local draft with drag handles, a compact overlay, drop markers, translated move-earlier/later controls and Save layout/Cancel. Keyboard and touch users can use the same move buttons; touch dragging uses a short hold. Entry/exit focus, movement announcements, reduced motion, pending-save disabling and retryable errors are handled. Existing navigation and metadata editing return on exit.

The existing default order is preserved, with Personal at the bottom until moved. Ordinary cards reorder freely within the shared grid. Personal can occupy any complete desktop row boundary (before 0, 3, 6 or 9 ordinary cards), including the top; moving ordinary cards preserves that boundary. Its wide presentation now comes from shared areaPresentation.js metadata, alongside the unchanged images and crop positions, instead of a Personal-specific CSS selector. Tablet/mobile retain the same saved sequence and responsive dimensions. Legacy non-boundary positions are normalized only in the draft and persisted only on Save.

PUT /api/v1/areas/order validates the exact complete owned set (including inactive areas), rejects duplicate/missing/foreign/unknown IDs and atomically updates existing SortOrder values. Authentication and CSRF are enforced. Names, activation and other users remain unchanged. No migration. The raw sort-order field was removed from the metadata dialog; optional PATCH compatibility remains. No browser storage of user layout and no duplicate configuration system. @dnd-kit/react is pinned at 0.5.0.

Verification: frontend production build and lint passed; frontend 50/50 and launcher 3/3 passed, with 5 focused layout/translation tests passing again after final copy changes. Backend Release build passed without warnings and PostgreSQL-backed suite passed 56/56, including new order/ownership/authentication/CSRF/invalid-set checks. Six relevant Chromium scenarios passed across the final suite and touch rerun: draft/cancel/failure/retry/reload, every wide row via keyboard, pointer reorder/Escape, touch drag/buttons with dark theme and reduced motion, all image mappings across 320-1920px/both themes, existing editing and filtered navigation, four-language enlarged-text/touch controls. The initial touch test incorrectly moved before the library's hold threshold; it now waits for drag activation and passes. Desktop/light and mobile/light/dark screenshots inspected. No page errors in the tested layout flow; runtime logs contain no application errors (existing split-server static-root and antiforgery cache warnings remain). Physical-device/screen-reader certification was not performed.

Evidence stays ignored under artifacts/area-layout*, with temporary databases/services cleaned up. Five shared source/test files added to tracking; prior work and staging preserved. No commit or push. Do not rebuild this as a second layout system or restore positional hardcoding.

## Personal full-width desktop card - 17 September 2026

COMPLETE. Personal spans all three grid columns from 1200px, with equal image/content halves and a 20rem minimum height. The image fills the left half with existing cover/position metadata; content can grow and reserves room for the upper-right editor, with controls at the bottom. Below 1200px the original stacked card remains. This is a scoped CSS change; all image assignments, other cards, user sorting, routes, counts and shared interactions are preserved.

Verification: production frontend build, lint and diff whitespace check passed. Existing focused Chromium suite passed 5/5 with isolated PostgreSQL: seven widths 320-1920px, both themes, image decoding, editing, filtered navigation and reload, hover without neighbor shifts, keyboard, reduced motion, missing images, four languages with 200% text and touch. Desktop/light, laptop/dark and mobile screenshots inspected; the Personal row spans the desktop grid and mobile stays stacked. Evidence remains ignored in artifacts/area-personal-wide, including artwork/chromium/areas-images-Light-1440.png. Disposable database/services cleaned up. No new project files, backend changes, commit or push; existing staging preserved.


## Life Areas interaction and controls - 16 September 2026

COMPLETE. Shared cards now use restrained 1% scaling, 2px lift, soft elevation and area-tone glow for precise-pointer hover and visible keyboard focus. Reduced motion removes transforms/transitions while keeping static feedback; an open editor disables the card effect. Cards remain semantic sections, with no extra click handler or tab stop.

Tasks/Goals/Habits are three equal secondary link controls with translated labels and live counts, zero preserved and unavailable counts shown as a dash. Arrows removed; shared theme/control tokens provide hover, focus and pressed feedback. Existing areaId routes and backend filtering are unchanged; Habits continues opening its filtered library.

As explicitly approved, media height is now 16rem desktop/tablet and 14rem mobile, revealing more of Personal and Fitness while preserving cover scaling, all source assets and positions. Source and position metadata are together in the existing AreaPage artwork map; prior per-area image-position CSS rules were removed. This supersedes earlier media-height and mapping-shape notes.

Verification: frontend 47/47 plus launcher 3/3, lint and production build passed. Four focused Chromium checks passed, plus one additional language/touch check (5 passed across two runs). All ten cards hovered in both themes without neighbor layout shifts; keyboard focus, pressed feedback, reduced motion and dialog suppression passed. Real isolated PostgreSQL fixtures proved Tasks/Fitness, Goals/Travel and Habits/Personal filtering, exclusion of other-area content and selected-filter persistence after reload. All ten images decoded at 1920/1440/1280/1024/768/390/320px in both themes. Desktop, tablet and mobile screenshots inspected, including improved Personal/Fitness crops. Four languages at 320px with 200% text and an emulated touch device passed without overflow. No console errors in tested card flows. Missing artwork remains covered.

Evidence stays ignored in artifacts/area-interaction and artifacts/area-interaction-language; disposable database/services cleaned up. No new project files, assets, API/schema changes or unrelated page redesign. Existing staging preserved; no commit or push.


## Home and Personal image replacement - 16 September 2026

COMPLETE. The latest approved mappings supersede the previous locked choices: Home & Plants uses toscana.jpg with object-position 50% 45%; Personal uses personal.jpg with its existing 50% 72% position. The shared AreaPage mapping, 14rem/12rem media heights, cover scaling, grid and all other assignments remain unchanged. Home.jpg and self respect.jpg are retained but now unused, alongside the previously listed unused assets. No API or database changes.

Production frontend build and lint passed. The focused Chromium Life Area test passed 1/1 against production preview and isolated PostgreSQL, verifying all ten mappings, decoded images, no overflow at seven widths (320-1920px), both themes, editing and persistence. No console errors in the image flow. Desktop/light and mobile/dark screenshots visually inspected; house, vineyard, person and computer are visible. Evidence stays ignored in artifacts/area-home-personal; disposable services/database cleaned up. Both new images added to Git tracking; no commit or push.


## Life Areas visual follow-up - 16 September 2026

COMPLETE. University now uses the inspected Tesla.jpg in the existing stable-key artwork mapping. Media height increased from 10rem to 14rem (desktop/tablet) and from 9rem to 12rem (mobile below 640px). The 3/2/1 grid, card widths, spacing and text surfaces remain unchanged. Focal positions: University 50% 55%, Personal 50% 72%, Home 50% 30%, Fitness 50% 46%. Other image mappings and positions are preserved. This supersedes the earlier University SVG and media-height notes; the SVG fallback remains available for unmapped keys.

Verification: frontend 47/47 plus launcher 3/3, lint and production build passed. Focused Chromium checks passed 3/3 against production preview and isolated PostgreSQL: ten images loaded at 1920/1440/1280/1024/768/390/320px in both themes, no horizontal overflow or console errors in the image flow; editing/persistence, navigation, keyboard, reduced motion, 200% text and missing images remain covered. Screenshots inspected at large desktop, laptop, tablet and mobile; Tesla, Personal, Home and Fitness subjects are visible and remaining compositions preserved. Evidence remains ignored in artifacts/area-proportions; disposable database/services were cleaned up. Tesla.jpg added to Git tracking without renaming or modifying bytes. No API/schema changes, commit or push.


## Life Areas image integration - 16 September 2026

Implemented the approved seven locked mappings in the existing AreaPage artwork map: Food/cooking.jpg, Travel/Polo 1.jpg, Career/Work.jpg, Personal/self respect.jpg, Creative/Tutto passo.png (explicitly approved PNG), Home/Home.jpg and Fitness/Ronaldo.jpg. Finance/Money.png and Style/Rolex.png remain; University retains its SVG. Existing image dimensions, responsive grid, readable content, ownership and functionality are preserved. Per-image focal positions improve cropping. No API/schema/migration changes.

Four supplied assets remain intentionally unused: Micheal jackson.jpg, Polo 2.jpg, Porsche.jpg and no risk no story.jpg. All ten new supplied assets were visually inspected and added to tracking without renaming. The complete assignments and preservation rules are in V2_STATUS.md; current design notes were updated.

- COMPLETE. Verification: frontend 47/47 plus launcher 3/3, lint and production build passed. Focused Chromium browser checks 3/3 passed against production preview and an isolated PostgreSQL database: all nine images decoded at 1440/1024/768/390/320px in both themes; renamed area retained artwork after reload; editing, links, keyboard, reduced motion, 200% text and missing-image behavior passed. No browser console errors in the image flow. Desktop, compact and mobile screenshots inspected; portrait/landscape focal positions adjusted without changing card layout. Evidence stays ignored under artifacts/area-images-final; disposable test database and services cleaned up. No backend code or schema changed.


## V2 Prompt 1 — existing-product audit, 16 September 2026

The approved audit is implemented and verified within the documented scope. The shared handoff for Prompt 1/2/3 is [V2_STATUS.md](V2_STATUS.md), including remaining deployment work and historical symptoms not independently reproduced. These prompt numbers do not replace the original roadmap or historical Experience Evolution numbering.

Verified existing capabilities were preserved: artwork-led Today, Plan as Tasks/Goals/Habits/Inbox navigation, top navigation and closed drawer, ten Life Area identities, shared search/dialog/forms, both themes, four languages, persisted Focus, progression/history/rewards, cookie authentication and Remember Me. No new feature phase, public registration, backend contract, schema, migration, dependency or artwork replacement was introduced.

Changes:

- Fixed the shared active-link hover rule that produced a second underline. A browser regression failed before the fix and passed afterward across all five navigation groups, both themes and keyboard focus states.
- Fixed Today header artwork detection after resizing across the desktop/mobile header-height breakpoint. IntersectionObserver's fixed root margin is rebuilt when the actual header height changes. The 68px boundary test failed before the fix and passed desktop → mobile → desktop afterward. This does not establish the cause of every earlier text-scaling report.
- Gave the first-task onboarding button its own row below 640px after a 320px screenshot showed compressed, broken-word copy. Kept the existing card, tokens and artwork.
- Expanded two-account Rewards/Focus tests to verify foreign read/write rejection, unchanged victim state and independent same-key command receipts/replays. No exposed ownership defect was found in the bounded source/API audit.
- Corrected the existing 0/3/30/300-task browser test: its capture call previously passed viewport width as browser name and never changed the viewport. It now tests actual 390px and 1440px layouts. Screenshot helpers finish animations for stable evidence.
- Updated the README overview and local-production environment checklist. Historical design studies remain isolated with their builds/tests/licenses; no proven dead production implementation was found for safe deletion.

Fresh verification: frontend 47/47 plus launcher 3/3, lint and production build pass; backend Release build/test 55/55 with no failures/skips; host publish and Docker build pass. Final Chromium built-app suite 15/15; Firefox 14/15 plus the sole failed all-route check passing unchanged on focused rerun (1/1). The initial Firefox local-font warning and trace remain documented, not suppressed. All 11 isolated real-database browser regressions pass, including API/browser restart, Remember Me and historical data persistence. Production container foundation checks pass 2/2, plus liveness, SPA fallback, non-root user, protected key directory and restart connectivity. Public HTTPS authentication/deployment and physical-device certification are not claimed.

Fresh screenshots of main routes and interactive surfaces were inspected; corrected 320px onboarding and actual mobile task-scale captures confirmed in both engines. Semantic contrast checks pass for 134 pairs per theme/density. Independent source/change reviews and the changed-UI detector found no remaining actionable issue. No safe production deletion was identified; supplied PNG bytes remain identical.

Git: the earlier development-command changes and two staged launcher files were preserved. The reviewed V2 ledger was added by explicit path; no unexplained nonignored untracked project files remain. Evidence, disposable test output, local secrets, builds and verification scripts remain ignored. Test-owned databases/container/key volume/services were cleaned up; the user's running API/Vite were preserved. No commit, push or branch operation occurred.

## Current delivery - complete artwork product redesign, 15 September 2026

The approved full redesign is implemented across the existing application. This replaces the earlier foundation-only delivery below. The current visual authority is [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md); the execution record is [the artwork redesign plan](superpowers/plans/2026-09-15-artwork-product-redesign.md).

### Local development workflow maintenance — 16 September 2026

- Root `npm run dev` now ensures the existing PostgreSQL Compose service is healthy, then owns the ASP.NET Core watch process and Vite together. `Ctrl+C` stops both application processes; the persistent database remains running.
- `dev:db`, `dev:api` and `dev:client` remain available for isolated work. Fixed ports still fail explicitly when an earlier process is active rather than silently changing origins or terminating unrelated processes.
- A small launcher resolves the SDK selected by `global.json` from normal and Windows per-user .NET locations. This removes the observed Rider-terminal mismatch where system `dotnet` could not load SDK 10.0.401 even though the SDK was installed for the user.
- Database migrations remain an explicit reviewed operation and are not run by ordinary development startup.
- Verification: clean `npm ci` reported zero vulnerabilities; the full stack returned 200 from API health, Vite and proxied health; duplicate startup failed on the fixed port and cleaned up only its new processes; `Ctrl+C` released 5080/5173 while PostgreSQL remained healthy. Frontend lint/build, 3 launcher tests, 47 frontend tests, Release backend build with zero warnings/errors and all 55 backend tests passed.

### Delivered

- Midnight navy, warm ivory, controlled cobalt and muted gold; stronger shared Inter hierarchy, spacing, surfaces, controls, empty states and dialogs. Exact Joint geometry and its uppercase lockup survive. The existing semantic Icon API now uses pinned Phosphor Bold paths without a new dependency.
- The permanent desktop sidebar and mobile dock are removed. A responsive top header shows Today, Plan, Life Areas, Progress and Focus. Only Search and Menu occupy the right side. Plan and Progress expose contextual secondary navigation while preserving every route.
- Search reuses the existing command menu, navigation first, with keyboard shortcuts and creation actions preserved. The closed-by-default right drawer overlays content, with native dialog semantics, Escape/backdrop closing, focus containment/restoration and reachable full navigation.
- Shared standard/WebKit rules hide document, drawer, settings, panel and dialog scrollbars and gutters. Native scrolling continues; only an open modal temporarily locks background scrolling.

| Page | Result |
| --- | --- |
| Today | Original artwork fills the first 100svh. Current-day hero transitions into a redesigned mission, task, habit, date and XP workspace; new-account actions use real creation flows. |
| Tasks | Integrated search/filter workspace, readable scalable rows, contextual capture and preserved detail-panel navigation. |
| Inbox | The same precise controls with clear capture/organization intent and an intentional clear-Inbox state. |
| Goals | Gods plan artwork, directional composition and clearer measured progress/history/detail forms. |
| Habits | Distinct daily routine and weekly rhythm layouts, direct completion, clear schedules and preserved corrections. |
| Life Areas | Evolved responsive grid, stronger information hierarchy, Finance/Style artwork and retained owned motifs for the other areas. |
| Progress | Integrated rank/XP presentation with Muhammed ali artwork, lifetime totals and recent accomplishments. |
| Activity | Chronological history with readable event metadata and available filters. |
| Rewards | Tiger artwork, mature presentation and page-local ready/locked/claimed grouping; real claims and archive actions survive. |
| Focus | Odessey atmosphere, task/unstructured entry and immersive persisted sessions with pause/resume/finish/complete controls. |
| Settings | Contextual desktop navigation/content columns, mobile category chooser/back, visual theme previews tied to real preferences, clear account/security sections. |
| Login and dialogs | Coherent typography, form hierarchy, validation, backdrops and action priority; authentication and safe sign-out behavior preserved. |

Responsive coverage includes 320, 375/390, 768, 1024/1280, 1440 and 1920 px, both themes/densities, four UI languages, 200% text, reduced motion and forced colors. Native controls, labels, non-color active states and visible keyboard focus remain. The visual review corrected excess empty-state spacing, a repeated Rewards heading, missing habit-specific accessible labels and Focus success-hover contrast.

### Verification actually completed

- Frontend lint and production build pass. Unit tests: **47/47 in 20 files**.
- Release backend build passes with zero warnings/errors; backend tests: **55/55**. No backend, dependency, API-contract or database-schema changes.
- Isolated real PostgreSQL/browser regression: **11/11**. Includes real mutations, corrections, API/browser restart, remembered authentication, historical records, XP/claims/activity and paused Focus persistence.
- Built-app Firefox: **13/13**. Chromium: **all 13 checks verified**, comprising 12 passing final suite checks plus the passing focused rerun of the all-route artwork/console check. That assertion was corrected to begin console collection after the intentionally unauthorized public auth bootstrap; signed-in routes had no unexpected console warning/error, page error or server failure.
- Browser checks include all primary routes, forms/details, 0/3/30/300 real filtered tasks and pagination, original asset loading and missing-artwork fallback, hero crops/transition, Search/drawer/Plan/Progress navigation, keyboard PageDown and wheel scrolling, hidden scrollbar declarations/computed styles, panel/dialog scrolling, settings retry/prepaint and safe sign-out retries.
- Semantic contrast: 134 pairs per theme/density; minimum text contrast **4.564:1 light / 5.286:1 dark**, controls/focus **3.002:1 light / 3.538:1 dark**. Joint rasterization preserves both approved parts at 16/20/24/32 px in black and white.
- Actual desktop/mobile screenshots were inspected across empty and populated pages, details, active Focus, settings and localized Login. One batch of visual corrections was confirmed. Independent shell/code and new-file audits completed. Final Impeccable detector: **no findings**; installed hook/configuration was not disabled or changed.

Local evidence is ignored under artifacts/artwork-redesign-2026-09-14T22-46-43-359Z, notably final-firefox, verified-chromium, verified-console and regression-verified. Test-owned services/databases were removed by the runner; the owner's running API/Vite and application database were preserved.

### Preservation and deliberate boundaries

All eight supplied PNGs retain their exact bytes. The actual supplied filename is Backround.png; its approved counterclockwise rotation is CSS-only. Tutto passo remains available but unused. Phosphor Bold was explicitly approved instead of adding Lucide or another library. No production 3D runtime, new ranks, calendar, AI or future domain features were introduced.

The entry index and unfinished work were preserved. All 82 audited study/Joint/artwork files and 59 audited backend/dependency/configuration files are unchanged from entry. The 26 reviewed new source/test/documentation/artwork files are added to tracking; pre-existing staged contents remain untouched. Original local .agents/.codex tooling remains untracked and unchanged. Build output, screenshots, test results, auth test profiles and local secrets stay outside Git. No commit, push, merge, reset, restore, clean or branch change was performed.

## Historical delivery - Nordic Atelier Foundation Alignment, 14 September 2026

The approved [Foundation Alignment plan](superpowers/plans/2026-09-14-nordic-atelier-foundation.md) is implemented and verified. Nordic Atelier is now the canonical production foundation. **Joint is the locked production identity**, with exactly the two approved flat paths, monochrome support and uppercase LIFEMAXING lockup: 20 px mark, 14 px Inter Medium and 12 px gap. Fold/Meridian and earlier compass recommendations are historical references only.

Delivered: semantic light/dark mineral tokens and surface hierarchy; shared Inter weight/line-height roles; consistent controls, validation/disabled/focus states; 232 px sidebar and mobile navigation alignment; the existing Icon API adapted to pinned Phosphor Regular paths with MIT provenance; native scrollbar/gutter treatment; and Atelier appearance illustrations connected to the existing real preference controls. Canonical values and contracts are in DESIGN_SYSTEM.

Preserved: production routes, authentication, ownership, API contracts, preferences/localization, planning/history, task-panel focus/scroll return, capture, habits, Goals, Focus timing, real progression/rewards, all ten Life Areas and existing rank rules. Today keeps its existing composition and mark dimensions. Independent visual review found a native date-picker collision at 320 px; the documented one-line mobile flex-basis correction permits the existing date/action row to wrap before clipping.

Experience P3/P4 have **not** started. Complete Today composition, production 3D, object-render transfer, the six remaining Life Area designs, comprehensive page redesign, P5+, calendar, AI and new rank logic remain outside this delivery. The Atelier stylesheet, fixtures, original SVGs, images, Blender source and renderer/optimizer scripts stay reference-only and were not imported or regenerated. P1 now uses a local LegacyIcon copy to retain its earlier icon appearance.

Verification actually run:
- Frontend lint and production build pass. Frontend tests: **38/38 in 16 files**, including semantic icon coverage and appearance failure/pending/retry/owner-cache behavior. Release API build passes with zero warnings/errors.
- Complete isolated PostgreSQL/browser regression: **11/11**, including real mutations, API restart, browser restart, remembered authentication, persisted records and paused Focus. Disposable databases and owned API/Vite processes were cleaned up by the runner; the owner's database was not changed.
- Built-app design checks: **8/8 Chromium** and final **8/8 Firefox**. Covers 320/390/768/1280/1440/1920 px, both themes/densities, four languages, 200% text, reduced motion, forced colors, keyboard/menu/dialog/panel behavior, appearance retry/prepaint/system settings, active Focus access and 1199/1200 breakpoints. Actual Joint rasterization retains two components at 16/20/24/32 px in black and white.
- 134 semantic contrast pairs per theme/density per engine: minimum text 4.564:1 light  / 4.880:1 dark; controls/focus 3.053:1 light  / 3.137:1 dark. All required thresholds pass.
- Headed Firefox captures were visually inspected: thin scrollbars are visible in the sidebar, long task panel and expanded capture dialog. Firefox headless suppresses computed scrollbar width; its maintained check follows the existing Atelier test by checking the matching authored thin rule plus actual scrolling. Headed runs still require computed thin width.
- Two independent Impeccable assessments plus final detector pass. The mobile date-field defect was corrected and confirmed. Two existing detector warnings remain: the explicitly approved active-nav stripe (contextual false positive), and the unchanged Progress width transition (no observed jank; outside this scope). The installed hook/configuration remains enabled and unchanged.

Failed-run evidence is retained and distinguished from the passing results: an initial development-server reload showed Chromium ERR_NO_BUFFER_SPACE and a blank Focus page; the full regression passed unchanged on retry. A later headed Firefox run passed its assertions but timed out tearing down a context, with browser/React event-dispatch diagnostics; no application cause was established and its trace is retained. The subsequent headless run exposed the known scrollbar suppression assumption; the test was corrected without changing production CSS, and the final eight-case Firefox suite passed. No timeout was increased or assertion removed to hide these failures.

Evidence lives under ignored artifacts/nordic-foundation/run-2026-09-14T19-53-45-972Z: entry hashes/index/diffs, regression-retry, confirm-chromium, headed confirm-firefox captures/teardown trace, and final-firefox. Visual inspection is bounded to the foundation and relevant preserved flows; physical-device and screen-reader certification are not claimed.

Git: entry branch feat/ux-v3-refresh and HEAD 76bbf4a are retained. Original index entries are preserved; only nine reviewed new task files are added by explicit paths (plan, LegacyIcon, Phosphor data/provenance/license/test, ThemePreview component/styles and appearance test). Earlier mixed staged/unstaged work was edited from its full current contents. All 69 original reference/resource files outside the two inventory/README updates and legacy import remain byte-identical to execution entry. Existing 57 untracked Impeccable/Codex installation files remain unchanged and untracked, pending the separate tooling decision. Generated evidence, build output and test artifacts stay ignored. No commit, push, merge, reset, restore, clean or branch change.

Earlier sections below are historical delivery records, including their then-pending approvals; this section and DESIGN_SYSTEM describe the current baseline.

## Historical Nordic Atelier visual study, 14 September 2026

The approved **isolated visual study** is implemented at `client/design-reference/atelier/`, with its own local comparison gallery on port 5176. It includes Today desktop/mobile light/dark, actual Fold/Meridian vectors and sculptural studies, four representative Life Areas, Phosphor sidebar/states/scrollbars, surface/type specimens, Progress and Settings. All data is fictional and interactions are local. Scope and reproduction commands are in [the study README](../client/design-reference/atelier/README.md).

The owner selected Nordic Atelier and editable sculptural still lifes, with Fold as a candidate for comparison. **The delivered screens and final brandmark still require visual owner approval.** DESIGN_SYSTEM remains the implemented graphite/stone production reference; the study does not silently replace it. P3, P4 and production transfer have not started in this task. No app source, API contract (including TaskContracts), database, dependency, lockfile or authentication behavior was changed.

The study now has a real editable Blender source, six object collections and twelve optimized transparent WebP renders. This is an offline design resource study; no GLB, WebGL/R3F runtime, interactive GPU verification or P3 completion is claimed. Historical statements below about missing models describe the earlier P1/P2 gate, not this new offline source. The level 8 fixture is corrected to 6,200 total XP with 600/1,200 toward level 9.

Validation: existing frontend suite 35/35 passes; production build, isolated study build and lint pass. The final dedicated browser suite passes **16/16: 8 Chromium and 8 Firefox**, covering both themes at 320/390/768/1440/1920 px, both brandmarks in the first mobile viewport, local states and actions, Settings/system theme/retry, keyboard/dialog return, scrolling, reduced motion, missing-image fallback, 200% text and 44 semantic contrast pairs per engine. Earlier runs exposed an incorrect Settings test locator and dialog initial focus; both were corrected before the passing final run. Blender 4.5.9 LTS reopened the saved source successfully and verified 43 mesh objects, six subject collections, one orthographic camera and three lights. Screenshots, PNG masters, browser results, portable Blender and caches remain outside Git. Headed Firefox scrollbar appearance is not visually verified; its headless test validates declaration, color and actual scrolling because that build suppresses scrollbar width.

Git scope: entry branch `feat/ux-v3-refresh`, HEAD `76bbf4a`. SHA-256 comparison of every file tracked at entry confirms only this status file, SIGNATURE_DESIGN_REFERENCE and EXPERIENCE_EVOLUTION_PLAN changed in this task; all production files and earlier P1 resources remain byte-identical to entry. New study files/resources and four dedicated browser/build scripts are reviewed and added by explicit paths. Earlier index entries are preserved. Unrelated `.agents/` and `.codex/` tooling appeared after the entry snapshot and remains untouched/untracked. No commit, push, merge, branch switch or history operation is performed.

## Production baseline — previous approved design revision

Approved whole-product design revision implemented, 14 September 2026. Graphite/stone replaces the monochromatic brown surface stack; ruby now identifies actions and selection, bronze identifies earned progress, forest identifies completion, and mist blue identifies time/information. The later approved design review supersedes the earlier P2 palette. Exact roles and page rules are in DESIGN_SYSTEM.

Scope: shared surfaces, type scale, spacing, controls, category labels and status badges; open Tasks/Goals/Progress layouts; Today mission/early mobile habits; quiet Focus; consistent area artwork; state-specific Rewards; mobile Habits and Settings navigation; capture bottom sheet. All existing routes retain their API-backed behavior. Existing six-rank emblems and rank rules remain; no new rank page or future calendar/AI functionality is introduced.

The static SVG compass is reused and simplified by color. Original P1 raster masters remain unchanged concepts, with an updated matte graphite/bronze resource brief. P3 is not started: no model, GLB, renderer, 3D fallback or GPU verification. P4 final object artwork remains separate.

Entry baseline: feature branch `feat/ux-v3-refresh`, HEAD `76bbf4a`, with existing staged P1/P2 resources and unstaged P2 changes. Current AGENTS.md policy `2026.09.13.1` was verified in full, without subordinate instructions. Earlier staging and unrelated work are preserved. No backend/domain/auth contract, dependency, lockfile, migration or owner database changes were required.

Verification for this revision: npm lint and production build pass; the frontend suite passes 35/35 tests in 14 files with --maxWorkers=2. The Release API build passes with zero warnings/errors. The complete isolated browser regression runner passes 11/11, including actual API/browser restarts, persistence and logout. Existing migrations are applied only to disposable test databases. Earlier runs exposed outdated navigation locators (updated without weakening assertions) and one connection failure during habit logging; the unchanged flow passed in the final complete run. No cause beyond the displayed connection error was established.

The production design suites cover light/dark/system, both densities, four languages, keyboard/menu/dialog behavior, task panels, saving/retry, and 375/768/1280/1440/1920 px plus 200% text. Chromium and Firefox each pass 7/7 production design checks on the final build, including the corrected native progress track. The suite measures 134 semantic color pairs per theme/density: minimum text contrast 4.556:1 light and 4.732:1 dark; control/focus contrast 3.066:1 light and 3.452:1 dark. Manual image review includes Today desktop/mobile/laptop, Areas, Goals, Habits, Focus, Progress and Settings, not every generated image. Firefox image inspection identified and corrected a native white empty-XP track. Physical-device and screen-reader certification are not claimed.

Git review: the original index entries are preserved byte-for-byte; only the four new AreaLabel/StatusBadge JSX/CSS files were added to tracking. Generated screenshots, browser profiles, logs, builds and test results remain ignored. No new untracked project files, commit or push.

## Historical P2 foundation delivery

Experience Evolution P2 — approved direction A implemented and verified in the actual frontend, 14 September 2026. The owner explicitly approved espresso, ruby, brushed bronze and the personal compass in this task; no further visual approval is required. P3/P4 composition and 3D resources remain outside P2.

Entry baseline: `feat/ux-v3-refresh`, HEAD `76bbf4a`; 18 staged P0/P1 additions and six existing unstaged documentation edits. Actual AGENTS.md was read in full and policy `2026.09.13.1` verified; no subordinate instructions. Baseline index/work diffs were recorded in ignored `artifacts/p2` before changes. Existing staging is preserved. No backend/domain/auth contract, dependency, lockfile, migration or owner database change. Existing migrations run only on disposable fictional test databases.

Production file map (all paths relative to `client/`):

| Actual production files changed | Implemented use |
| --- | --- |
| `src/shared/styles/tokens.css`, `src/shared/styles/global.css` | A light/dark palette, separate neutral/selected/brand/status/category roles, tabular numbers, 40 px desktop title scale, 8 px buttons, both densities with 44 px controls |
| `src/features/auth/AuthenticatedShell.jsx`, `src/features/auth/AuthenticatedShell.module.css` | Compass wordmark, espresso/stone rail, neutral selection, collapsible progression group with all direct routes, separate Focus entry, platform shortcut and wrapping mobile header/dock |
| `src/shared/ui/BrandMark.jsx` (new), `src/features/auth/LoginPage.jsx` | Original small vector compass shared by shell and Login; existing Login behavior retained |
| `src/features/auth/CommandMenu.jsx`, `src/features/auth/SignOutDialog.jsx` | Arrow-key selection from the search field; immediate duplicate-submit guard with existing server logout/retry/cache semantics |
| `src/shared/ui/Button.module.css`, `src/shared/ui/Dialog.module.css`, `src/shared/ui/PageHeader.module.css`, `src/shared/ui/Productivity.module.css` | Contrast-preserving control states, raised dialogs, unified titles/sections/rows/forms/feedback; remove accumulated duplicate shared CSS rules |
| `src/features/settings/LanguageProvider.jsx`, `src/features/settings/SettingsPage.module.css`, `index.html` | Browser theme color from canonical canvas, explicit saved-success role; existing owner-scoped preference/language/system listener and prepaint storage retained |
| `public/licenses/INTER-OFL.txt` (new) | Redistributed full Inter license; existing locally bundled font weights/subsets unchanged |

Completed verification: `npm run lint` and `npm run build` pass; `npm run test -- --run --maxWorkers=2` passes all 35 tests in 14 files. `dotnet restore --locked-mode` and `dotnet build --no-restore -c Release` pass with zero build warnings/errors. `dotnet test --no-build --no-restore -c Release --filter 'FullyQualifiedName~AuthUsabilityTests|FullyQualifiedName~Phase1IntegrationTests|FullyQualifiedName~RedesignTests' --logger 'console;verbosity=minimal'` passes 17/17, none skipped, on isolated PostgreSQL.

`powershell -NoProfile -ExecutionPolicy Bypass -File tests/browser/run-isolated.ps1 -SignatureShell` passes 6/6 in Chromium; adding `-BrowserEngine firefox` passes 6/6 in Firefox. The runner without flags passes 11/11 existing Phase 1–3/auth/restart browser cases, including actual API and browser-profile restarts. The new `signature-shell.spec.js` and existing `redesign.spec.js` exercise the actual built frontend at `http://127.0.0.1:5174` with its dedicated API at `127.0.0.1:5082`. Both themes/densities use 375/768/1440/1920 px, with 200% text on representative work/settings/progress screens, short-height scrolling, command navigation, preference retry/prepaint, cancel/Escape/duplicate-click/logout retry. Retained redesign checks visit all private route families, create/detail routes, all Settings sections and public Login. Test runtimes and disposable databases were cleaned by the runner; the owner runtime was not restarted.

Observed contrast: 54 role pairs per theme/density (108 distinct color pairs, repeated in both densities); text minimum 4.596:1 light / 5.191:1 dark, controls/focus 3.071:1 light / 3.031:1 dark. Initial selected-light muted/control contrast failed and was corrected at the token source. Two subsequent test-only problems (minified three-digit HEX parsing and an unscoped Focus locator) were corrected without weakening expectations.

Actual production captures in ignored `artifacts/p2/{chromium,firefox}` and `artifacts/full-redesign/{chromium,firefox}`; [local review gallery](../artifacts/p2/review.html). Images opened include light/dark Settings, normal/compact, mobile 375, tablet 768, desktop 1440/1920, enlarged text and populated Today. This is a real application backed by fictional PostgreSQL, not the P1 prototype or private owner content. Viewport emulation and measured role pairs are not physical-device/screen-reader certification.

P2 is complete; no active implementation subtask or P2 migration remains. Actual reviewed snapshots additionally include the task panel, both logout modes' failure/retry state and the short desktop rail. The full font license, original BrandMark and maintained P2 browser spec are explicitly added to tracking; other P2 changes remain unstaged and all 18 preexisting staged additions retain their original index blobs. Generated screenshots/gallery/logs/builds/profiles remain ignored. Both working/staged whitespace checks and content review pass. No commit, push, merge, branch switch or history operation. Stop after P2. The separately requested P3 still needs its real model/fallback/renderer work; P4 still owns screen-specific artwork/composition.

## Historical P1 record

Experience Evolution P1 — concrete visual alternatives delivered for owner review, 13 September 2026. **Draft; no visual approval, no P2, and not resource-ready for P3.** Recommended candidate A is an espresso workspace with an original ruby/bronze compass; B uses an open stone/ivory composition with a sculptural green compass/path. [SIGNATURE_DESIGN_REFERENCE.md](SIGNATURE_DESIGN_REFERENCE.md) records the concrete comparison, design contract, observed limitations and next approval. The isolated React/JSX entry is `client/design-reference/index.html`; local comparison: `http://127.0.0.1:5175/design-reference/?compare=1`. Generated review images remain in ignored `artifacts/p1`.

P1 entry baseline: `feat/ux-v3-refresh`, HEAD `76bbf4a`, P0's plan already staged plus five unstaged documentation edits. Full actual AGENTS.md read, policy `2026.09.13.1` verified, no subordinate instructions found. Existing staging is preserved. Production frontend/backend, TaskContracts, routes, authentication, domain rules, dependencies, lockfiles and private database are unchanged. No migration was created or applied; owner runtime/migration status remains unqueried.

Delivered: Today with six/zero/eighteen fictional tasks and three habits; Tasks/details; ten Areas with counts derived from represented task/habit/goal fixtures; the full proposed ten-rank ladder and divisions marked demonstration; representative appearance/language/security Settings. Both directions have light/dark desktop/mobile views. Three actual image_gen PNG assets (two signature concepts and a ten-object atlas), original vector emblem studies, exact prompts, source/rights/size inventory and a concrete 3D/individual-image production brief are maintained with the prototype. No private images were uploaded. No GLB, editable 3D scene or verified renderer exists; these remain a critical P3 gate.

Fresh verification: `npm run lint` passed without lint warnings; `npm run test -- --run --maxWorkers=2` passed all 35 tests in 14 files. The initial default-worker run under concurrent build/browser work timed out in one existing formatting test; the repeat passed without modifying the test or timeout. `npm run build` and `node tests/browser/build-signature.mjs` passed. Four Playwright cases passed across Chromium/Firefox: A/B, light/dark, five pages plus empty/busy days at 390/1440, extra A Today at 320/768/1920, 200% text, image failure, reduced motion, local interaction/reset/dialog and no API/external requests. 52 semantic contrast pairs passed. Actual images were opened; mobile Settings overflow and enlarged-text overlap found during review were corrected and rechecked. 61 captures per engine plus a comparison/galleries are generated artifacts, not a claim that every capture was manually inspected. No fresh backend/PostgreSQL/authentication/GPU/physical-device verification is claimed.

P1 stops at visual review. Next owner action: compare A/B and accept or correct the specific compass/area imagery; record the choice before P2. The separate missing-model/fallback/renderer gate must close before P3. Seventeen new maintained prototype/source/assets/license/docs/browser files are explicitly tracked; baseline staged plan is retained byte-for-byte, with P1 plan/status edits unstaged. Local document links, production-build exclusion and unchanged production source/lockfiles were checked. Working/staged diff checks pass after removing a trailing blank line in PROMPTS.md. No unexplained unversioned project files or generated/secret additions. The dedicated local Vite preview on 5175 remains available for owner review; no existing service was stopped. No commit, push, branch switch or history operation.

## Historical P0 record

Experience Evolution P0 — documentation and analysis complete, 13 September 2026. Actual local entry baseline: clean working tree and clean index on `feat/ux-v3-refresh`, HEAD `76bbf4a`. The current filesystem AGENTS.md was read in full and policy `2026.09.13.1` verified. The latest redesign is present in local code; the earlier HEADs, staging descriptions and test counts below are historical records, not this task's baseline or fresh verification.

[EXPERIENCE_EVOLUTION_PLAN.md](EXPERIENCE_EVOLUTION_PLAN.md) now defines P0–P11 boundaries, dependencies and gates, observed implementation versus verification, source paths/invariants, planning terminology, existing XP/level/rank/reward rules and the bounded calendar/AI/rank exceptions. P0 changes documentation only. Phase 0–3 remain V1, original Phase 4 starts V2 analysis; passkeys, external sync, Life Score, specialized V2 modules and general agents are excluded. P1 requires concrete visual approval before P2; P9 requires simulated numerical-rule approval before P10. No later P-task has started.

Fresh P0 checks: six focused frontend tests in four files passed (CSRF refresh, retained command identity/server feedback, translation/formatting and public language preferences). Playwright 1.63.0 launched Chromium and Firefox against a local HTML/DOM capability check and closed both; WebKit is not installed. Four existing fictional-data screenshots were opened: light/dark Today, light Areas and light Appearance. These are historical images inspected now, not new captures of HEAD. No full backend/browser suites or builds were rerun. Figma tools are exposed but account/file access and the future 3D asset pipeline remain unverified. Document content, local references, the complete P0–P11 table and scope were checked; both working and staged diff checks passed. The new plan is explicitly tracked; five existing documentation edits remain unstaged. No unexplained unversioned project files, generated artifacts or secrets were added. No commit, push or branch operation.

No application code, API, dependency, database, migration or private setting changed. Owner database migration/runtime status was not queried; the existing InterfacePreferences migration's presence in source is not proof it is applied there. No owner credentials or account data were used. Stop after P0; a separately requested P1 is the next task.

## Historical full UX/UI redesign record

Full UX/UI redesign - implementation and isolated local verification complete, 13 September 2026, on feat/ux-v3-refresh (HEAD 46a473f). The starting tree had 27 modified files and five staged additions; it was not clean. AGENTS.md was updated under the user's bounded permission, read in full again and AGENTS_POLICY_VERSION: 2026.09.13.1 verified before application changes. The complete attached prompt was read. Its full scope supersedes the older visual reference gates and partial-language descriptions below. Earlier entries are historical records, not current instructions.

Delivered across Shell, Today/Mission, Areas, Tasks/Inbox/details/capture, Goals, Habits/week/history, Focus, Progress/ranks, Activity, Rewards, all Settings categories and Login. Four interface languages, independent region/time zone, light/dark/system, normal/compact, visible command menu and contextual desktop task panel use the shared foundation. Owner-scoped area aggregates and a bounded habit-week read expose real data. A reviewed additive migration persists UiLanguage/Theme/Density without rewriting Locale, time zones or domain history. Phase 1-3, authentication, CSRF, ownership, XP rules/reversals, ClientActionId and restart persistence are retained. No passkeys or Phase 4.

Final verification: Release backend build passed with zero warnings/errors; all 55 backend tests passed with zero skipped; frontend lint, 35 frontend tests and production build passed. All 11 existing real-PostgreSQL browser regressions passed, including Remember Me and real API/browser restarts. Two existing UX tests, four Chromium and four Firefox full-redesign tests passed. Real before/after screenshots were opened and reviewed; responsive checks cover 320/375/768/1024/1440/1920 and 200% text, both themes and all languages in critical flows. Migration upgrade/backfill and preserved historical data are tested against isolated databases. Exact coverage, defects corrected and actual limits are in [UX_REDESIGN_PLAN.md](UX_REDESIGN_PLAN.md).

Production laboratory comparison: entry JS 512.22 -> 254.72 kB raw / 154.29 -> 77.96 kB Node gzip. Total built JS increased to 601.90 kB raw with complete languages/new UI; this is not presented as an overall size reduction. Initial Login LCP 408 -> 156 ms, Tasks navigation 2501 -> 137 ms, capture 80 -> 81 ms and CLS 0.000048 -> 0.009714 in one local unthrottled run per stage. These are not field INP or percentile results. The large-entry warning is resolved through actual lazy routes, without changing its threshold.

Delivery: [local visual comparison](../artifacts/full-redesign/review.html), updated DESIGN_SYSTEM, API/database preference notes and README commands. Twenty-three reviewed new task files are tracked. The original five staged file versions are preserved; existing tracked edits remain unstaged. Working/staged diff checks and final Git status were reviewed. No unexplained unversioned project files, generated artifacts or secrets were added. No commit, push or branch operation.

Runtime boundary: the owner's existing 5080/5173 services and private database/password were not modified. Apply the reviewed additive migration and rebuild/restart that API when adopting the new source in the owner's running instance. All claimed runtime checks used real isolated PostgreSQL and fictional accounts on 5082/5174; generated databases and owned services were cleaned up. No physical-device, full assistive-technology certification or production deployment is claimed. The owner retains final visual judgment.

## Earlier UX refresh record (superseded by the full redesign above)

UX refresh — complete (13 September 2026), on `feat/ux-v3-refresh`, starting from clean HEAD `46a473f`. This is maintenance of the existing Phase 1–3 product, not a new roadmap phase. The entire current AGENTS.md was read; its filesystem content still has no AGENTS_POLICY_VERSION marker. The user explicitly requested the final report identifier 2026.09.13.1 and authorized tracking new project files.

Completed: Life Areas now has a defined responsive grid, distinct category icons, restrained shared accent tokens, active-area context and integrated editing. Settings has section navigation for account, language/time and security, readable forms and a clear session danger zone. Language selection persists through the existing owner-scoped Locale field; English, Norsk/Bokmål, Svenska and Dansk translate navigation, Settings labels/help and sign-out confirmations. Unknown regional locales remain compatible with English fallback. Other screens, Login, domain text and server validation remain English, explicitly disclosed in Settings. No new API, migration, backend/domain rule, authentication policy or dependency was needed.

The shell now uses visible danger buttons and a shared confirmation for sign out and sign out everywhere. Cancellation, safe initial focus, Escape/focus return, pending actions and recoverable errors are preserved. Tasks/Inbox have a clear capture action and contained workspace; tablet rows remain compact. Habits uses quick daily toggles with a separate routine library. Goal/reward surfaces, Focus, Progress, Activity, page headers and empty states share the revised grouping. Today remains the primary execution page and uses its existing mission, commitments, actual progression and capture flows. ClientActionId, persistence, XP rules and security remain unchanged.

Fresh verification: backend Release build passed with zero warnings/errors; all 51 backend tests passed, zero skipped. Frontend lint passed without lint warnings, all 26 frontend tests passed, and production build passed (existing main-chunk size advisory now approximately 512 kB). All 11 isolated real-PostgreSQL browser regressions passed in the final complete run: foundation, Phase 1/2/3, UX, RememberMe with actual persistent Chromium profile restart, API-restart data persistence and remembered login after both restarts. Two additional UX browser tests passed, covering empty and populated/busy states across 375/768/1440/1920 px, 200% text, settings loading/error/retry, all four saved languages after reload, another authenticated browser context, habit persistence, and both logout confirmations. Screenshot review included desktop/wide Life Areas, account/preferences/security, Progress/Goals, tablet tasks, mobile habits and confirmation. Screenshots contain only isolated fictional data and remain ignored in artifacts/ux-refresh.

Issues found and resolved: the old empty-search test asserted the former empty-Inbox slogan; it now asserts the deliberate No matching tasks state. The restart test needed to scope its security-section button to the new settings navigation. React autoFocus did not focus the safe confirmation action after showModal; Dialog now accepts an explicit initial focus ref, verified in the browser. Final affected suites pass. The real database and private owner credentials were not modified; isolated test databases were removed by the runners. No full assistive-technology or cross-browser certification is claimed.

Git hygiene: five reviewed new files were added to tracking: SignOutDialog.jsx, LanguageProvider.jsx, language.js, language.test.js and ux-refresh.spec.js. These are maintained implementation/tests; no necessary new files remain unversioned. Existing modified files remain unstaged. Generated images, browser profiles/traces, logs and builds stay under existing ignore rules; no ignore changes or manual file deletions were needed. Working and staged diff checks pass. No commit, push or branch switch was performed. Passkeys and Phase 4 were not started.

Auth recovery closure (13 September 2026): the owner confirmed the private password reset and successful login. The temporary DevelopmentAccess opt-in and account selector have now both been removed from local User Secrets, no corresponding process/user/machine environment overrides were present, and the identified Development API was restarted. The unlock command now refuses without configuration. No password was requested, read or logged. Ordinary Identity account lockout is restored; no persisted LockoutEnabled change was needed.

Fresh closure verification: all 51 backend tests passed (zero failures/skips), including a new isolated-account test proving successful ordinary login after removing recovery configuration and restored lockout after five failures. Existing tests cover other-account isolation, Production/Staging, CSRF, rate limiting, password recovery/data preservation, absolute 12-hour session / 30-day RememberMe expiry and security-stamp revocation within 60 seconds. Backend Release build passed with zero warnings/errors. Frontend lint, all 21 frontend tests and production build passed; the existing approximately 501 kB bundle advisory remains. All 11 real-PostgreSQL browser regressions passed, including actual persistent Chromium profile restart with RememberMe off/on, remembered login after API restart and Phase 1/2/3 persistence. The separate reference test passed at 375/768/1440/1920 px, including empty/small/busy days, keyboard interaction and 200% text. Desktop Today and mobile Login screenshots were inspected again. No frontend file changed during closure; approved UX reference work remains intact.

Verification boundary: ordinary login after disabling the exception was verified with isolated fictional accounts; the owner's private login was confirmed by the owner before removal, not replayed by the agent afterwards. No real domain data was changed, no schema/migration changed, and test databases were removed by their isolated runners. Physical password-manager/browser configurations beyond the existing Chromium coverage and production deployment were not newly tested.

Latest scope supersedes the earlier C/D sequence below: stop after authentication/recovery verification. Prompt C, passkeys and Phase 4 were not started. The entire current AGENTS.md was read; it contains no AGENTS_POLICY_VERSION marker. Git hygiene: all 54 changed paths and the existing 17 staged additions were inspected; no non-ignored unversioned files or tracked generated/secret files were found. The public password dictionary retains its documented checksum/license. Only DevelopmentAccessTests.cs and this status file changed in this closure step; the existing index was preserved. No new files were staged, no ignore rules added, no files deleted, and no commit/push/branch operation performed. Working-tree and staged diff checks pass.

Prompt B: shared shell, Today and Login reference design implemented on `feat/auth-usability` (13 September 2026), now visually approved by the owner. This is not a new product phase. Prompt C and Phase 4 have not started. Phase 3 and the pre-existing Prompt A working changes are retained; no Git history/index operations or real account data mutations were performed.

Prompt A: authentication usability and safe local recovery — implemented and verified on `feat/auth-usability` (13 September 2026). This is a bounded maintenance task after Phase 3, not a new numbered phase. Phase 3 was merged at `cde5206` before this task; the working tree was clean on inspection. No branch or Git history operations were performed. Prompt A remains preserved in the working tree.

Phase 3: Progression and execution - complete and verified (13 September 2026) on `feat/phase-3-progression`. Phase 4 has not started.

Phase 2: Core productivity — complete and verified (13 September 2026).

Dedicated UX/UI architecture and product experience pass — complete and verified (13 September 2026).

Resumed the clean `wip/phase-2-interrupted` checkpoint at `91ff123`. The checkpoint already contained the Phase 2 implementation, migration, API documentation and tests; this status file had not been updated. Existing work was retained and audited rather than regenerated. Phase 3 was not part of that earlier checkpoint.

## Completed

Project blueprint and planning documentation read before implementation.

- Existing `LIFEMAXING.sln` now contains the ASP.NET Core 10 API and xUnit test project.
- React 19 with JavaScript/JSX, Vite 8, declarative React Router 7 and TanStack Query 5 initialized in an npm workspace.
- Shared fetch client, feature query, responsive shell, `/start` screen and client not-found screen implemented.
- Documented CSS design tokens, locally served Inter, CSS Modules, Button, Input, Card and PageHeader established. Loading, failure and retry states use real connectivity responses; no fictitious KPIs or product data.
- `GET /health/live` and `GET /api/v1/system/status` implemented. The status route checks PostgreSQL using `SELECT 1`; missing configuration is reported explicitly and connection failures return safe 503 Problem Details.
- Unknown API/health routes return JSON Problem Details. Vite proxies development requests; ASP.NET Core serves the production SPA with client-route fallback.
- PostgreSQL 18 in Compose with loopback-only port binding, healthcheck and persistent named volume.
- Multi-stage Dockerfile builds the client and API and runs the combined app as a non-root user.
- SDK/dependency versions and npm/NuGet lockfiles established. EF Core 10 and Npgsql/provider 10 are pinned; Phase 1 adds the DbContext and migrations.
- README documents independent database, API and client startup, secrets, tests, SDK selection and production-shaped local serving. AGENTS.md development commands updated while preserving the owner's existing instructions.

Phase 1:

- Added `AppDbContext`, `AppUser : IdentityUser<Guid>`, `UserSettings`, `LifeArea`, EF Core Identity stores and the reviewed `InitialIdentityAndAreas` migration.
- Added a one-time `--provision-owner` command. It requires email/password from configuration or User Secrets, refuses to run once an account exists, and transactionally creates the owner, default `Europe/Oslo` / `nb-NO` settings and the ten documented Life Areas. No public registration route exists.
- Added persistent Identity cookie authentication, JSON 401/403 responses, five-attempt account lockout, ten-per-minute IP login rate limiting, and secure cookie settings. Production cookies use HttpOnly, Secure, SameSite=Strict and `__Host-` names; localhost development uses HTTP-compatible names.
- Added a public CSRF-token endpoint and validation for login, logout, settings updates and Life Area updates. The client keeps request tokens in memory, refreshes them after auth changes or validation expiry, and never stores credentials or bearer tokens.
- Added `/api/v1/auth/csrf`, `/auth/login`, `/auth/logout`, `/auth/me`, `/settings` GET/PATCH and `/areas` GET/PATCH. Private data is filtered by the authenticated principal; a foreign area ID returns 404.
- Added the login screen, `/me` session bootstrap, protected routing, authenticated responsive shell, session-expired state, logout, editable Areas view and Settings view using the existing design tokens and shared controls.
- Added React Hook Form, Zod and the documented resolver only where Phase 1 forms require them.
- Updated README with migration, owner provisioning, authenticated development and integration/browser test procedures.

Phase 2:

- Tasks support title-only Quick Add, details, area/goal links, size, priority, planned/due dates, estimates, filtering, pagination, editing, archival and completion/reopen history.
- Inbox consistently includes only unfinished, unarchived tasks without a planned date, regardless of other API filters. A due date or area/goal link alone does not remove a task from Inbox.
- Today is the authenticated landing screen and combines the daily mission, commitments, overdue/planned tasks, expected habits and Quick Add. Planning and logging use the owner's configured time zone and server date.
- Daily commitments preserve started-day plans and cancellation history. Future moves cancel the former plan. Mission selection is unique per owner/day and creates a commitment. Cancelled commitments can be restored directly from Today.
- Habits support create/edit/archive, active state, Daily/SelectedWeekdays/WeeklyCount schedules, forward-only schedule periods, historical logs and reversible completions. Duplicate active daily logs are rejected.
- Goals support qualitative and measured outcomes, editable state and targets, archive and append-style progress history. Existing measurements retain their original unit, baseline and direction.
- All private routes derive ownership from Identity and validate related owners. Cookie authentication and CSRF protection remain intact. Planning mutations serialize per owner within a transaction.
- Existing React/JSX, TanStack Query, React Hook Form/Zod and shared design tokens remain in use. No major redesign, TypeScript, Tailwind or global state library was introduced.

## Resume Gap Analysis and Fixes

- COMPLETE on inspection, then reverified: core entities, endpoint groups, owner scoping, historical persistence, route wiring, create/edit forms, migration and isolated test infrastructure.
- PARTIAL / fixed: Inbox could include completed or archived tasks when combined with status filters; several date filters and mission deletion lacked the documented date bounds; cancelled Today plans had no direct restore action; dependent queries in habit/task forms lacked visible loading/error/retry feedback.
- MISSING / completed: accurate Phase 2 status reporting and a fresh full verification pass. Added regression coverage for Inbox/date bounds and browser coverage for habit editing, goal completion and mobile commitment cancellation/restoration.
- Existing browser runner and restart test are intentional, useful verification tools and were retained.

## Current State and Next Step

The Phase 2 browser → API → PostgreSQL flows are implemented and verified. Tasks, plans, missions, habits, schedule/log history, goals and progress history persist. Private local user records were not used as fixtures or deleted; integration and browser writes used isolated databases and fictional owners.

The dedicated frontend UX pass and Phase 3 are now complete. V1 is functionally verified for private local use. Stop and await an explicit next task. Phase 4 scoring/analytics and later features are not implemented. Public deployment still requires Phase 8.

## Verification — 13 September 2026

- Locked .NET restore and local EF tool restore passed using SDK 10.0.401 from `%LOCALAPPDATA%\Microsoft\dotnet`.
- `npm ci` passed: 0 reported vulnerabilities. A running repository Vite process initially locked a native dependency; it was stopped for restore and restarted on port 5173.
- Final `dotnet build -c Release --no-restore`: 0 warnings, 0 errors. An intermediate overlapping build hit a Windows test-process file lock; the final build was repeated after those processes exited and passed cleanly.
- `dotnet test -c Release --no-build`: 27 passed, 0 failed, 0 skipped. Includes all 13 foundation/Phase 1 cases and 14 Phase 2 cases, running against real PostgreSQL. Coverage includes authentication, CSRF, owner isolation, completion/mission/log concurrency, Inbox, plans, schedule history, DST/ISO weeks, goal history, archival and task persistence after application restart.
- `npm run lint`: passed.
- `npm run test -- --run`: 6 passed across 5 files, including Quick Add failure/retry/input preservation and server-date Today behavior.
- `npm run build`: passed.
- `tests/browser/run-isolated.ps1`: 4 browser tests passed, then 1 additional persistence test passed after an API process restart. No skipped tests. The final run included Phase 1 login/settings/areas/logout regressions, Task editing and reload, Mission completion/reopen, Habit editing/schedules/log reversal, Goal completion/progress history, Quick Add and mobile commitment cancellation/restoration.
- Browser checks used real PostgreSQL, an isolated Release API and Vite, checked 375/768/1440 px layouts, and reported no page errors or horizontal overflow. Today screenshots were inspected. Generated screenshots/logs remain under ignored `artifacts/`.
- The isolated browser databases and processes created by the runner were removed/stopped in its cleanup. Existing unrelated local databases were preserved.
- `git diff --check`: passed. No secrets or generated output are tracked or untracked commit candidates. Existing ignored secret files, dependency/build output and verification artifacts remain ignored. No staging, commits, branch changes or pushes were performed.

## Database and Migration Status

PostgreSQL 18.6 is healthy in Compose with loopback-only access and its existing persistent volume.

All three migrations are present and applied to the configured local development database:

- `20260912173928_InitialIdentityAndAreas`
- `20260912202529_CoreProductivity`
- `20260913133032_ProgressionAndFocus`

The existing CoreProductivity migration was reviewed and retained unchanged. `database update` reported the development database was already up to date; isolated integration/browser databases successfully applied the migrations from scratch. EF reports no pending model changes. No duplicate migration, schema rewrite or local data deletion was necessary. Ordinary application startup still does not run migrations.

## Scope Clarifications and Known Issues

No unresolved Phase 2 acceptance failures.

The checkpoint's documented scope clarifications remain: minimal TaskCompletion history is introduced in Phase 2 because completion/reopen depends on it; XP/Activity/CommandReceipt remain Phase 3. Transaction boundaries provide the later attachment points without unused hook abstractions. The dedicated UX pass replaces the compact navigation with the responsive product shell described in DESIGN_SYSTEM.md. See `PHASE2_API.md` for the detailed contracts.

The system-wide dotnet installation remains .NET 9; use the documented per-user .NET 10 SDK. The local npm configuration emits a non-blocking `min-release-age` warning. API-only development can warn about absent `wwwroot`, since Vite serves the client. Production TLS, backup/restore and public deployment remain Phase 8. Prompt A subsequently implements persistent Data Protection key configuration and verifies container recreation; see its entry below.


## Dedicated UX/UI Pass - 13 September 2026

Started from the clean `feat/ux-ui-redesign` branch at `b131d10`, with Phase 1 and Phase 2 already complete. Audited the documentation, all frontend routes, shared components and existing browser flows before changing presentation.

The audit found equal-weight cards and configuration forms obscuring daily action, duplicated mission/task information, weak task and goal scanning, narrow desktop composition, and mobile navigation that gave configuration too much space.

Implemented:

- Today is the clear home: server-local date, prominent Daily Mission, separate commitments and work needing attention, disclosed completed/changed plans, rapid habit interaction, nearby capture and actual linked-goal context. No invented timeline or progress data.
- Desktop sidebar prioritizes Today, Tasks, Goals, Habits and Life Areas. Inbox is a separate processing destination; Settings/account are secondary. Mobile/tablet have a capture-centered dock, visible Inbox and a More dialog exposing every destination.
- Tasks/Inbox use compact completion rows, readable priority/date/area metadata, direct commitment and low-friction capture. Task detail separates description/context from planning. Existing area-filter links work from Life Areas.
- Habits put daily actions before the routine library. Creating, editing and changing future schedules use dialogs; schedule/log history and reversal remain available. The library's area filter does not hide the separately labeled daily list across all areas.
- Goals show real latest measured or qualitative progress, with history and recording ahead of configuration. Latest-entry requests use existing endpoints and are bounded to 12 visible goals per page.
- Life Areas are open domain tiles with useful links to current functionality and secondary editing. Settings is a quiet regional preferences page.
- Existing tokens/components are extended with editorial hierarchy, restrained surfaces, accessible dialogs, shared icons/empty states, multiline inputs, skip navigation and route focus management. No new dependency or abstract UI framework.

Verification:

- Frontend lint and production build passed; 9 unit/component tests passed across 6 files.
- All 27 backend regression tests passed against real PostgreSQL, including Phase 1 authentication/CSRF and Phase 2 owner isolation and history behavior.
- Isolated browser runner: 5 tests passed, followed by 1 persistence test after API restart. This covers login/logout, settings/areas, tasks, Inbox, mission/commitments, habits/schedules/logs, measured and qualitative goal history, archival and global/inline capture.
- All authenticated pages and detail/create routes checked at 375, 768 and 1440 px, with no horizontal overflow or uncaught page errors. Screenshots were reviewed as a coherent product, including the empty Today experience. Tablet habit filters were expanded to avoid cramped controls.
- Keyboard checks cover skip navigation, dialog initial focus, Tab containment, Escape and focus restoration. Browser checks exercise mobile navigation, recoverable Today/capture errors, retained failed form input, empty search and reduced motion. Loading and retry states remain connected to actual query state.
- Browser fixtures use a disposable PostgreSQL database and fictional owner. The runner cleans up its database/processes; screenshots/logs stay in ignored `artifacts/`.
- Backend endpoints, domain model, migrations, authentication and CSRF contracts are unchanged. No Phase 3 feature was started.

Scope and limitations: Phase 2 has dates, not timed appointments, so Today groups planned/overdue work without an hourly calendar. Life Areas link to existing filtered productivity views; specialized modules remain deferred. This pass verifies Chromium and obvious keyboard/responsive accessibility; a full assistive-technology and cross-browser audit remains later work. Goal lists need a bounded latest-entry request per visible goal until a future justified API optimization.

Related documentation: DESIGN_SYSTEM.md records the implemented navigation, composition and interaction patterns; PHASE2_API.md's shell note now points to that completed pass. No unrelated architecture was rewritten. All changes remain unstaged on the existing feature branch; no commit, push, merge or branch switch was performed.


## Phase 3 - complete and verified, 13 September 2026

Started from clean branch `feat/phase-3-progression` at `f091fceebfe4c73b085486bba788e48bcabe28d5`. Read the required documentation, inspected the current completion/planning/history flows, and retained the completed Phase 2/UX implementation.

Implemented:

- XpEntry ledger with immutable signed entries, exact original-entry reversals, rule version and historical calendar/category buckets. TaskCompletion records its actual capped AwardedXp. Habit XP defaults to 10 and is configurable from 1 to 25.
- Central, tested level/rank/tier calculations follow PROJECT_SPEC.md. Tiny/Small share 50 XP per local completion day; habits share 75 XP per scheduled local date. Goals and focus minutes do not award XP. Levels/ranks are derived, not independently mutable or spendable.
- Required ClientActionId headers for task complete/reopen, habit log/revoke, reward claim and focus commands. Owner-scoped receipts store request fingerprint and original result. New goal-progress calls also opt into replay protection, while old unidentified Phase 2 calls remain valid. Existing transaction and owner row locking protect domain changes, XP, activity and receipt as one unit. Unique database constraints protect active cycles, habit/date logs, ledger sources, claims and focus sessions. Case-insensitive route aliases cannot bypass the identity requirement.
- Append-oriented Activity includes task/habit completions and corrections, goal progress/completion without XP, level increases, mission replacements, reward claims and ended focus sessions. Histories are paginated, owner-scoped and retain source identities/summaries. XP/activity/receipts reject modification or deletion through normal synchronous and asynchronous DbContext saves.
- User-defined rewards have level eligibility, editing before claim, archival and one persisted claim. Claimed definitions and claim dates remain intact after archival or a level decrease.
- FocusSession supports task-linked or unstructured sessions, one unfinished session per owner, server-timed pause/resume, completed/stopped/cancelled outcomes, and atomic task completion. Active state survives navigation, reload and API restart. Cancelled sessions stay in history but are excluded from descriptive focus totals.
- Focus, Progress, Activity and Rewards are integrated beneath the existing navigation hierarchy. Today remains home with a restrained progression meter, focus-return link and signed completion feedback. Focus removes workspace navigation and emphasizes the selected action and timer. Existing task, habit, goal, area, settings and capture flows remain available. New history timestamps use configured locale/timezone.

Database and API:

- Additive migration `20260913133032_ProgressionAndFocus` reviewed and applied to the existing development database. Fresh test databases apply all migrations; a dedicated upgrade test migrates a populated Phase 2 database and verifies old completions survive with zero historical XP. No retroactive awards, duplicate migrations or deletion of real local records.
- Final EF check reports no pending model changes. PostgreSQL remains healthy with its existing persistent volume. Ordinary API startup still does not migrate the database.
- Added /progress, /progress/ledger, /activity, /rewards (+ detail/edit/archive/claim), /focus-sessions (+ active/pause/resume/stop). Existing completion/log DTOs add progression feedback; habit contracts add xpPerLog. Detailed contracts are in ARCHITECTURE.md and persistence clarifications in DATABASE.md.

Final verification:

- Locked .NET restore and local EF tool restore passed with SDK 10.0.401. Existing frontend dependencies were already installed and sufficient; no dependencies or lockfiles changed.
- Release backend build: 0 warnings, 0 errors. Full backend suite: 36 passed, 0 failed, 0 skipped, including all 27 earlier foundation/Phase 1/Phase 2 regressions. The goal-activity regression was additionally rerun successfully after the final nullable-text cleanup.
- Frontend lint passed; 11 tests passed across 7 files; production build passed. Tests cover retained command identity after lost response and server-derived XP/level feedback as well as prior frontend behavior.
- Isolated browser runner: 6 main tests passed, then 2 persistence tests passed after API restart. Real PostgreSQL and a separate Release API/Vite were used throughout. Includes a server-committed completion with deliberately lost HTTP response, retry with the same identity and one award, reversal/recompletion, reward claim, focus pause/reload/resume/task completion, and stored ledger/claims/activity/paused focus after restart.
- New screens and Today checked at 375, 768 and 1440 px with loaded-content screenshots, no horizontal overflow and no uncaught page errors. Existing Phase 1/2/UX browser coverage also passed. Keyboard return navigation, shared dialog focus/Escape, mobile More navigation, reduced motion, empty/error/retry states remain verified. Visual review retained Today's hierarchy and gave the task more prominence in Focus.
- Isolated test databases/processes were cleaned up. Screenshots, logs and Playwright artifacts remain ignored. No private owner data was used as fixtures. Final diff/working-tree audit found no secrets or generated build artifacts as commit candidates; git diff --check passed.

Scope decisions and limitations:

No architectural deviation. Implementation details now documented explicitly include header-based command identity, request/response receipts, calendar cap buckets, zero-XP legacy completions, immutable claimed reward definitions and cancelled-focus totals. Goal progress receives optional replay protection and meaningful Activity without adding an XP source. Browser verification uses Chromium; comprehensive cross-browser and assistive-technology auditing remains later polish. An already-running development API must be restarted to load the changed backend; the isolated verification API used the current build.

All work remains unstaged on the original feature branch: 29 tracked files modified and 16 intentional untracked source/test/migration files before final report. No commit, push, merge or branch switch. Phase 4 was NOT started. Stop after this phase.

## Prompt A — authentication usability and recovery, 13 September 2026

Inspected the clean `feat/auth-usability` checkout at `cde5206becca9c4b56f6a4c77c8e8d22a8094027`, AGENTS, authentication documentation, current frontend/API flows, tests, Docker configuration and all three applied migrations before implementation. Phase 3 code and its merged history were present. The running development processes were inspected and left alone; verification used separate processes and fictional accounts/databases.

Confirmed causes/findings:

- ProtectedRoute and the home redirect treated every `/auth/me` failure as unauthenticated, including transient network/server failures. Only 401 now redirects; other failures retain a retry flow.
- Login already requested persistent authentication and a 14-day sliding cookie. The missing checkbox was not evidence that persistence was disabled.
- Assigning a new CookieAuthenticationEvents replaced Identity's security-stamp validation. Redirect handlers now preserve that handler; reset/sign-out-everywhere revocation is tested within the configured 60-second interval.
- Windows default Data Protection keys already existed outside Git. Historical browser cookie deletion, hostname/profile changes and key loss were not reproduced as the cause of the user's earlier experience. New explicit key location/application identity removes dependence on launch content root. Switching from the previous identity requires one new sign-in, without changing account/data.

Implemented:

- Explicit unchecked RememberMe choice: session cookie with 12-hour server limit or persistent cookie capped at 30 days from login. No sliding extension; central configurable bounds. Stamp renewal retains absolute expiry. HttpOnly, production Secure/host prefix, SameSite=Strict, CSRF and Identity hashing remain intact.
- Password selection now accepts 15–128 Unicode characters and spaces without character-class rules or hidden trimming/truncation. Existing passwords are not revalidated on login. A pinned, MIT-licensed SecLists common-password resource is checked locally; documentation explicitly limits its coverage. The same UserManager policy covers creation, change and reset.
- Show/hide password, preserved autofill/paste, retained failed input, appropriate 401/403/429/network/5xx handling. Locked/unknown/wrong credentials return the same public failure; account lockout and IP rate limits remain enforced. `/auth/me` is no-store.
- Authenticated, CSRF-protected `/auth/logout-everywhere` and a secondary Settings action update only the principal's security stamp. Ordinary logout's copied-cookie limitation is documented.
- Development-only `--reset-owner-password`: local interactive masked input/confirmation, no password arguments or HTTP route, Identity reset token providers, transactional reset/unlock, original user ID/history retained. Production and redirected/noninteractive invocation refuse to run. README supplies one safe owner command and a separate production recovery plan.
- Stable environment-specific Data Protection names/directories outside the repository, Windows per-user DPAPI, restricted Linux directories and documented persistent container volume. No key material in Git or image; environments use separate keys.

Verification performed for this task:

- Locked .NET restore and EF tool restore passed. Release build: zero warnings/errors. Full backend suite: 44 passed, 0 failed, 0 skipped (the prior 36 cases plus 8 auth cases). Covers fixed expiry and stamp renewal, Unicode/length/common-password policy, legacy password login, reset data preservation/lockout/session revocation, logout-all/CSRF, Production cookies and command refusal. A Phase 3 test clock was adjusted so domain-time travel does not move the independent cookie/stamp clocks.
- Frontend lint passed; 17 tests across 8 files passed; production build passed. New tests cover recoverable session errors, exact pasted text, visibility/autofill and RememberMe submission/retry.
- Real-PostgreSQL isolated browser runner: 11 passed, 0 failed, 0 skipped: 6 original flows, 2 auth cases, 2 Phase 2/3 persistence cases after API restart and 1 remembered-session restart case. Persistent Chromium profiles were closed/relaunched, not restored from exported storage. Both session choices, actual API restart, keyboard interaction, 375/768/1440 px, existing productivity/XP/focus flows and recoverable errors passed.
- Docker image built successfully. Isolated runtime test preserved the same authenticated session across actual container replacement using its own named key volume; mode 700/non-root ownership verified. Actual Production recovery process rejected the command. A real terminal exercised masked reset/confirmation with the fictional account: old password rejected, new phrase accepted, same user ID and ten Life Areas retained. Redirected command input also rejected safely. A cleanup timing race after Docker --rm was fixed and the runtime check rerun successfully; test databases/containers/key volumes were cleaned up.
- Existing local database reports all three migrations applied; EF reports no pending model changes. No new migration, schema/domain/XP/retry change, real-owner reset or private data deletion.
- `git diff --check` passed. Source/test/documentation changes remain unstaged; no secrets, key material, build output or browser artifacts are commit candidates. Public blocklist entries and their license are intentional source resources, not application credentials.

Limitations: historical browser state was unavailable, so the earlier intermittent login symptom cannot be attributed to a single observed cookie-loss event. Third-party password-manager autofill, non-Chromium browsers, browser session-restore settings and actual production HTTPS/recovery deployment were not manually verified. The local blocklist is a modest baseline rather than exhaustive leak protection. The already-running development API must be restarted by its owner to load this build; unknown/user processes were not stopped. No full redesign, passkeys, Prompt B/C or Phase 4 work was performed.

## Prompt B reference design review

Scope: smaller shared page titles, left-aligned wider shell, Today work/support composition, contextual mission-to-Focus action, compact habit toggles, real secondary progression, differentiated empty-day/onboarding/completed states, and a simpler Login surface. One shell creation dialog replaces permanently repeated Quick Add forms; optional task details are disclosed. Tasks/Inbox, Habits and Goals only change their creation entry points, retaining their current layouts and complete detail/edit routes. The existing English UI is retained, including an intentional translation of Prompt A's Norwegian RememberMe checkbox label without a behavior change.

Runtime diagnosis: the expected GET paths for progress, activity, rewards and active focus returned 404 both directly on localhost:5080 and through Vite localhost:5173. Program.cs and feature route registration already implement them. The identified API process (PID 36936) was the Debug executable started at 14:59 from the old build. A separately started current Release API returned 200 on all four routes with the disposable authenticated owner. After identity/port checks, only that known old API was restarted with the current Release build; all four paths now return 401 without credentials on both the regular API and Vite origins. No routing workaround, backend/domain change, reset, or real owner provisioning was needed.

Preservation: no Prompt B server changes or migrations. Existing Phase 3 migration and owner-scoped APIs are used. ClientActionId generation/retry retention, server request fingerprints, transactional XP rules/corrections, activity, rewards and persisted Focus are unchanged. Login retains Prompt A authentication, CSRF, autofill/paste, reveal and RememberMe behavior.

Visual review uses isolated fictional PostgreSQL data: genuinely empty account, small realistic day and busy day, plus Login, at 375, 768, 1440 and 1920 CSS pixels. All 16 after images were inspected, rather than relying only on overflow assertions. A text enlargement check exposed compressed columns; container-based reflow fixes this and a text-width assertion guards the regression. Before images were captured from the actual pre-B local UI; the user's earlier screenshot files were not attached in this session. Local ignored artifacts/reference-review.html provides selectable before/after views. Long mobile days deliberately remain scrollable; browser coverage is Chromium, not a full assistive-technology or cross-browser audit.

Fresh verification in this task: frontend lint passed; 21 frontend tests passed; production frontend build passed (Vite reports a roughly 501 kB main chunk advisory). All 44 backend tests passed on the separate rerun. The first simultaneous backend/browser run encountered a PostgreSQL timeout and an outdated capture Tab-order expectation; the keyboard assertion was updated for the disclosed-details control, and database suites are rerun separately. The full isolated browser runner passed all 11 regression tests: six foundation/Phase 1/2/3/UX checks, two auth checks including a real persistent Chromium profile restart, two Phase 2/3 API-restart persistence checks and one remembered-login check after both restarts. A second outdated error-copy expectation was aligned with the new human-readable Today failure message. The final reference browser test also passed (one test), covering all 16 screenshots, selected-day capture with optional details, keyboard focus, real Focus start, mission completion/reopen XP, habit logging/removal, progression failure/retry and 200% text reflow.

Stop here for visual approval before transferring this reference composition to other pages. No Phase 4 functionality, fake results, or later product modules were added.
## Development access setup (historical; superseded by closure above)

The owner approved Prompt B and authorized, in order: restore their local Development login, propagate the reference design (Prompt C), then add passkeys (Prompt D). This sequence is not a roadmap phase. Phase 3 and all Prompt A/B work remain in place on feat/auth-usability. Two new files were already staged on entry (DayContext.jsx and reference.spec.js); that index state is preserved.

Development access: added DevelopmentLoginAccess with exact locally configured email and IsDevelopment guards. The selected existing account has been unlocked through UserManager, and the identified local API was restarted with the new build. Account LockoutEnabled remains true in persistence; only the configured Development password-login path clears the lockout/count and suppresses further account lockout. Other accounts, Staging/Production, password verification, cookie/CSRF policy and IP limits remain normal. No password, private email or reset token is embedded in repository configuration or source. User Secrets hold only the local account selector and opt-in, not a new password.

The existing masked --reset-owner-password command is ready for the owner to run privately. The agent has not selected/reset the real password or claimed a successful login with it. Prompt C and Prompt D implementation await confirmation of working ordinary login, as required by the owner. No passkey schema or new roadmap phase has been started. README documents the unlock/reset commands and removal of the local exception.

Targeted verification: Debug build passed with zero warnings/errors; eight isolated PostgreSQL tests passed, covering Development targeting, other-account isolation, disabled configuration, Production/Staging, normal lockout and existing reset/data-preservation behavior. Release build also passed with zero warnings/errors; all 50 backend tests passed, including the existing Phase 1/2/3 suite. Frontend lint, 21 tests and production build passed (the existing roughly 501 kB chunk advisory remains). No schema change or migration was introduced.
Git audit for this access step: explicitly added 15 reviewed new files to tracking: ProtectedRoute.test.jsx, DayContext.test.jsx, AuthDataProtection.cs, AuthSessionOptions.cs, DevelopmentLoginAccess.cs, OwnerPasswordRecovery.cs, PasswordPolicy.cs, the three common-passwords resource/license/provenance files, AuthUsabilityTests.cs, DevelopmentAccessTests.cs, auth.spec.js, auth-restart.spec.js and run-auth-runtime.ps1. These are maintained source/tests and a licensed runtime resource needed by the existing implementation. The public dictionary checksum matches its documented source. Two files were already staged on entry and remain so. No existing modified file was staged, no files were deleted, no ignore rules were added, and no non-ignored unversioned files remain. Generated screenshots/profiles/logs and build output remain under existing ignore rules. Both working-tree and staged diff checks pass. No commit, push or branch operation was performed.

Final browser regression for the access step: all 11 isolated real-PostgreSQL browser tests passed, including password login, RememberMe browser-profile restart, Phase 1/2/3/UX workflows and API-restart persistence. The runner removed its disposable database/processes. The real development password reset/login remains an owner action and is not reported as verified. Prompt C/D remain pending that prerequisite.

## Recoverable deletion and custom Life Areas — 22 September 2026

Implemented owner-scoped soft deletion for Tasks, Habits, Goals and Life Areas with an exact 30-day restore period, an authenticated Recently Deleted API/page, explicit permanent deletion, and a bounded startup/hourly cleanup worker. Normal EF queries exclude deleted content. Restore keeps the original row and relationships. Deleting a focused entity stops its active session while preserving elapsed history. Permanent deletion retains append-only XP and Activity; Life Area purge unassigns children, while soft deletion preserves their links for automatic reconnection on restore.

Life Areas can now be created, renamed, activated/deactivated, reordered, image-customized and deleted. Private JPEG/PNG/WebP uploads are limited to 5 MiB, validated by declared MIME, signature and container structure, stored in PostgreSQL, and rendered with editable focal coordinates before built-in or generic fallback artwork. Images use private/no-store responses. Validation does not decode or re-encode pixel data. Deleted areas display as Unassigned throughout active entity views. Finance subscriptions also have a canonical route independent of the Finance Life Area.

Migration `20260921231831_SoftDeleteAndCustomLifeAreas` was generated and reviewed. It leaves existing active rows active, moves the former Task deletion/archive values into `ArchivedAtUtc`, adds the recovery/image fields and indexes, and removes the XpEntry/LifeArea foreign key while retaining an owner/area lookup index for historical attribution. It has only been exercised against disposable test databases in this task; no normal Development database was migrated.

Verification before final review: the full PostgreSQL-backed backend suite passed 100/100 with zero skips, and the migration/Phase 2/deletion subset passed 21/21. After review corrections, all 9 deletion integration tests pass, including two new regressions for concurrent restore/cleanup and deleted-parent planning actions. The full frontend suite passes 103/103 across 32 files, plus 3 launcher tests. Frontend lint, production build and Release solution build pass, with zero .NET warnings/errors. A Debug test build was blocked by the running Development API's executable lock; Release verification leaves that process intact. The full backend suite was not repeated after the focused corrections. The generated migration SQL was reviewed from the preceding migration through `20260921231831_SoftDeleteAndCustomLifeAreas`; it performs the archive-preservation update before creating the new recovery constraints and indexes.

Final review corrections: cleanup acquires the existing per-owner write lock and rechecks expiry before deleting dependencies; restored records cannot be purged by a stale candidate scan. Life Area rendering imports its form watcher, image-upload retries reuse the created ID, restore refreshes both area and productivity queries, and retained-log/commitment actions reject deleted parents with 404. Permanent-delete errors remain inside the confirmation dialog. See [DELETION_RESTORE.md](DELETION_RESTORE.md) for the file inventory, operational limits and suggested commit groups.

Final follow-up verification: the complete Release backend suite was repeated after all backend fixes: **102 passed, zero failed/skipped** (3m37s). No backend source changed afterwards. Headed Chromium and Firefox each passed all four deletion/custom-area browser scenarios against isolated PostgreSQL and the production build. Coverage includes desktop/mobile, all four entity lifecycles, retained relationships/history/XP, Focus stopping, Today/Search exclusion, custom/built-in images and upload retry, permanent-delete error recovery, keyboard/dialog focus, 200% text and narrow/landscape reflow. All 54 captured axe audits had zero violations; uncertain contrast nodes were additionally checked by computed colors in Firefox and screenshots were reviewed. The latest frontend suite passed 103 tests across 32 files plus 3 launcher tests; lint and production build passed.

Browser fixes were restricted to recovery row/dialog reflow, accurate elapsed-day labels (including Deleted today), and the missing Life Area 30-day confirmation reminder. An existing global header wordmark clips at 320px combined with 200% text; it remains unchanged as outside this task. No screen-reader/physical-device certification is claimed. The normal Development database still needs the reviewed migration; browser databases were disposed and normal services left untouched. The maintained browser test/axe dependency are included in the exact commit inventory; generated evidence stays ignored. No commit or push occurred.
