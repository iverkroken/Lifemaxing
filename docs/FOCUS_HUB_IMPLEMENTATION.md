# Focus hub implementation record

The subsequent [Focus refinement](FOCUS_REFINEMENT_IMPLEMENTATION.md) supersedes the initial artwork, five-sound and summary presentation described below. It uses the user's upgraded artwork, seven synthesized motifs, World Clock map/defaults and editable daily progress while preserving this hub's timing/accounting contracts.

Approved scope: single-screen Focus / Timer / Stopwatch / World Clock; original Odessey artwork with shared Today coverage; account preferences/cities; checkpoint-based focus accounting with explicit interruption recovery; no timer XP.

## Execution

- Policy checked: AGENTS.md 2026.09.13.1. Initial working tree clean.
- Inline implementation; no branch, commit or push. Existing architecture and approved plan are authoritative.
- Verification and any necessary implementation rulings are recorded here as work completes.

## Contracts

- Focus runs own schedule position and continuity. Existing FocusSession rows remain individual work intervals and preserve completion/XP contracts.
- Account preferences and cities are relational. Recovery metadata in browser storage contains identifiers/timestamps only, never item content.
- Timer/Stopwatch follow wall-clock time; only Focus excludes uncertain suspension.

## Delivered

- Four in-page modes, default Focus/Pomodoro, four fixed rhythms, Custom settings, and reviewed Smart schedules including breaks. Running focus hides setup. Item filters and history use shared sheets.
- Shared Today cover renderer with the unchanged original images; fixed viewport Focus artwork, horizontal overlay, normal container/header spacing, desktop/laptop fit and responsive mobile controls.
- Durable FocusRun schedule/controller/revision, bounded confirmed FocusSession time, recovery for probable suspension, explicit retry receipts, manual/automatic phase transitions, independent Timer/Stopwatch and laps.
- Five synthesized local sounds, volume/phase preferences, intentional browser notification permission and optional wake lock. Account preferences and city order persist to PostgreSQL; clocks use browser IANA/DST conversion.
- Existing entity picker/filter queries, owner validation, completion XP rules, task completion and habit logging, Focus history, Progress totals and deletion semantics are retained. Today/weekly summaries use confirmed spans, excluding breaks, pauses and cancelled intervals.

## Review and verification

A fresh read-only review found four material issues. Regression tests reproduced all four before fixes: terminal response retry after reload; settings opening before preferences load; the current versus next completion target; and deletion during a break. All fixes pass their covering tests and the full frontend/backend suites. The reviewer made no repository edits.

A final cache regression also reproduced stale Today/task/goal queries after explicit task completion. Completion now reuses the existing owner-wide productivity invalidation pattern; routine checkpoints retain narrow invalidation. The regression and final full frontend suite pass.

Verification repairs preserved the existing tests' intent: await acknowledged Pause/Start state before reload/API assertions; inspect visible World Clock headings rather than closed-dialog DOM; wait for actual asynchronous AudioContext startup; and test the current saved Life Area/recoverable-delete behavior. An initial overlapping backend build hit Windows file locks; sequential final builds/tests passed. Initial desktop fit assertions exposed small Smart/custom overflow; the shared short-viewport spacing now passes. These were resolved checks, not deferred failures.

- Frontend: 125 tests in 36 files plus 3 launcher tests pass. Lint and production build pass. This JavaScript/JSX project has no separate type-check command.
- Backend: 125 Release tests pass, no failures/skips. Locked restore, Debug and Release builds pass. EF reports no pending model changes. Fresh database/upgrade/ownership/recovery tests run against PostgreSQL.
- Existing Chromium regression suite: all 11 scenarios pass, including authentication, entity workflows, XP, deletion/restore, dialogs, responsive navigation and API/browser restart persistence. Stale archive-era test assertions were updated to verify current recoverable deletion and retained history; no unrelated application behavior was changed.
- New production-browser checks cover 1920×1080, 1366×768, 768×1024 and 390×844; desktop scroll/overflow, original-artwork geometry, header clearance, axe accessibility, Smart review, Custom duration, settings/volume reload, real Task/Goal/Habit selection, route changes, pause/reload, freeze recovery, Timer/Stopwatch and saved/reordered cities. Desktop/laptop/mobile captures were visually inspected. The hub flow and real one-minute Focus/break transitions pass in Chromium and Firefox (4 scenarios); the connected Today/entity/responsive/restart suite passes 3 Chromium scenarios. Together with the 11 existing regressions, 18 browser scenarios pass. Axe scans report zero violations. A normal Timer zero/sound test also verifies that no Focus command is written.

## Database and Git

`20260922180819_FocusTimeHub` adds four owned tables and two nullable FocusSession columns. After disposable upgrade tests, the approved normal Development upgrade was applied. A private custom-format backup was restricted to the current Windows user and validated by archive listing and full reading. Counts and aggregate row fingerprints for all 26 pre-existing tables/columns matched before and after migration and after normal startup. No reset, reseed or historical deletion occurred. The normal `npm run dev` stack is running; direct/proxied health and `/focus` return 200.

No new package dependencies. Two icons extend the existing pinned, MIT-licensed Phosphor paths. Maintained source, tests, migration and documentation are added to tracking by explicit paths. Screenshots, traces, logs, dependencies, builds, private backups and local secrets stay outside Git. No commit, push or branch change.

## Browser limits

Audio requires browser interaction and may be blocked by device/browser policy. Notifications require explicit permission on each device and OS permission. Wake lock is optional and can be revoked by the browser. Frozen/discarded/closed browsers cannot deliver exact-time alarms or keep JavaScript running. Focus therefore resumes through conservative recovery after an uncertain gap; confirming inactive work is bounded to the interrupted interval. Legacy untimed sessions remain explicitly labelled and retain their existing timing semantics. City search uses the installed browser's IANA exemplar-city catalogue with a few major-city aliases rather than an external geocoding service.
