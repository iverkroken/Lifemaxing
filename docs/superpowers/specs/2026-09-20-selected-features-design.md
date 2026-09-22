# Selected feature additions

This implements the user's 20 September brief, an explicit exception to the older owner-only registration and deferred Finance restrictions. Existing Identity/cookies, CSRF, shared UI, PostgreSQL ownership and history remain authoritative. Earlier uncommitted quality-pass changes must be preserved. No commit, branch, deployment, real-bank connection or migration of the owner's private database is authorized.

## Account lifecycle

Email/password registration uses UserManager and the existing 15–128 Unicode-scalar/common-password policy. A transaction creates an unconfirmed Identity user, settings and the same ten standard Life Areas as provisioning. Confirmed email remains required for login. Duplicate email is a useful registration validation error; forgot-password and resend requests remain account-neutral. Password reset and email confirmation use Identity purpose-bound, expiring tokens, never bespoke cryptography. Password changes require the current password and revoke old sessions through the security stamp.

An IAccountEmailSender boundary supports Resend over HttpClient and an explicitly enabled Development-only local mailbox outside webroot/Git. The mailbox contains sensitive one-time URLs, never emitted to normal logs or HTTP responses. No configured delivery means an honest unavailable response. Link origins come from validated application configuration, never request Host. Reset/confirmation links put token material in the fragment to keep it out of server access logs, with no-referrer responses. Confirmation requires a deliberate POST; opening a link alone cannot change account state.

Google uses Microsoft's supported authentication handler and Identity external cookies/logins. No provider access tokens are stored. Only a verified provider email can bootstrap a new local account. An existing email is not silently linked: users must prove ownership through the local account flow. Google is disabled without credentials. Apple is a documented disabled configuration boundary until a supported handler, signing-key rotation and real-provider validation are supplied; no pretend OAuth.

Public login/signup/recovery/verification pages share the existing brand, tokens and original `no risk no story.jpg`. Image geometry remains responsive and the form leads on small screens. Signed-in password change belongs to existing Security settings.

## Today and search

Persist one planning-mode string on UserSettings: Simple, ThreeThreeThree, FocusedDay, Custom. Switching mode never copies, deletes or changes tasks, commitments, habits or mission. Simple prioritizes the daily list; Focused Day emphasizes the existing mission and supporting tasks/habits; 3:3:3 explains three hours of meaningful work, three shorter tasks and three maintenance activities with no forced quotas. Custom is a reusable presentation/template key, not a builder or a separate record system. Existing users retain the current mission-centered experience through the FocusedDay default.

Search extends the existing command dialog. Navigation/actions appear immediately; a bounded owner-scoped endpoint searches titles of tasks, goals, habits and Life Areas. Rank exact/prefix/word/substring matches before limited typo similarity, then area relevance, active importance and recency. No AI, external service, full-data browser cache or new search infrastructure. Empty input gives useful destinations/recent items; no results is distinct from loading/failure. Debounce network reads, cancel obsolete queries, retain keyboard arrows/Enter/Escape. No Project entity exists, so none is invented.

## Finance subscriptions

Manual Subscription root: Id, UserId, Name, Category, Price decimal, Currency, BillingInterval, NextBillingDate, StartDate, Notes, Status, CreatedAtUtc, UpdatedAtUtc. Explicit bounded strings, nonnegative prices, real currency codes, valid date order, Active/Cancelled statuses. Supported intervals: Weekly, Monthly, Quarterly, Yearly. UserId always comes from the authenticated principal; foreign IDs return 404. Cancellation preserves records. A stable UUID supports future transaction links without replacing the manual record.

The Finance card links to `/areas/finance/subscriptions`; the screen lists/edits records, groups active costs by currency/category, and shows upcoming dates. Monthly estimates use weekly ×52/12, monthly ×1, quarterly /3, yearly /12; annual estimates use ×52/12/4/1 respectively. Sum decimals before display rounding. Never add unlike currencies or imply an exchange conversion. Overdue dates remain visible for manual review; no invented paid transactions or silent rescheduling.

Future PSD2/Open Banking is documentation only: consented connection, encrypted provider credentials, idempotent transaction import, separate provenance, suggested matches by merchant/currency/amount/cadence and user confirmation. Imports must never overwrite the subscription definition or create a fake bank connection.

## Acceptance

Additive EF migration, inspected SQL and isolated PostgreSQL migration test; owned CRUD/search/settings tests; Identity verification/reset/wrong-token/duplicate/expiry/privacy tests; frontend form/keyboard/mode tests; responsive real-browser flows. Run frontend lint/tests/build and backend build/tests. Document implemented, configurable-but-unconnected and planned work separately. Preserve existing staged files and explicitly add reviewed new source/test/docs only.
