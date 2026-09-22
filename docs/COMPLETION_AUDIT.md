# Selected features completion audit

This audit covers the original 17 requirements and the approved local-development/Life Area follow-up of 21 September 2026. Provider setup is deliberately separate from implemented provider code. Final run counts and any unresolved local interactive checks are recorded in IMPLEMENTATION_STATUS.md.

| Requirement | Implementation and evidence |
| --- | --- |
| 1. Today modes | Existing per-user settings and shared task/habit data. Mode persistence/isolation tests, settings-load recovery regression and real local interactive verification described in status. Custom is a future template key, not a builder. |
| 2. Smart search | Owned bounded backend ranking; localized navigation/action exact/prefix/substring ranking; Finance destination; area results use stable overview routes. Tests cover old exact/word matches, typo handling, cancellation, keyboard and nested-area context. |
| 3. Registration | Identity creates user/settings/ten areas transactionally; duplicate and password validation, CSRF, delivery failures and unconfirmed login covered by lifecycle tests. |
| 4. Account design | Existing No Risk No Story artwork, shared controls, four languages and both themes; account browser matrix covers desktop/mobile, enlarged text and reduced motion. |
| 5. Verification | Purpose-bound Identity tokens, explicit confirmation POST, resend and private Development mailbox. Real delivery remains disabled/unconfigured; no delivery claim is made. |
| 6. Password lifecycle | Neutral forgot requests, expiry/purpose/replay checks, reset and authenticated current-password change, old-session revocation. Existing account browser lifecycle and backend tests retained. |
| 7. External login | Supported Google handler plus same local Identity users; verified email required, no silent email linking. Simulated backchannel tests only. Apple stays disabled and documented as prepared, not operational. |
| 8. Subscriptions | Existing owned manual records/forms preserved. Per-currency decimal estimates, retained cancellation and manual dates remain. Finance overview/navigation and search now expose the page naturally. |
| 9. Bank boundary | Architecture documents consented idempotent imports, separate owned transaction links and user-confirmed matching. No bank calls, imported transactions or fake connections. |
| 10. Account/device data | PostgreSQL is authoritative. Principal-based filtering and linked-area ownership remain; frontend cache keys include owner. Same-account refresh/session persistence and two-account isolation have dedicated tests. |
| 11. Navigation | Existing top navigation retained. All ten stable area keys have Overview/Tasks/Goals/Habits; Finance also has Subscriptions. Owned area IDs filter records independently of display names. |
| 12. Design quality | Shared tokens, original area artwork, responsive area header/tabs/list layouts and accessible card links. Full image/card editing behavior retained. |
| 13. Security | Authentication, CSRF, ownership, server validation, protected Identity tokens and private secret boundaries retained. No passwords, keys or tokens are returned in domain DTOs or committed. |
| 14. Database | Reviewed additive migration applied to the normal Development database with explicit user authorization. Private backup validated; all 24 existing table counts/row fingerprints matched immediately after migration. Column/default, subscriptions schema/FK/checks/index and history entry verified. |
| 15. Testing | Frontend/backend checks and isolated browser suites are rerun for this pass. Normal local Planning Mode checks are tracked separately, never inferred from disposable databases. |
| 16. Documentation | Current architecture/product/design and status describe area routes, search behavior, local migration and exact provider limitations. Earlier task entries remain historical evidence. |
| 17. Git hygiene | Previous work/staging preserved. New maintained source/tests/docs are tracked explicitly; private backups, browser profiles, temporary helpers, logs and build evidence stay outside tracking. No commit/push. |

## Local migration evidence

The normal configuration identified the local `lifemaxing` PostgreSQL database. It initially ended at `20260913181606_InterfacePreferences`; a direct read reproduced `column "PlanningMode" does not exist`, and Subscriptions was absent. The current settings endpoint projects PlanningMode; its failed load leaves the selector disabled by design. Removing the disabled attribute would conceal the unavailable settings.

A private custom-format pg_dump was created outside the repository with restricted permissions and its archive list validated. Aggregate row fingerprints/counts were captured for all 24 existing tables, excluding migration metadata and the newly added PlanningMode field. After applying `20260920220222_PlanningModesAndSubscriptions`, every baseline matched. No database reset, recreation, reseeding, account reset or historical record deletion occurred. The schema has a required varchar20 PlanningMode with FocusedDay backfill and the expected 13-column Subscriptions table, owned foreign key, four checks and composite query index.

The normal API/Vite processes are restarted with the current code. An authenticated browser session is required to finish the actual selector/save/refresh/logout/login checks; status must explicitly state the result rather than equating database repair with browser verification.

## Scope boundaries

No live Google, Resend or Apple configuration or external credentials are added. A template builder, Apple handler/signing-key rotation, real email/provider certification and bank import/matching remain future work. The area pages reuse existing entities/endpoints and introduce no additional schema.
