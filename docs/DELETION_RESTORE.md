# Recoverable deletion and custom Life Areas

## Delivered behavior

Tasks, Habits, Goals and Life Areas now retain their original rows behind DeletedAtUtc and disappear from ordinary queries. Delete requires confirmation; Recently Deleted is accessible through Settings at /settings/recently-deleted. Its category filters show original names, deletion dates and remaining recovery time, with Restore and separately confirmed permanent deletion.

The backend enforces an exact 30-day window and ownership. Restoration retains IDs, fields, associations and history. Soft-deleting a Life Area preserves child links internally while the UI shows Unassigned; restoring reconnects them. Permanent area deletion clears child links without deleting the Tasks, Habits or Goals. Permanent entity deletion removes dependent operational records, detaches Focus references and preserves immutable XP and Activity. Deleting an active Focus target stops it and preserves elapsed time.

A hosted worker scans at startup and hourly, processes at most 100 items per run, locks each owner's existing write-lock row, and rechecks eligibility inside the transaction. Expiry blocks restore immediately; physical cleanup may occur later, especially with a backlog.

Custom Life Areas use stable generated keys and ordinary area queries/routes. The editor supports display name, active state, private image upload/removal/preview and focal coordinates. Image priority is custom, built-in, then generic fallback. JPEG/PNG/WebP uploads are limited to 5 MiB; MIME, signatures and container boundaries are checked, without full pixel decoding. Images are served with private/no-store cache policy. Upload retries reuse the newly created ID.

Migration: 20260921231831_SoftDeleteAndCustomLifeAreas. It preserves active data, moves old Task archive timestamps into ArchivedAtUtc, adds deletion/image fields and constraints, and removes the Life Area foreign key from historical XP while retaining its index.

## Verification and operational limits

- Final full backend rerun after all backend fixes: `dotnet test -c Release --no-restore --logger 'console;verbosity=minimal'` passed 102 tests, zero failed/skipped (3m37s). This includes concurrent cleanup/restore, expired retention, ownership, API restart, retained relationships, Focus, historical XP, private image responses and rejected truncated uploads. No backend code changed after this run.
- Latest full frontend run: 103 tests across 32 files, plus 3 launcher tests, passed. The Life Area rendering/upload retry and modal/cache regressions are included.
- Frontend lint and production build passed. Release solution build passed with zero warnings/errors. Debug verification initially encountered the running API executable lock; Release verification succeeded without stopping it.
- Migration SQL was reviewed and migrations were exercised on disposable PostgreSQL databases. The normal Development database has not been migrated for this feature. Apply the reviewed migration before running the updated API against that database, using the README procedure.
- Headed Chromium and Firefox verification passed all four new browser scenarios per engine against disposable PostgreSQL and the production frontend build. Chromium's three main scenarios and upload/error scenario passed in separate final invocations; Firefox passed all four together. Desktop (1440px/light), mobile viewport (390px/dark), narrow (320px), landscape (844px), 200% text and reduced motion were exercised. All 54 captured axe audits reported zero violations. Firefox also passed explicit computed contrast checks for nodes axe marked uncertain; screenshots were visually reviewed. This is browser-driven interaction and keyboard verification, not a screen-reader or physical-device certification.
- Scoped browser findings fixed: Recently Deleted rows/dialogs now reflow at enlarged text; newly deleted items say Deleted today rather than rounding partial days up; Life Area deletion explicitly repeats the 30-day recovery period. The existing global header wordmark clips at 320px combined with 200% text. This unrelated header issue remains; the tested recovery controls remain operable with no horizontal page/dialog overflow.
- Image container validation is not a guarantee that every compressed pixel payload is decodable.
- No commit, push or branch change occurred. Required new source/tests/migrations/docs are tracked. Rank artwork is unchanged; all ten PNGs remain tracked in client/public/images/ranks. Generated artifacts, uploads, secrets, logs and build output remain ignored/outside Git.

## Browser verification coverage

1. Create a custom Life Area through the dialog, preview/upload an image, adjust focus by keyboard, rename and reload; create linked Task/Habit/Goal records through their ordinary forms.
2. Record Habit completion and Goal progress, start Task Focus, soft-delete each record from its detail/edit view, verify Today/Search exclusion and stopped Focus with preserved history.
3. Open Recently Deleted from navigation, filter categories and restore by keyboard. Verify original identities, Task priority/date/Goal/area, Habit logs, Goal history and XP.
4. Confirm Life Area impact counts and recovery copy, cancel safely, delete while retaining children as Unassigned, restore the original area and image, remove/change the image and verify generic/built-in fallback behavior.
5. Permanently delete all four types through additional confirmation, verify empty state after reload and retained XP. Exercise image-upload retry without duplicate creation, built-in area deletion/restore, and a deliberately simulated 503 permanent-delete error retained inside the dialog.
6. Check accessible names/roles, focus containment, Tab/Shift+Tab, visible focus, Escape/cancel and focus return, keyboard slider/restore, contrast, text reflow and reduced-motion states. Review captured screenshots and accessibility trees.

Reproduce with `powershell -NoProfile -ExecutionPolicy Bypass -File tests/browser/run-isolated.ps1 -DeletionRestore -Headed -BrowserEngine chromium -ArtifactRoot artifacts/deletion-browser/chromium` (substitute firefox and its artifact directory for Firefox). The runner creates and removes isolated database/processes. Screenshots, axe reports, accessibility trees and contrast evidence stay ignored under `artifacts/deletion-browser`; normal local services/data were untouched.

## Exact recommended commit groups

Paths are repository-relative and cover the entire current feature diff exactly once. A means added; M means modified. These are recommendations only; no commit has been made. New maintained files are staged; existing modifications remain unstaged.

### 1. feat: add recoverable deletion and custom Life Area persistence

- `M server/Lifemaxing.Api/Common/Productivity.cs`
- `M server/Lifemaxing.Api/Data/AppDbContext.cs`
- `M server/Lifemaxing.Api/Data/LifeArea.cs`
- `A server/Lifemaxing.Api/Data/Migrations/20260921231831_SoftDeleteAndCustomLifeAreas.cs`
- `A server/Lifemaxing.Api/Data/Migrations/20260921231831_SoftDeleteAndCustomLifeAreas.Designer.cs`
- `M server/Lifemaxing.Api/Data/Migrations/AppDbContextModelSnapshot.cs`
- `M server/Lifemaxing.Api/Data/ProductivityModel.cs`
- `M server/Lifemaxing.Api/Data/ProgressionModel.cs`
- `M server/Lifemaxing.Api/Features/Areas/AreaEndpoints.cs`
- `A server/Lifemaxing.Api/Features/Areas/AreaImageValidation.cs`
- `A server/Lifemaxing.Api/Features/DeletedContent/DeletedContentCleanupWorker.cs`
- `A server/Lifemaxing.Api/Features/DeletedContent/DeletedContentEndpoints.cs`
- `A server/Lifemaxing.Api/Features/DeletedContent/DeletedContentService.cs`
- `M server/Lifemaxing.Api/Features/Goals/Goal.cs`
- `M server/Lifemaxing.Api/Features/Goals/GoalEndpoints.cs`
- `M server/Lifemaxing.Api/Features/Habits/Habit.cs`
- `M server/Lifemaxing.Api/Features/Habits/HabitEndpoints.cs`
- `M server/Lifemaxing.Api/Features/Progression/FocusEndpoints.cs`
- `M server/Lifemaxing.Api/Features/Search/SearchEndpoints.cs`
- `M server/Lifemaxing.Api/Features/Tasks/TaskContracts.cs`
- `M server/Lifemaxing.Api/Features/Tasks/TaskEndpoints.cs`
- `M server/Lifemaxing.Api/Features/Tasks/TaskItem.cs`
- `M server/Lifemaxing.Api/Features/Today/TodayEndpoints.cs`
- `M server/Lifemaxing.Api/Program.cs`
- `A tests/Lifemaxing.Api.Tests/DeletedContentIntegrationTests.cs`
- `M tests/Lifemaxing.Api.Tests/Phase2IntegrationTests.cs`

### 2. feat: add recovery management and custom Life Area controls

- `M client/src/app/App.jsx`
- `M client/src/features/areas/AreaArtwork.jsx`
- `M client/src/features/areas/AreaCard.jsx`
- `M client/src/features/areas/AreaDetail.jsx`
- `M client/src/features/areas/AreaDetail.test.jsx`
- `M client/src/features/areas/AreaPage.jsx`
- `M client/src/features/areas/AreaPage.module.css`
- `A client/src/features/areas/AreaPage.test.jsx`
- `M client/src/features/areas/areasApi.js`
- `M client/src/features/auth/CommandMenu.jsx`
- `M client/src/features/auth/CommandMenu.test.jsx`
- `M client/src/features/auth/MenuDrawer.jsx`
- `M client/src/features/finance/SubscriptionsPage.jsx`
- `M client/src/features/focus/FocusPage.jsx`
- `M client/src/features/goals/GoalForm.jsx`
- `M client/src/features/goals/GoalsPage.jsx`
- `M client/src/features/habits/HabitForm.jsx`
- `M client/src/features/habits/HabitsPage.jsx`
- `A client/src/features/settings/deletionCatalog.js`
- `M client/src/features/settings/language.js`
- `A client/src/features/settings/RecentlyDeletedPage.jsx`
- `A client/src/features/settings/RecentlyDeletedPage.module.css`
- `A client/src/features/settings/RecentlyDeletedPage.test.jsx`
- `M client/src/features/settings/SettingsPage.jsx`
- `M client/src/features/settings/SettingsPage.module.css`
- `M client/src/features/tasks/QuickAdd.jsx`
- `M client/src/features/tasks/TaskDetailPage.jsx`
- `M client/src/features/tasks/TaskRow.jsx`
- `M client/src/features/today/TodayHero.jsx`
- `M client/src/shared/api/client.js`
- `M client/src/shared/api/client.test.js`
- `M client/src/shared/ui/AreaLabel.jsx`
- `A client/src/shared/ui/DeleteEntityDialog.jsx`

### 3. test: verify deletion and Life Areas in browsers

- `M package.json`
- `M package-lock.json`
- `A tests/browser/deletion-restore.spec.js`
- `M tests/browser/run-isolated.ps1`

### 4. docs: document deletion lifecycle and verification

- `M docs/ARCHITECTURE.md`
- `M docs/DATABASE.md`
- `A docs/DELETION_RESTORE.md`
- `M docs/IMPLEMENTATION_STATUS.md`
