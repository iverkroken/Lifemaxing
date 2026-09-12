# LIFEMAXING Implementation Status

## Current Phase

Phase 1: Authentication and database — complete (12 September 2026).

Phase 2 has not started.

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

## Current State

The Phase 1 browser → API → PostgreSQL authentication and owner-data flow works. The local development database has the first migration applied and deliberately has no owner account yet, so the repository owner can provision the intended private credentials using the documented one-time command.

Only Identity, UserSettings and LifeArea data exist. No Task, Habit, Goal, Today, XP or later-phase functionality has been implemented.

Local credentials are stored in ignored `.env` / `.env.container` files and ASP.NET Core User Secrets, outside tracked source and the image build context. No Git commits, branches or pushes were made.

## Next Step

Await an explicit request for Phase 2. That phase adds Tasks, Inbox, Daily Commitments, Today and Daily Mission, Habits with versioned schedules and logs, Goals with progress history, and their real UI/API flows. XP and progression remain Phase 3 work.

## Known Issues

No unresolved Phase 1 implementation failures or unverified acceptance checks.

Environment note: the machine's system `dotnet` installation is still .NET 9. SDK 10.0.401 was installed per-user at `%LOCALAPPDATA%\Microsoft\dotnet`; select it in Rider or prepend that directory to the terminal PATH as documented in README. No global toolchain settings were changed.

An API-only development run can warn that `wwwroot` is absent; Vite supplies the development client. The Docker build supplies and verifies `wwwroot` for production serving. TLS, persisted Data Protection keys and public deployment remain Phase 8 work; the production cookie intentionally requires HTTPS.

## Frontend Build Status

Passed after Phase 1: clean `npm ci`, `npm run build`, and clean Linux client build with `npm ci` in Docker.

## Backend Build Status

Passed after Phase 1: locked .NET 10 restore, local EF tool restore, solution build with zero warnings/errors, and clean Release publish in Docker.

## Test Status

Passed:

- `npm run lint`.
- `npm run test -- --run`: 4 frontend interaction/API-client tests across 3 files, covering connection loading/refresh, failure/retry, login validation and expired-CSRF refresh/retry.
- `dotnet test`: 13 passing cases, reverified against PostgreSQL 18 during the repository audit. Phase 1 cases use an isolated real PostgreSQL database and cover migration application, wrong/right password, lockout, login rate limit, missing CSRF and an invalid token with a foreign Origin header, JSON 401, login/logout, settings validation, owner isolation and absent registration routes. The temporary test database is removed after the suite.
- `npm run test:smoke`: 3 browser checks through Vite against a temporary real PostgreSQL database and provisioned disposable owner. They cover actual status JSON, protected-route redirect, login, ten areas, area/settings persistence, refresh, a second page using the persistent cookie, logout, unknown API JSON 404, and no horizontal overflow at 375/768/1440 px. The temporary owner, database and credential file were removed afterward.
- `git diff --check`.

## Database Status

PostgreSQL 18 is healthy in Compose using `postgres:18-bookworm` (verified server version 18.6). The fresh `lifemaxing_postgres18-data` volume is mounted at `/var/lib/postgresql`; the previous `lifemaxing_postgres-data` volume is preserved and is no longer mounted. Before the switch, the previous database had zero users, settings and areas. The PostgreSQL 18 development database contains the ten expected Phase 1 tables and no owner account.

The repository audit reverified locked backend restore, build with zero warnings/errors, migration application, no pending EF model changes, and all 13 backend/database tests against PostgreSQL 18. The earlier browser and production-container checks listed above were performed before this database upgrade; they were not repeated during the audit.

## Migration Status

`20260912173928_InitialIdentityAndAreas` created and applied successfully. Its generated SQL was reviewed, EF reports no pending model changes, and integration tests apply it to a clean isolated database. Normal startup does not call `Migrate()`; README documents explicit transactional local application and idempotent script generation.

## Docker Status

Passed after Phase 1: healthy Compose database, `docker build -t lifemaxing:phase1 .`, built SPA refresh at `/areas`, JSON API 404 behavior and real database status from the container. No deployment or public exposure was performed.
