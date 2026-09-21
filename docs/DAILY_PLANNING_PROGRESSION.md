# Daily planning and progression implementation

Approved 21 September 2026. This brief supersedes the earlier independent-rank and Inbox/Backlog proposals for this task. Tasks remain ordinary entities; Today derives its main list strictly from PlannedDate; Focus references an existing Task, Habit or Goal. Planning modes never own or move work. Unstructured Focus remains secondary.

## Delivery checklist

- [x] Daily workspace, shared capture, Goal selections, Habit XP 1–75 and preserved daily cap.
- [x] Focus references and compact entity selection.
- [x] Server rank catalog, divisions, Progress and Rank System.
- [x] Migration preservation, automated tests, responsive browser review and Git review.

## Decisions

- Existing DailyCommitments and DailyMissions remain historical references. A new priority must refer to a Task already planned on that date.
- Goal selection is an owned dated relation, not a Goal copy. Related Tasks also make Goals relevant; removing a selection cannot hide a Goal with planned Tasks.
- Focus adds nullable GoalId/HabitId with at most one reference, preserving existing Task sessions and unstructured sessions.
- Rank stays server-authoritative; JavaScript only presents the server catalog/results. XP and Level formulas remain unchanged.
- Division lengths are 3/2/2/2 for Iron and 3/3/2/2 for ten-level tiers. Challenger uses 90/93/96/98 starts, with I continuing indefinitely.
- Habit configuration zero (allowed by the old database constraint but rejected by the API) is normalized to the existing default 10 when tightening the constraint. Historical XP is not changed.
- No normal/private database migration without the separately required review/permission; isolated database verification is part of delivery.
- No commits, pushes or branch changes. Work is implemented in the current user-selected branch.

## Verification ledger

- Initial tree clean; all ten rank PNGs already tracked. Policy 2026.09.13.1 verified.
- Capture Enter regression RED: visible date was omitted from POST /tasks.
- Locked npm/.NET dependencies restored. Initial database test attempt blocked by missing local connection; isolating verification infrastructure.

### Final verification results

| Check | Result |
| --- | --- |
| `npm ci` and locked .NET restore | Passed; pinned SDK and EF tool restored. |
| `npm run lint` | Passed. |
| `npm run test -- --run` | 97 frontend tests in 30 files and 3 launcher tests passed. |
| `npm run build` | Passed. |
| Backend Debug and Release builds | Passed, zero warnings/errors. |
| `node scripts/run-dotnet.mjs test --configuration Release --no-restore` | 93 passed, zero failures/skips. |
| EF pending-model check | No pending model changes. |
| Fresh and legacy migration verification | Passed against disposable PostgreSQL 18; historical XP/receipts/task Focus preserved. |
| Existing browser regressions | 11 Chromium scenarios passed: foundation, identity/settings, planning, schedules, goals, Focus, rewards, retries and API/browser restarts. |
| New daily/progression browser suite | 3 Chromium and 3 Firefox scenarios passed, including an actual API restart. The restart test is intentionally skipped before restart, then runs and passes afterward. |
| Responsive matrix | Today, Focus, Progress and Rank System at 1440/820/390 px; light/dark/system, normal/compact, en/nb/sv/da, reduced motion, no horizontal overflow and uncropped loaded emblems. |
| Source/product review | Independent source review plus direct screenshot inspection; native controls, contextual actions, empty/error states and record identities reviewed. |
| Git whitespace / tracking | Checks passed; 18 new maintained files staged explicitly, 62 existing files modified, no unexplained untracked project files. |

Failed intermediate checks were investigated rather than suppressed: older assertions expected mixed missions/old rank names or the previous form order; the main regressions now assert the new contract. Browser checks uncovered a missing Cancel plan action, which was restored. An asynchronous controlled checkbox test now clicks and waits for the returned completion state. A lazy-image screenshot wait was corrected to load images before decoding them. One Firefox run overlapped a production rebuild; its trace showed 404s for replaced asset hashes. Rerunning against the stable final build passed unchanged assertions. No test timeout was increased to hide a failure.

Browser evidence remains ignored under `artifacts/planning-core-final`, `artifacts/planning-chromium-complete` and `artifacts/planning-firefox-final`; earlier failed-run evidence is also ignored. Physical-device and screen-reader certification are not claimed.

### Git and delivery

All ten unchanged required assets are tracked: Iron.png, Bronze.png, Silver.png, Gold.png, Platinum.png, Emerald.png, Diamond.png, Master.png, Grandmaster.png and Challenger.png under `client/public/images/ranks`. No new assets were generated. No maintained project file remains untracked. Existing ignore rules already exclude screenshots, traces, test results, logs, dependencies and build output; no ignore-rule change was needed. Disposable database files and credentials were outside the repository. No commit, push, merge or branch operation occurred.

Suggested commit groups:

1. Daily planning contracts, Goal selections, Habit XP constraint and shared capture/Today, with their migration and tests.
2. Focus entity references and selection UI, with its migration and reference tests.
3. Central rank catalog, Progress/Rank System, colors, translations and rank tests.
4. Browser runner/regression updates and consolidated product/architecture/status documentation. Shared files should be split by hunk where necessary; the final EF snapshot includes both migrations.

Remaining deployment step: apply the reviewed migrations to the normal application database before using the new frontend against it. That database was unavailable in this session and was not modified. Native browser verification can use the maintained isolated runner with `LIFEMAXING_TEST_CONNECTION` and `psql` on PATH; the existing Docker mode remains supported.

## Product and architecture report

The original problem combined misleading presentation and capture behavior. Tasks already used one Task table and could already store LifeAreaId. Focus stored a nullable TaskId reference, not a parallel task. However, Enter/default capture saved to Inbox despite displaying today's date; Today mixed planned, overdue, mission and historical commitment records, and the mission presentation could look like Focus storage. The implementation corrects these boundaries rather than creating another task model.

Today now orders its workspace as Planning Mode, Tasks Today, Today's Habits and Today's Goals. The hero remains the current day when browsing another date. Tasks Today includes completed tasks, but excludes undated, future and archived tasks. Earlier deadlines/plans and historical selections remain available in separate disclosures. Cancel plan and Plan for this day act on the ordinary task. Inbox explicitly means no planned date.

Simple is a minimal daily list. Focused Day permits one optional daily priority. Custom offers the same optional priority with free-form guidance. 3:3:3 recommends three meaningful work items, three shorter tasks and three maintenance activities. All four modes use the same records and never schedule, move, copy or hide tasks. The saved priority remains a reference through DailyMission; choosing a new priority requires an already-planned task.

Capture exposes Life Area, priority, size and planned date alongside title. Goal, details, deadline and estimate are secondary. Add to today saves today's date; Add to Inbox saves null. The full task form shares validation, defaults and payload conversion. The existing Tasks filters, Goal relationships, Life Area routes and owned search remain connected to these same records.

Habit rows use labeled native checkboxes, pending state and actual completion awards. Schedule rules determine which active habits appear, including weekly targets. The input, Zod schema, API/domain validation and database constraint all permit 1–75 XP. All habit awards still share the existing 75 XP cap per scheduled local day. The actual award can be lower; reversals undo the exact recorded award. No new streak calculation was invented.

Goals appear through an explicit owned/date selection or a task planned for that date. The union is deduplicated. Removing a manual selection retains a goal if linked planned tasks still require it. Numeric progress and latest notes reuse the Goal domain; goals are not daily checkboxes. Archived goals are excluded; completed selected/linked goals remain understandable and have no Continue action. Goal detail also offers Add to today and Focus.

Focus first selects Tasks, Goals or Habits. Today/active filters, Life Area, search and task priority/overdue/upcoming help choose an existing record. A session keeps its original reference, including across restart. Habit completion is separate from finishing a session; goal progress links to its existing screen. Atomic Complete task & finish, pause/resume, cancellation, idempotent commands and unstructured sessions are retained.

Life Areas remain one existing owner-validated relationship for all three entity types. No extra area table or task-area migration was necessary. Today summaries now carry Habit LifeAreaId, which was previously missing.

Progress features a large transparent PNG emblem, rank/division, numerical Level, total XP and separate next-level/next-division meters. Existing completion/focus totals, rewards links, activity and XP ledger remain. Rank System at `/progress/ranks` explains the activity → XP → Level → Rank/Division relationship and shows all ten ranks, ranges and divisions, with textual current/completed/locked states. English, Norwegian, Swedish and Danish use the same server data; reduced motion and the existing theme/density tokens are respected.

## Exact progression rules

XP is the net immutable award/reversal ledger. Goal progress and Focus duration still record activity without direct XP. Task rewards stay Tiny 10, Small 25, Medium 50, Large 100, Epic 200; Tiny/Small share their existing 50 XP daily cap.

Numerical Level is unchanged: Level 1 starts at 0; transition N→N+1 costs `500 + 100 × (N−1)`. Total threshold for L is `500 × (L−1) + 50 × (L−1) × (L−2)`. Negative net XP uses zero for level calculation. XP/Level rules remain v1; ranks are v2. Historical receipts and activity retain their original labels and versions.

| Rank | IV | III | II | I |
| --- | --- | --- | --- | --- |
| Iron | 1–3 | 4–5 | 6–7 | 8–9 |
| Bronze | 10–12 | 13–15 | 16–17 | 18–19 |
| Silver | 20–22 | 23–25 | 26–27 | 28–29 |
| Gold | 30–32 | 33–35 | 36–37 | 38–39 |
| Platinum | 40–42 | 43–45 | 46–47 | 48–49 |
| Emerald | 50–52 | 53–55 | 56–57 | 58–59 |
| Diamond | 60–62 | 63–65 | 66–67 | 68–69 |
| Master | 70–72 | 73–75 | 76–77 | 78–79 |
| Grandmaster | 80–82 | 83–85 | 86–87 | 88–89 |
| Challenger | 90–92 | 93–95 | 96–97 | 98+ |

Spare levels go to earlier divisions: 3/2/2/2 for Iron, 3/3/2/2 for ten-level entry ranges. Thus the illustrative Level 34 is **Gold III**, and Level 64 is Diamond III. Missing or sub-one input becomes Iron IV. Challenger I has no next rank/division and continues indefinitely. Division progress uses XP between the current division's starting-level threshold and the next division's starting-level threshold, with the existing formula; it is not a second Level calculation. Color-token names and `/images/ranks/{Name}.png` paths come from RankRules. Light/dark color values live in the shared token stylesheet.

## Persistence and migration decisions

Created `20260921180817_DailyWorkspaceAndHabitXp` and `20260921181454_FocusEntityReferences`, with EF designers and snapshot updates. Only the genuine new choice of a daily Goal gets a new table. Focus gets nullable references plus a database check restricting each session to at most one entity. Old habit zero configurations become the existing default 10; prior awards, logs, plans, sessions, activity and receipts are preserved.

Fresh-schema and older-schema upgrade tests run against disposable PostgreSQL 18 databases. The legacy migration regression verifies zero-configuration normalization while leaving prior zero awards, Bronze receipts, existing task sessions and accumulated time unchanged. No normal/private database was migrated during this task. Rollback is not lossless once new data exists; the old Habit constraint also cannot accept values above 25. Prefer a reviewed forward correction.

## Review decisions

- Ruling: retain historical DailyCommitments and DailyMissions rather than deleting legacy planning information; their UI is distinct from today's authoritative date list.
- Ruling: preserve goal/focus activity without direct XP rather than invent a new award rule for the rank redesign.
- Ruling: existing named rank PNGs are maintained assets already tracked under `client/public/images/ranks`; no movement, duplication or new artwork is needed.
- Ruling: adapt the maintained isolated-browser runner to an optional test connection/native psql and the existing pinned-SDK resolver because Docker and the normal local secret were unavailable. It only creates/drops generated test database names and never prints connection credentials.
- The independent final source review found no material ownership, data-integrity or rank-calculation defect. It called out the documented rollback limitation. Browser review corrected Habit row alignment, compact visible checkboxes with large targets, Focus area-label contrast and a Planning Mode label ambiguity.

## File inventory

### Created maintained files

- `client/src/features/focus/FocusPicker.jsx`
- `client/src/features/habits/HabitForm.test.jsx`
- `client/src/features/progress/RankSystemPage.jsx`
- `client/src/features/progress/rankDisplay.js`
- `client/src/features/tasks/taskForm.js`
- `client/src/features/today/TodayGoals.jsx`
- `client/src/features/today/dailyProgressCatalog.js`
- `docs/DAILY_PLANNING_PROGRESSION.md`
- `server/Lifemaxing.Api/Data/Migrations/20260921180817_DailyWorkspaceAndHabitXp.Designer.cs`
- `server/Lifemaxing.Api/Data/Migrations/20260921180817_DailyWorkspaceAndHabitXp.cs`
- `server/Lifemaxing.Api/Data/Migrations/20260921181454_FocusEntityReferences.Designer.cs`
- `server/Lifemaxing.Api/Data/Migrations/20260921181454_FocusEntityReferences.cs`
- `server/Lifemaxing.Api/Features/Progression/RankRules.cs`
- `server/Lifemaxing.Api/Features/Today/DailyGoalSelection.cs`
- `tests/Lifemaxing.Api.Tests/DailyWorkspaceTests.cs`
- `tests/Lifemaxing.Api.Tests/FocusReferenceTests.cs`
- `tests/Lifemaxing.Api.Tests/RankTests.cs`
- `tests/browser/daily-progression.spec.js`

### Modified existing files

- `client/src/app/App.jsx`
- `client/src/features/auth/AuthenticatedShell.jsx`
- `client/src/features/auth/CommandMenu.jsx`
- `client/src/features/focus/FocusPage.jsx`
- `client/src/features/focus/FocusPage.module.css`
- `client/src/features/focus/FocusPage.test.jsx`
- `client/src/features/goals/GoalsPage.jsx`
- `client/src/features/habits/HabitForm.jsx`
- `client/src/features/habits/HabitsPage.jsx`
- `client/src/features/habits/TodayHabits.jsx`
- `client/src/features/habits/TodayHabits.test.jsx`
- `client/src/features/progress/ProgressPage.jsx`
- `client/src/features/progress/ProgressPage.module.css`
- `client/src/features/progress/ProgressPage.test.jsx`
- `client/src/features/progress/RankBadge.jsx`
- `client/src/features/settings/catalog.js`
- `client/src/features/settings/language.js`
- `client/src/features/tasks/QuickAdd.jsx`
- `client/src/features/tasks/QuickAdd.test.jsx`
- `client/src/features/tasks/TaskDetailPage.jsx`
- `client/src/features/tasks/TaskRow.jsx`
- `client/src/features/tasks/TaskRow.module.css`
- `client/src/features/today/DayContext.jsx`
- `client/src/features/today/DayContext.test.jsx`
- `client/src/features/today/PlanningModeControl.jsx`
- `client/src/features/today/PlanningModes.test.jsx`
- `client/src/features/today/TodayHero.jsx`
- `client/src/features/today/TodayPage.jsx`
- `client/src/features/today/TodayPage.module.css`
- `client/src/features/today/TodayPage.test.jsx`
- `client/src/shared/api/productivity.js`
- `client/src/shared/styles/tokens.css`
- `client/src/shared/ui/Productivity.module.css`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/PHASE2_API.md`
- `docs/PROJECT_SPEC.md`
- `server/Lifemaxing.Api/Data/AppDbContext.cs`
- `server/Lifemaxing.Api/Data/Migrations/AppDbContextModelSnapshot.cs`
- `server/Lifemaxing.Api/Data/ProductivityModel.cs`
- `server/Lifemaxing.Api/Data/ProgressionModel.cs`
- `server/Lifemaxing.Api/Features/Goals/GoalEndpoints.cs`
- `server/Lifemaxing.Api/Features/Habits/HabitEndpoints.cs`
- `server/Lifemaxing.Api/Features/Habits/HabitRules.cs`
- `server/Lifemaxing.Api/Features/Progression/FocusEndpoints.cs`
- `server/Lifemaxing.Api/Features/Progression/ProgressionData.cs`
- `server/Lifemaxing.Api/Features/Progression/ProgressionEndpoints.cs`
- `server/Lifemaxing.Api/Features/Progression/ProgressionRules.cs`
- `server/Lifemaxing.Api/Features/Tasks/TaskContracts.cs`
- `server/Lifemaxing.Api/Features/Tasks/TaskEndpoints.cs`
- `server/Lifemaxing.Api/Features/Today/TodayEndpoints.cs`
- `tests/Lifemaxing.Api.Tests/Phase2IntegrationTests.cs`
- `tests/Lifemaxing.Api.Tests/Phase3Tests.cs`
- `tests/Lifemaxing.Api.Tests/PreferenceMigrationTests.cs`
- `tests/browser/phase2-restart.spec.js`
- `tests/browser/phase2.spec.js`
- `tests/browser/phase3-restart.spec.js`
- `tests/browser/phase3.spec.js`
- `tests/browser/run-isolated.ps1`
- `tests/browser/ux.spec.js`
