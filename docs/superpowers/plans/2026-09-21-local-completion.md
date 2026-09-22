# Approved local completion pass

User approval explicitly includes applying `20260920220222_PlanningModesAndSubscriptions` to the normal local Development database, preserving existing records. No reset, reseeding, account reset, provider credential changes, commit or push is authorized.

## Implementation

- Reproduce the normal-development Planning Mode failure through an authenticated browser. Inspect settings response, selector/query state, deployed API and schema; fix the actual cause.
- Back up the normal database privately, capture existing-table fingerprints, apply the reviewed additive migration and compare preserved data. Verify the new column, table, constraints/index and migration history.
- Verify mode load/edit/save/refresh/logout/login on the normal app and restore the starting preference. Keep user credentials in the sign-in UI only.
- Add owned `/areas/:areaKey` overview and tasks/goals/habits child routes, using the resolved real area ID. All ten keys retain their artwork, renamed/inactive areas work, unknown areas never render an unfiltered list. Reuse existing lists/forms and preserve reset/pagination scope.
- Make card surfaces accessible overview links with independent controls and editing behavior. Finance navigation includes the existing subscriptions screen and return to overview.
- Rank page/action search exact/prefix/substring, add Finance Subscriptions and update Life Area results/context for new routes. Preserve owned backend ranking and keyboard/cancellation behavior.

## Verification and delivery

- Maintain the 17-requirement completion audit. Add targeted regression tests and all-area browser checks, including rename, scope override/reset, Finance navigation and image assignments.
- Run frontend lint/tests/build, locked .NET restore, Release build/tests, isolated Chromium/Firefox workflow and responsive checks. Normal local Planning Mode verification is separately required.
- Update current documentation with actual migration, failure cause and test evidence. Review all changed/new files; track new maintained source/test/docs explicitly, preserve existing staging, and keep private backups and generated evidence outside Git.

## Scope boundaries

Keep existing React/Vite JavaScript, ASP.NET Core Identity, EF Core/PostgreSQL, UI language and owner gating. No new schema beyond the reviewed migration is planned. Google/Resend live configuration, Apple OAuth, bank connections and template builders remain outside this pass.

## Execution record

The additive migration and existing-table integrity checks completed against normal Development PostgreSQL. All-area routes, real-ID filtering, Finance navigation and search changes are implemented. Frontend lint/build, 89 frontend plus three launcher tests, locked backend restore, Debug/Release builds and 76 backend tests passed. The new area suite passed in Chromium and Firefox; artwork/Finance checks and all 11 existing browser regressions passed (21 browser scenarios total). A test-only progress-note assertion was corrected after its trace showed refresh interrupting an unfinished write.

The normal API/Vite stack is running. Existing-account Planning Mode browser verification is **not complete**: the open verification browser still requires the user's interactive sign-in. No credentials were requested in chat, session forged or account reset. The database cause was reproduced directly, but the required selector/save/refresh/logout/login flow cannot be claimed from schema checks or isolated tests. See IMPLEMENTATION_STATUS.md and COMPLETION_AUDIT.md for evidence and this remaining acceptance check. No commit or push occurred.
