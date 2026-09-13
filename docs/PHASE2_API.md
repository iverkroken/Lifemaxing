# Phase 2 contracts and implementation decisions

All routes below are under `/api/v1`, require the authenticated Identity cookie, and scope resources and related IDs to the principal. Every mutation validates `X-CSRF-TOKEN`. Foreign IDs return the same 404 as missing IDs. Existing authentication, settings and Areas contracts are unchanged.

## Common conventions

- Calendar dates are `YYYY-MM-DD` / PostgreSQL `date`; UTC events are `timestamptz`. The default Today date is derived on the server from `UserSettings.TimeZoneId`. Explicit calendar dates must be between 1900-01-01 and 9998-12-31.
- Titles are trimmed, required, and limited to 200 characters. Details/descriptions allow 10000 characters; progress notes allow 5000.
- PATCH is a typed merge patch: omitted fields are preserved and explicit `null` clears nullable fields. Unknown PATCH fields are rejected. POST contracts contain no owner ID.
- Task, habit, goal, log and progress lists return `{ items, page, pageSize, total }`. Defaults are page 1 and 30 rows; pageSize is clamped to 1–100. Ordering includes a stable ID tie-breaker. Today returns the complete selected daily plan rather than silently truncating it.
- Validation returns 400 with field errors and `validation_failed`; state conflicts return 409 / `state_conflict`; missing/foreign resources return 404 / `resource_not_found`.
- Planning writes run in a database transaction and lock the owner's UserSettings row. This serializes check-and-write rules for schedule boundaries, unique daily plans, mission changes, and completions. Different owners do not share that lock.
- Task, habit and goal DELETE actions archive. Historic commitments, completions, schedules, habit logs and goal progress retain their rows. No XP, Activity stream, score, reward or Focus behavior is implemented.

## Tasks and Quick Add

- `GET /tasks`: filters `inbox=true`, `status=active|completed|all|archived`, `areaId`, `goalId`, `plannedDate`, `dueBefore`, `search`, plus pagination. Default status is active; `all` means all unarchived tasks.
- `GET /tasks/{id}` also permits reading an owned archived task.
- `POST /tasks`: `title` alone is sufficient for Quick Add. Optional fields: `details`, `lifeAreaId`, `goalId`, `tier`, `priority`, `plannedDate`, `dueDate`, `estimateMinutes`.
- `PATCH /tasks/{id}` updates those fields; `DELETE /tasks/{id}` archives.
- `POST /tasks/{id}/complete` and `/reopen` return the updated task. Repeated calls do not create duplicate active completions/reversals. Reopening preserves the original completion with a reversal timestamp. Archived tasks cannot be edited/completed/reopened.
- Tiers are Tiny, Small (default), Medium, Large and Epic. Priority is Low, Normal (default) or High. Estimates are 1–10080 minutes. Tier cannot change while completed. These are planning attributes; no XP is awarded.
- Inbox follows PROJECT_SPEC precisely: uncompleted, unarchived tasks with no PlannedDate. Area/goal assignment and a due date alone do not remove a task from Inbox.

## Today, commitments and mission

- `GET /today?date=YYYY-MM-DD`: date is optional. Returns `localDate`, `currentLocalDate`, `timeZoneId`, `tasks`, `commitments`, `mission`, `habits`, `inboxCount`.
- Tasks include the selected date's commitments/mission, plus unfinished unarchived tasks planned or due on/before that date. Completed and archived committed tasks remain visible with their current status. This is a daily planning view, not a reconstruction of historical task state at midnight.
- `POST /daily-commitments`: `{ taskId, localDate }`. Sets the task's planned date and preserves its due date. Setting PlannedDate through task creation/editing also creates a commitment.
- Moving a future plan marks the previous commitment removed and clears a matching future mission. Moving after the original day starts retains its commitment. Original TimeZoneId and CommittedAtUtc are retained for historical interpretation.
- `DELETE /daily-commitments/{id}` marks cancellation, clears a matching PlannedDate and mission, and retains the row and removal timestamp. UI labels cancellation and plans created on the selected day. Future score eligibility is not calculated in Phase 2.
- `PUT /daily-mission/{date}`: `{ taskId }`. At most one mission per owner/date; task must be unfinished and unarchived. Selection creates/restores that day's commitment without moving an existing PlannedDate. Consequently an unscheduled mission task may still appear in Inbox, following the documented PlannedDate definition.
- `DELETE /daily-mission/{date}` clears the selection and leaves the commitment. Mission selection itself has no historical event table until Phase 3; its task and commitment history are retained.

## Habits

- `GET /habits`: `areaId`, `archived=true|false`, pagination. Inactive habits remain manageable in the current list.
- `GET /habits/{id}` includes ordered schedule history, including for archived habits.
- `POST /habits`: `{ title, lifeAreaId?, isActive?, schedule? }`. Defaults to active, daily, starting on the owner's current date. A supplied initial schedule starts today or later.
- `PATCH /habits/{id}`: title, area or active state. `DELETE /habits/{id}` archives and deactivates.
- `PUT /habits/{id}/schedule`: `{ effectiveFromDate, pattern, daysOfWeek?, weeklyTarget? }`. Appends a period beginning on a future date strictly after the latest period's start. The previous period ends at this date exclusively; already-started days and previously scheduled periods are never replaced. Periods carry the saved owner time zone at creation.
- Daily has no weekdays/target. SelectedWeekdays requires distinct ISO weekday numbers 1 (Monday) through 7 (Sunday). WeeklyCount requires a target of 1–7 and no weekdays. Today displays weekly completions and the target, using Monday-based ISO weeks and logs within the applicable schedule period. Additional unique daily logs beyond the target are allowed; no score is computed here.
- `GET /habits/{id}/logs`: optional `from`, `to`, pagination; includes reversed logs.
- `POST /habits/{id}/logs`: `{ localDate }`. The date must be today or earlier and expected under the historical schedule. The habit must currently be active/unarchived. WeeklyCount allows any day covered by its period. The unique active `(HabitId, LocalDate)` database index prevents duplicates.
- `POST /habits/{id}/logs/{logId}/revoke`: preserves the row and stamps ReversedAtUtc. A corrected completion can then create a new log. Existing logs can be corrected after archival.
- IsActive is a current operational toggle; it does not rewrite schedule periods or erase logs. Phase 4 must interpret any additional pause-history requirements explicitly when implementing scores.

## Goals

- `GET /goals`: `areaId`, `archived=true|false`, pagination; `GET /goals/{id}` includes archived details.
- `POST /goals`, `PATCH /goals/{id}`: `title`, `description`, `lifeAreaId`, `state`, `targetValue`, `baselineValue`, `unit`, `direction`, `targetDate`.
- States: Active (default), Paused, Completed. CompletedAtUtc follows current state. Completion is manual and awards no XP.
- Qualitative goals have no target, baseline, unit or direction. Their progress requires a note and no numeric value.
- Measured goals require target, baseline, a unit (up to 50 characters) and Increase/Decrease direction. Target must lie beyond baseline in that direction. Values use numeric(18,4); the API rejects excess precision/range instead of silently rounding.
- `GET /goals/{id}/progress`: newest-first paginated history.
- `POST /goals/{id}/progress`: `{ value?, note? }`. A measured goal requires a value. Updates append; a correction is another entry, and progress may regress.
- Once history exists, type, baseline, unit and direction cannot change, because existing entries would change meaning. Target and descriptive fields remain editable.
- `DELETE /goals/{id}` archives without removing entries or task links.

## Scope clarifications

The blueprint places TaskCompletion in Phase 3 while requiring completion/reopen in Phase 2 and deriving task status from active TaskCompletion. Phase 2 introduces only its Id, UserId, TaskId, CompletedAtUtc and ReversedAtUtc, with the documented partial unique index. This avoids a temporary boolean completion model and preserves corrections. Phase 3 adds AwardedXp, ledger, Activity and command-receipt behavior. Habit XpPerLog is likewise deferred until Phase 3.

Task is named `TaskItem` in C# to avoid collision with the asynchronous Task type; its database table is `Tasks`. No domain-model replacement is involved.

Completion, habit log and goal progress handlers have explicit transaction boundaries where Phase 3 will attach Activity/XP. No unused event bus, no-op service, or Activity table was added.

The dedicated UX pass retains `/today` as the authenticated landing page and exposes only implemented routes through a desktop sidebar and a mobile/tablet dock with a More dialog. See `DESIGN_SYSTEM.md` for the completed navigation and interaction patterns. API contracts are unchanged by that pass.
