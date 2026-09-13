# Full UX/UI redesign — working coverage

## Mandate and baseline

Active task: the complete `LIFEMAXING_FULL_UX_UI_REDESIGN_PROMPT.md`, read from the supplied Downloads file. This supersedes historical reference-page approval gates and aesthetic constraints, while preserving Phase 1–3, authentication, ownership, immutable history and private data. No passkeys or Phase 4.

Policy `2026.09.13.1` was added together with the explicitly authorized workflow, Git and reporting rules; the complete saved AGENTS.md was reread and verified before implementation inspection.

Branch: `feat/ux-v3-refresh`; HEAD `46a473f`. Entry state contained 27 modified tracked files and five staged additions (SignOutDialog.jsx, LanguageProvider.jsx, language.js, language.test.js, ux-refresh.spec.js). Preserve that index. The initial working/index diffs and path list are saved locally under ignored `artifacts/full-redesign/`; AGENTS.md is the first change of this task. No application changes at baseline capture.

Baseline Release backend build: passed, zero warnings/errors. Frontend production build: passed; entry JS 512.22 kB raw / 155.70 kB gzip, CSS 44.19 / 7.71 kB. Chunk advisory is real and will be addressed with route splitting. Existing browser runner explicitly replaces the configured database name with a generated `lifemaxing_browser_<uuid>` and provisions fictional data; private data is never a fixture. Existing developer services on 5080/5173 are left alone. Isolated runner owns its API/Vite on 5082/5174 and cleans them up.

## Visual direction

An airy personal workspace: near-neutral canvas, clean white working surfaces, emerald primary actions, graphite text, a quiet narrow navigation rail. Clear rows for tasks/history, framed illustrated entry cards for areas/goals/rewards, one concentrated Focus surface. Use the existing local Inter family, 36 px page titles, 16 px work text, 14 px supporting text. Original lightweight SVG geometry gives areas and ranks character without downloaded imagery. Four restrained accent families, semantic light/dark palettes and shared density tokens replace local exceptions.

References are product presentations/documentation, not personally tested applications. [Linear](https://linear.app/now/behind-the-latest-design-refresh) informs stable action placement and quieter navigation; [Things](https://culturedcode.com/things/features/) informs row-first tasks and disclosed details; [Craft](https://support.craft.do/en/write-and-edit/styling/cards) informs meaningful framed entry points; [Sunsama](https://help.sunsama.com/docs/usage-guides/focus-mode/) informs task/time concentration. The supplied Superlist, Raycast, Cosmos, Lovable 2026 and Discord presentations were also inspected; bounded search, expressive entry surfaces and settings hierarchy inform the implementation. No reference assets or layouts are copied.

## Coverage matrix

| Requirement | Existing implementation | Planned change | Data source | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| Shell/navigation | Sidebar, dock, More dialog | Clear workspace/progression hierarchy, focus return | Today + active focus | All routes, keyboard, short viewport | Verified |
| Today/Mission | Connected day/mission/commitments | Dated work strip, focused mission, all four genuine states | Existing Today/task/progress APIs | Empty/small/busy/completed, corrections | Verified |
| Life Areas | Framed icon cards; no totals | Original motifs, primary contextual links, correct grouped counts | Owner-scoped area aggregate | Counts beyond page size; keyboard/mobile | Verified |
| Settings | Three sections, locale-based language | Four sections, searchable IANA timezone, distinct region/language, appearance | Additive settings preferences | Save/reload/errors/dirty values | Verified |
| Tasks/Inbox/details | Filters partly local; full detail route | URL filters, reset, desktop side panel and full mobile detail | Existing paged task API | Back/refresh/position/focus | Verified |
| Quick Add/forms | Shared capture dialog | Editable context, disclosed details, retained errors | Existing mutations | Title only/context/retry | Verified |
| Goals | Actual measurements and history | Card hierarchy, state/deadline/latest action | Existing goals/progress | Baseline/decreasing/over-target/qualitative | Verified |
| Habits | Daily toggles and library | Actual schedule/log week with corrected/rest/future states | Bounded owner-scoped week read | WeeklyCount, history, correction, mobile | Verified |
| Focus | Server session timer and controls | Concentrated workspace, truthful return/resume | Existing focus API | Start/pause/reload/resume/finish/retry | Verified |
| Progress/ranks | Actual level/rank/ledger | Original rank family, threshold hierarchy, disclosed rules | Existing progress/ledger | Rank boundaries/negative corrections | Verified |
| Activity | Paged chronological entries | Local date groups, translated structured event kinds | Existing Activity metadata; preserve original summaries | Filters/paging/corrections | Verified |
| Rewards | Tiles and actual claims | Distinct availability/remaining levels/claim date | Existing rewards/progress | Claim once/locked/archive/reversal | Verified |
| Four languages | Navigation/settings/logout only | All UI, forms/errors/status/a11y + document titles | Extend current catalog; stable error codes | Complete keys and four-language workflows | Verified |
| Login/logout | Identity + confirmation dialogs | Unified identity, public preferences, ambiguous logout recovery | Existing auth/session APIs | Auth regression/retry/focus/CSRF | Verified |
| Themes | Light only | Light/dark/system with prepaint preference | Authenticated settings + minimal public display memory | Every route/dialog, live OS changes, storage failure | Verified |
| Density | Single density | Normal/compact; keep touch controls practical | User preference + shared tokens | Reload, keyboard and touch | Verified |
| Command menu | Absent | Visible Ctrl/Cmd+K navigation/action menu | Existing capture/navigation/focus | IME/input/modal exclusion, Escape, no matches | Verified |
| Accessibility/states | Existing primitives and regressions | Contrast/reflow/labels/focus/empty/error consistency | Real query states | 320–1920 px, 200% text, reduced motion | Verified |
| Performance | Single large entry bundle | Measured route splitting and bounded reads | Production build + browser measurements | Before/after raw/gzip/loading/network | Before/after measured |
| Visual/regression evidence | Isolated Chromium suites | All pages, three data amounts, two themes, four languages, second engine | Disposable PostgreSQL | Open actual before/after screenshots | Verified |

## Verification plan

Every principal route and detail: light/dark at 375 and 1440 px with real fictional content. Representative Today/Areas/Settings/Login/Tasks/Focus: 768, 1024, 1920 px, 320 px reflow and 200% text. All four languages: capture, form errors, settings persistence, login/logout and dialogs. System theme and both densities: representative work/settings flows. Empty, small realistic and busy datasets have separate captures. Chromium and an available second browser engine cover key flows. Keep all meaningful Phase 1–3 and auth/restart regressions.

## Final verification - 13 September 2026

The complete requested implementation and local verification are complete. No passkeys or Phase 4. The owner retains final visual judgment. This record covers local source and isolated runtime verification; it does not claim production deployment or migration of the owner's private database.

| Check | Actual result |
| --- | --- |
| Backend Release build | Passed; zero warnings/errors |
| Full backend package | 55 passed, zero failed/skipped, real isolated PostgreSQL |
| Migration upgrade | Existing Phase 3 settings in five locales backfilled correctly; Locale/time zone and historical task retained; no pending EF model changes. Existing Phase 2 upgrade test also passed. |
| Frontend lint | Passed |
| Frontend tests | 35 passed across 14 files; final run used --maxWorkers=2 |
| Production build | Passed; actual route chunks, no raised warning threshold and no large-entry warning |
| Existing browser regressions | 11 passed: six foundation/Phase 1-3/UX, two authentication, two API-restart persistence, one persistent-browser plus API-restart remembered session |
| Existing UX refresh | Two passed: realistic surfaces at four widths, settings loading/error/retry, languages and both sign-out confirmations |
| Full production redesign, Chromium | Four passed: entire route matrix, real actions/corrections, explicit completed day, language/preferences, contextual/direct/mobile details, contrast/reflow/public Login |
| Full production redesign, Firefox | Four passed: central execution and correction flows, all languages, preferences, task panel/direct/mobile, contrast/reflow/public Login |
| Production performance | Before and after runs passed, one test each; local unthrottled laboratory measurements below |
| Git | Ordinary and staged diffs checked; reviewed new files tracked; original five staged file versions retained; final status reviewed |

### Coverage exercised

- Every principal route in light/dark at 375 and 1440 px: Today, Areas, Tasks, Inbox, task creation/details, Habits/details, Goals/details, Focus, Progress, Activity, Rewards and four Settings categories. Login has every language in light desktop/dark mobile. Critical actions and all-language forms/errors/dialogs run in Chromium and Firefox.
- Extra 320/768/1024/1920 px checks cover Today, Areas, Tasks, Appearance and Focus. Existing UX checks add 768/1920 px across the working surfaces. Text at 200% was exercised on Today, Tasks, Areas, Habits and Appearance, plus Settings preferences at 768 px. No horizontal document overflow in these checks.
- Separate new-account, small-day, busy-day and completed-day captures. The busy data has long task/goal titles, 15 planned tasks, additional inbox pages, deadlines, several areas/habits/goals, real reversals and reward claims. Existing UX data includes completed work mixed with unfinished tasks. No fixture is inserted into the owner's account.
- Task completion/reopening, mission selection, focus start/pause/reload/resume/complete, habit log/reversal/future schedule, qualitative/numeric goal history, reward claim, Activity, failed request/retry, archived history and ClientActionId lost-response/idempotency coverage remain connected to real PostgreSQL.
- All four language key sets and parameters are covered; plural messages, custom names, Nordic characters, date-only preservation, stable error mapping and rank identity have unit coverage. Browser language changes preserve Locale/time zone and survive reload. Appearance covers saving/reload, normal/compact and live system light/dark changes with reduced motion.
- Measured semantic text/background pairs meet 4.5:1 and control/focus boundaries meet 3:1 in both themes. The lowest tested text pair is 5.45:1; the lowest tested boundary is 3.13:1. These are measured roles, not accessibility certification. Focus return, real modal containment, non-modal task panel, editable-field shortcut exclusion and keyboard navigation were exercised.

### Actual visual inspection

Opened and assessed original screenshots, not only overflow assertions: baseline Today empty/small/busy and Login; redesigned Today, framed Areas, Settings categories, Login, Tasks/Inbox, mobile task details, non-modal task panel, Focus, habit week/details, goal cards/details, Progress, Activity, Rewards and translated validation/confirmation dialogs. Light/dark, mobile/desktop, long content and 200% Settings have concrete image references in the comparison. The completed-day captures were also opened in the closing review.

[Local comparison](../artifacts/full-redesign/review.html) contains the unchanged source screenshots with filters and full-size links. Its actual image loading and filtering were verified in Chromium. Detailed files are under ignored artifacts/full-redesign/chromium, artifacts/full-redesign/firefox, artifacts/ux-refresh and artifacts/reference-before. Mobile viewports are emulated, not physical-device tests. Full-page captures can place fixed navigation at the captured viewport position.

Defects found and corrected during verification: unauthenticated null preference preview; mobile habit-week word wrapping; Appearance overflow with enlarged text; asynchronous area selection in detail forms; rank artwork incorrectly receiving a translated enum; area-name validation binding; and sentence/number spacing in the ledger. Tests were updated for intentional labels and the editable capture date, while preserving domain/security assertions. Earlier failed intermediate runs are superseded by the successful final runs above.

### Production measurements

Same local Windows Chromium, 1440x1000, production Vite preview on 5174, isolated PostgreSQL, no CPU/network throttling. One run per stage; timings include browser/test-driver and cold-server effects. LCP measures the initial Login navigation before its first interaction; this is not field data or a claim about authenticated-route LCP/INP at the 75th percentile.

| Metric | Before | After |
| --- | --- | --- |
| Entry JS, raw | 512.22 kB | 254.72 kB |
| Entry JS, Node gzip | 154.29 kB | 77.96 kB |
| All built JS, raw | 512.22 kB | 601.90 kB |
| All built JS, Node gzip | 154.29 kB | 194.37 kB |
| Initial Login LCP | 408 ms | 156 ms |
| Observed CLS | 0.000048 | 0.009714 |
| Navigation load event | 139.2 ms | 74.7 ms |
| Tasks route ready | 2501 ms | 137 ms |
| Capture interaction | 80 ms | 81 ms |
| Tasks route API calls | 2 (areas, tasks) | 1 (tasks) |

The smaller entry comes from real route splitting, not a smaller total application. Total JS grew with four complete language catalogs and the added preference/command/week/artwork UI. The final Login-to-Today path loaded 544.24 kB decoded JS, including the prepaint script, and 176.26 kB transferred including request overhead. Other route chunks load on navigation. Shared catalog/forms remain eager because Login and global capture need them. No new package or external analytics were added. Vite's displayed gzip estimate differs slightly from the consistent Node gzip method used in this table. Keep before/after JSON files for the exact environment and network records.

### Delivery and runtime boundary

The three-column preference migration is reviewed and tested on isolated databases only. The owner's private data, credentials and existing development processes on 5080/5173 were not changed. Before using the new source in that separate running instance, apply the reviewed migration through the documented normal update workflow and rebuild/restart its API. Test runners started only their own API/Vite processes on 5082/5174 and removed their generated databases on exit.

Environment inspection found three other test-named databases: two contain records older than this task, and one has no application schema. These were inspected through metadata and left untouched; they were not attributed to the current recorded runners or deleted speculatively.

Twenty-three new maintained files from this task (including this plan) are tracked explicitly: display runtime, original artwork/ranks, command menu, habit week, preferences/catalog/formatting, component tests, migration/designer, backend read/tests and browser verification. The five pre-existing staged additions retain their original index versions. Screenshots, comparison HTML, profiles, logs, temporary scripts, build output, test results, caches and secrets remain outside tracking under existing ignore rules. No unexplained project files remain unversioned. No commit, amend, push, merge, reset or branch switch. Branch remains feat/ux-v3-refresh at HEAD 46a473f.
