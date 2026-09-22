# LIFEMAXING

A personal operating system for planning, execution and progress. The current private workspace includes Today planning modes, Tasks/Inbox, daily commitments and mission, Habits, Goals, Life Areas, manual Finance subscriptions, workspace search, persisted Focus, XP/progress, Activity, Rewards and Settings. It uses the approved artwork design with responsive top navigation and a menu drawer. See [implementation status](docs/IMPLEMENTATION_STATUS.md), [account/provider setup](docs/ACCOUNT_SETUP.md) and the [V2 audit ledger](docs/V2_STATUS.md) for delivered behavior, verification and deliberate future boundaries.

## Prerequisites

- .NET SDK 10.0.401 (the 10.0.4xx feature band is selected by `global.json`).
- Node.js 24.13.0 and npm 11. Node 24 is the supported frontend major.
- Docker with a running Linux container engine and Docker Compose v2.
- Rider can open `LIFEMAXING.sln` and run the API's `http` profile.

On this Windows development machine, .NET 10 was installed per-user at `%LOCALAPPDATA%\Microsoft\dotnet`. Select that `dotnet.exe` in Rider's toolset settings, or prepend it for direct PowerShell commands:

```powershell
$env:PATH = "$env:LOCALAPPDATA\Microsoft\dotnet;$env:PATH"
dotnet --version
```

On another machine, a normal installation of the matching SDK works. All commands below run from the repository root. The root development command also checks the normal and per-user .NET locations, so it can find the SDK selected by `global.json` even when an older system installation appears first in `PATH`.

## 1. Start PostgreSQL

Copy `.env.example` to `.env` and replace the password placeholder with a unique local password. `.env` is ignored by Git and excluded from the Docker build. Compose reads it automatically.

```powershell
Copy-Item .env.example .env
# Edit .env before starting the database.
docker compose up -d --wait
docker compose ps
```

PostgreSQL 18 (`postgres:18-bookworm`) listens only on `127.0.0.1:5432`, with database and username `lifemaxing`. Compose mounts the `postgres18-data` volume at `/var/lib/postgresql`, as required by the image's versioned data layout. Its named volume survives container restarts and `docker compose down`. Do not use `down -v` for a database you want to keep. Changing `.env` does not change the password of an already initialized database.

## 2. Start the API

Restore dependencies, then set `ConnectionStrings:Database` in ASP.NET Core User Secrets. This PowerShell example reads the local password without echoing it or placing it in shell history. Use the same password as `.env`.

```powershell
dotnet restore --locked-mode
$databasePassword = Read-Host 'Local database password' -MaskInput
$databaseSecrets = @{
  'ConnectionStrings:Database' = "Host=localhost;Port=5432;Database=lifemaxing;Username=lifemaxing;Password=$databasePassword;Timeout=5;Command Timeout=5"
} | ConvertTo-Json
$databaseSecrets | dotnet user-secrets set --project server/Lifemaxing.Api
Remove-Variable databasePassword, databaseSecrets
```

`-MaskInput` requires PowerShell 7. On Windows PowerShell 5.1, enter the connection string through Rider's User Secrets editor instead. Never paste credentials into tracked settings or share secret-store contents. On this machine, the Phase 0 setup already created `.env` and configured User Secrets; preserve those files/settings.

Apply reviewed migrations explicitly after schema changes:

```powershell
dotnet tool restore
dotnet tool run dotnet-ef database update --project server/Lifemaxing.Api
```

EF applies each migration in a transaction and records it in `__EFMigrationsHistory`. Normal application startup does not run migrations. Review an idempotent SQL script before a shared or production update with:

```powershell
dotnet tool run dotnet-ef migrations script --idempotent --project server/Lifemaxing.Api --output artifacts/migration.sql
```

The API listens on `http://localhost:5080`:

- `GET /health/live` returns `{ "status": "alive" }` independently of the database.
- `GET /api/v1/system/status` returns `{ "api": "available", "database": "available" }` after a successful read-only PostgreSQL query.
- Missing database configuration returns `database: "not_configured"`. An unreachable configured database returns HTTP 503 Problem Details with code `database_unavailable`, without connection details.
- Unknown `/api` and `/health` routes return HTTP 404 Problem Details, never SPA HTML.

These diagnostics remain public and contain no personal data. The CSRF-token and login endpoints are also public. Private application endpoints require the Identity cookie and return JSON 401 responses for anonymous requests.

## Provision the private owner once

Public registration now exists at `/signup` and requires configured verification delivery; see [account setup](docs/ACCOUNT_SETUP.md). The original one-time owner provisioning command remains available for an empty database. After the migration, put the intended owner email and a unique password in ASP.NET Core User Secrets:

**Bruk minst 15 tegn. Flere tilfeldige ord fungerer fint. Tall og spesialtegn er ikke påkrevd.** Maximum 128 Unicode characters; spaces are preserved. New passwords are checked against a bundled, limited common-password list, entirely locally. This intentionally replaces the former 12-character/composition policy. Existing passwords remain valid for sign-in; see the [canonical authentication policy](docs/ARCHITECTURE.md#authentication-policy--prompt-a-13-september-2026).

```powershell
$ownerEmail = Read-Host 'Owner email'
$ownerPassword = Read-Host 'Owner password' -MaskInput
$ownerSecrets = @{
  'OwnerProvisioning:Email' = $ownerEmail
  'OwnerProvisioning:Password' = $ownerPassword
} | ConvertTo-Json
$ownerSecrets | dotnet user-secrets set --project server/Lifemaxing.Api
Remove-Variable ownerEmail, ownerPassword, ownerSecrets
dotnet run --project server/Lifemaxing.Api -- --provision-owner
dotnet user-secrets remove 'OwnerProvisioning:Password' --project server/Lifemaxing.Api
dotnet user-secrets remove 'OwnerProvisioning:Email' --project server/Lifemaxing.Api
```

The command refuses to run if any account already exists. It creates the owner, default `Europe/Oslo` / `nb-NO` settings, and all ten documented Life Areas in one database transaction. It never runs during ordinary startup. On Windows PowerShell 5.1, use Rider's User Secrets editor for the password because `Read-Host -MaskInput` requires PowerShell 7.

## 3. Start local development

After the one-time setup above, the normal daily command is:

```powershell
npm ci
npm run dev
```

`npm run dev` ensures PostgreSQL is running and healthy, then starts the API with `dotnet watch --no-hot-reload` and the client with Vite in the same terminal. The API compiles once at startup, then rebuilds incrementally and restarts when backend source changes so newly registered endpoints take effect; frontend changes use Vite hot reload and do not rebuild the API. Press `Ctrl+C` in that terminal to stop both application processes. PostgreSQL intentionally remains running in its persistent container.

Use the component commands only when working on one part in isolation:

```powershell
npm run dev:db
npm run dev:api
npm run dev:client
```

Ports remain fixed at `5080` and `5173`. If startup reports that either port is already in use, an earlier API, Vite or Rider run configuration is still active. Return to the terminal or Rider run window that owns it and press `Ctrl+C` or Stop, then run `npm run dev` again. Do not terminate every `node` or `dotnet` process because Rider and other tools use them too.

Open `http://127.0.0.1:5173`. `/` checks `/api/v1/auth/me` and sends an anonymous visitor to `/login` or the authenticated owner to `/today`. Sign in with the provisioned account. Vite proxies `/api/v1` and `/health` to port 5080; the client always uses relative URLs. No CORS setup or frontend secrets are needed.

Authentication uses HttpOnly Identity and antiforgery cookies. The request token remains in memory and is refreshed across authentication changes. Only the non-sensitive interface language, theme and density are remembered in local display storage; no credentials, session identifiers or private domain data are stored there. In production, both cookies use the `__Host-` prefix, `Secure`, and `SameSite=Strict`; development uses HTTP-compatible names on localhost. Login is limited to ten requests per IP per minute, and five failed passwords lock the account for five minutes.

### Remembered sessions and troubleshooting

"Hold meg innlogget på denne enheten" is unchecked by default. Without it, the browser receives a session cookie with a 12-hour server limit. With it, the cookie persists for at most 30 days from sign-in. Neither slides indefinitely. These are project choices, configured through `Authentication:Sessions:SessionHours`, `RememberDays` and `StampValidationSeconds` (defaults/maxima 12, 30, 60 respectively). Browser session-restore settings can restore session cookies; closing a browser is not a substitute for Sign out on a shared device.

Settings → **Sign out everywhere** revokes older cookies through Identity's security stamp. The next request after the configured validation interval (at most 60 seconds) rejects them. Normal **Sign out** deletes this client's cookie; it does not immediately invalidate a previously copied cookie. Identity's stamp check is retained alongside JSON redirect handlers. Password reset uses the same revocation mechanism.

Use `http://127.0.0.1:5173` consistently. Cookies for `localhost` and `127.0.0.1` belong to different hosts. The API can use a loopback proxy target, but browser requests stay relative to the Vite origin. Network/5xx failures now show a retry state instead of redirecting to Login; 401 alone means the current session is invalid. 403 is denied access and 429 means wait before retrying. Unknown accounts, wrong passwords and locked accounts share the same public sign-in failure response.

Data Protection uses `%LOCALAPPDATA%\Lifemaxing\keys\Development` on Windows, with per-user DPAPI encryption. Other hosts use the local-application-data directory. `DataProtection:KeyDirectory` can specify an absolute protected directory outside the repository. The application appends the environment name and uses an environment-specific application identity. Keep the process account, directory and environment stable across restarts. Back up keys securely; never put them in Git/images or share Development keys with Production. Linux key directories are created with mode 700 and must be owned by the app account; deploy on protected storage and plan encryption at rest before public operation.

This change establishes a stable key location/application identity, so **cookies issued by the earlier build require one new sign-in**. Existing accounts and all persisted data are unchanged. The audit confirmed durable default Windows keys were already present; it did not establish that key loss caused the user's historical logout. It did confirm automatic redirects on any `/auth/me` error and an overwritten Identity stamp handler. Different browser hosts/profiles and the old content-root-dependent key identity are possible session-loss factors, not independently reproduced historical causes.

### Forgotten local owner password

After the Release build, from the repository root in a local interactive Windows terminal, run:

```powershell
& "$env:LOCALAPPDATA\Microsoft\dotnet\dotnet.exe" run --project server/Lifemaxing.Api --configuration Release --no-build --launch-profile http -- --reset-owner-password
```

Use the .NET 10 SDK described above. The `http` launch profile selects Development; this command exits without starting an HTTP server. Enter the **existing** account email, then a new phrase twice. Password input is masked and supports spaces/paste; Escape cancels. No password/token belongs in command arguments, shell history or redirected input. The command refuses Production, extra arguments and noninteractive input/output. It uses UserManager's reset token/validation, preserves the user ID and all relationships/history, clears lockout after success and revokes older sessions. It never provisions an owner, resets a database or removes passkeys. The real owner must enter their own new password; automated verification uses a disposable fictional account.

The Development command is unavailable in Production. Verified-email recovery now exists at `/forgot-password` and `/reset-password`, using expiring Identity tokens, rate limiting, account-neutral requests and session revocation. Configure and verify production delivery using [account setup](docs/ACCOUNT_SETUP.md); it is disabled by default. Retain a restricted, audited administrative recovery runbook and backup/restore verification. Do not set a deployed application to Development to bypass this boundary.

## Builds and tests

```powershell
dotnet build --no-restore
dotnet test --no-build
npm run lint
npm run test -- --run
npm run build
```

The server integration tests create and remove an isolated database on the configured PostgreSQL server. They read the API database connection from User Secrets by default; set `LIFEMAXING_TEST_CONNECTION` to override it. Tests cover migrations, authentication, lockout, rate limiting, CSRF, owner isolation, settings, logout, registration/verification/recovery, Google middleware with a simulated backchannel, search and subscriptions. Frontend tests cover loading and form behavior. Package versions are exact in project manifests; `package-lock.json`, NuGet lockfiles and `dotnet-tools.json` lock dependencies and EF tooling. Use `npm ci`, `dotnet restore --locked-mode` and `dotnet tool restore` for reproducible restores.

After a Release API build and frontend production build, run `powershell -NoProfile -ExecutionPolicy Bypass -File tests/browser/run-isolated.ps1 -SelectedFeatures` for the account lifecycle, Today modes/search, subscriptions and responsive account pages. It uses a disposable database and private temporary Development mailbox, cleans both, and leaves the normal application database and services alone.

Use `-AreaDetails` with the same runner for all ten area overviews, ID-scoped tabs, renamed/inactive areas, scoped capture, Finance navigation and the responsive artwork matrix. Add `-BrowserEngine firefox` for Firefox. The area routes are `/areas/:areaKey`, `/areas/:areaKey/tasks`, `/areas/:areaKey/goals`, `/areas/:areaKey/habits`; Finance also has `/areas/finance/subscriptions`. Names can change without changing stable routes or filtering. See the [completion audit](docs/COMPLETION_AUDIT.md) for the normal local migration and verification boundaries.

With all three development processes running, the public browser smoke checks cover real database status, route refresh, API 404 behavior and layout overflow at 375/768/1440 px:

```powershell
npx playwright install chromium
npm run test:smoke
```

The authenticated browser case runs when credentials are supplied in process environment variables. PowerShell prompts keep them out of command history:

```powershell
$env:SMOKE_EMAIL = Read-Host 'Owner email'
$env:SMOKE_PASSWORD = Read-Host 'Owner password' -MaskInput
npm run test:smoke
Remove-Item Env:SMOKE_EMAIL, Env:SMOKE_PASSWORD
```

It verifies protected routing, login, ten persisted areas, area and settings updates, refresh, a second page using the persistent cookie, logout and anonymous rejection. Use a disposable local owner for tests that edit data.

To run the public checks against the local production container, set `$env:SMOKE_BASE_URL = 'http://localhost:8080'`, then run `npm run test:smoke -- foundation.spec.js`. Remove that variable afterward to use Vite again. The authenticated browser case targets the development cookie configuration; it is not a production HTTPS test. These smoke tests require real PostgreSQL; they do not substitute mocked responses.

## Production-shaped local build

The multi-stage Dockerfile builds the client, publishes the API, copies the client into `wwwroot`, and runs as the .NET image's non-root user. Node is only used during the build.

```powershell
docker build -t lifemaxing:local .
```

Create an ignored `.env.container` containing a connection string with the local database password (replace the placeholder):

```dotenv
ConnectionStrings__Database=Host=db;Port=5432;Database=lifemaxing;Username=lifemaxing;Password=replace-with-your-local-password;Timeout=5;Command Timeout=5
```

With the database running:

```powershell
docker run --rm --name lifemaxing-local --network lifemaxing_default --env-file .env.container --mount type=volume,source=lifemaxing-production-keys,target=/var/lib/lifemaxing/keys -p 127.0.0.1:8080:8080 lifemaxing:local
```

Open `http://localhost:8080/start` and refresh it directly. ASP.NET Core serves the app and API on the same origin. `/api/v1/missing` must still return JSON 404. Stop the container with Ctrl+C. This is a local serving check; Phase 8 covers TLS, deployment, backups and operational security before public exposure.

The named key volume is required on every recreation; retain and reuse it. The image contains only an empty key directory owned by the non-root app user, not key material. Use a separate volume for each environment; do not remove the production key volume to troubleshoot login. Authenticated production serving requires HTTPS for Secure cookies; the HTTP diagnostic example does not weaken that policy.

For a host publish without Docker, run `npm run build`, `dotnet publish server/Lifemaxing.Api -c Release -o artifacts/publish`, then copy `client/dist/*` into `artifacts/publish/wwwroot/`. Run `dotnet Lifemaxing.Api.dll` from that publish directory with `ASPNETCORE_URLS=http://localhost:8080` and `ConnectionStrings__Database` set in the process environment. Production does not load development User Secrets.

For a durable host installation, explicitly set `DataProtection__KeyDirectory` to a protected absolute directory outside the repository, retain it across restarts, and run under the same service account. The application appends its environment name to that root. `AllowedHosts` defaults to `localhost;127.0.0.1`; set the actual allowed hostname when hosting elsewhere. The HTTP examples above verify local static/API serving only. Public authentication requires HTTPS, and trusted proxy/header configuration, TLS enforcement, operational password recovery and backup/restore remain deployment work recorded in the V2 ledger.

## Structure

- `client/src/app`: declarative routing and QueryClient.
- `client/src/features/auth`: login, `/me` bootstrap, protected routing and authenticated shell.
- `client/src/features/areas` and `features/settings`: owner-scoped queries and forms.
- `client/src/features/system`: public connectivity screen and query.
- `client/src/shared`: fetch client, CSS tokens, global styles, Button, Input, Card and PageHeader.
- `server/Lifemaxing.Api/Data`: AppDbContext, Identity entities, migration and owner provisioning.
- `server/Lifemaxing.Api/Features`: explicit endpoint groups for auth, settings, areas and system status.
- `tests/Lifemaxing.Api.Tests`: focused API and PostgreSQL integration tests.
- `docs`: product and engineering source of truth; current progress is in `IMPLEMENTATION_STATUS.md`.

Phase 2 routes are `/today`, `/inbox`, `/tasks`, `/tasks/new`, `/tasks/:id`, `/habits`, `/habits/:id`, `/goals` and `/goals/:id`. Areas and Settings remain available. Detailed API contracts, validation and historical planning rules are in [docs/PHASE2_API.md](docs/PHASE2_API.md). Phase 3 adds `/focus`, `/progress`, `/activity` and `/rewards`. Progression API contracts, mandatory ClientActionId headers and historical rules are documented in ARCHITECTURE.md and DATABASE.md.

On this Windows/Compose development setup, the complete browser checks can run without touching the private owner's data:

```powershell
dotnet build -c Release
powershell -NoProfile -ExecutionPolicy Bypass -File tests/browser/run-isolated.ps1
```

The runner uses the existing User Secrets database connection, creates a uniquely named temporary PostgreSQL database, applies migrations and provisions a fictional owner. It starts a separate Release API on 5082 and Vite on 5174, runs Phase 0/1/2/3 and UX browser flows, restarts the API and verifies the stored task, habit/schedule/log, goal, XP, reward claim and paused focus history again. It removes its database and stops its processes in `finally`. Ports 5082 and 5174 must be free. Development services on 5080/5173 are left running. `LIFEMAXING_API_TARGET` overrides the Vite proxy only for this isolated run; the normal default remains 5080.

Browser checks edit records and must use a disposable owner. The isolated runner is the preferred full-suite workflow. Restart any already-running development API after rebuilding to load new endpoint code.

Prompt A verification (13 September 2026): 44 backend tests passed, including all prior 36 cases and 8 auth cases; 17 frontend tests passed; lint and production build passed. All 11 isolated browser checks passed (6 existing flows, 2 auth checks, 2 Phase 2/3 API-restart checks, 1 remembered-login restart check). The new restart test closes/relaunches Chromium with a real persistent profile rather than importing exported storage. Login was checked at 375/768/1440 px, with keyboard visibility toggle, autofill attributes, error recovery and both cookie choices. Paste/exact Unicode text is also covered by component tests. A specific third-party password manager, browser session-restore configurations and browsers beyond Chromium were not manually verified.

For repeatable container key persistence and Production-command refusal checks, build `docker build -t lifemaxing:auth-verification .`, then run `powershell -NoProfile -File tests/browser/run-auth-runtime.ps1`. It uses port 5083, its own database/container/key volume, and cleans those resources. Optional `-InteractiveRecovery` exercises the actual masked .NET command against the script's fictional account/phrase; this was verified successfully, including old-password rejection, new-password login, unchanged ID and ten retained Life Areas. Backend tests additionally retain task completion, XP, Activity and command receipts across recovery, and verify stamp revocation, expiry, lockout, CSRF and Production cookie flags. Production HTTPS deployment and its eventual operational recovery process remain unverified deployment work.

## Local Development account lockout exception

Historical opt-in only: the local exception was removed during authentication recovery closure. Ordinary account lockout is active. The full redesign does not enable this exception or reset the owner's password.

Local access maintenance after Prompt B adds an explicitly opted-in exception for one existing account. `DevelopmentAccess:Email` and `DevelopmentAccess:DisableAccountLockout` are stored in local User Secrets, never committed configuration. The current operator configured the intended existing account locally; no password was generated, logged or stored in configuration by the agent.

Both the environment and exact normalized account email must match. Ordinary password verification, confirmed-email checks, CSRF, cookies and the IP rate limit remain active. Only Identity account lockout is bypassed for that selected Development account. `LockoutEnabled` stays true in the database: Production/Staging ignore the exception even if the configuration is accidentally supplied there. No other account is unlocked or provisioned.

To clear an existing lockout after configuring that local opt-in:

```powershell
& "$env:LOCALAPPDATA\Microsoft\dotnet\dotnet.exe" run --project server/Lifemaxing.Api --configuration Release --no-build --launch-profile http -- --unlock-development-account
```

This command uses UserManager, clears LockoutEnd/AccessFailedCount and exits without an HTTP endpoint. It neither changes a password nor deletes domain data. Use the existing masked `--reset-owner-password` command above to select a new password privately. No reset-password secret is required, and nothing needs to be copied into shell history or chat.

To restore ordinary account lockout, remove the local opt-in and restart the API:

```powershell
& "$env:LOCALAPPDATA\Microsoft\dotnet\dotnet.exe" user-secrets remove "DevelopmentAccess:DisableAccountLockout" --project server/Lifemaxing.Api
& "$env:LOCALAPPDATA\Microsoft\dotnet\dotnet.exe" user-secrets remove "DevelopmentAccess:Email" --project server/Lifemaxing.Api
```

This Development convenience does not disable the independent IP limiter. Repeated requests can still receive 429; wait for its normal one-minute window. Do not enable Development on a deployed environment to obtain this exception.

The UX refresh checks run separately with `powershell -NoProfile -ExecutionPolicy Bypass -File tests/browser/run-isolated.ps1 -UxRefresh`. They use their own fictional PostgreSQL account, test language persistence and both logout confirmations, and capture empty/populated surfaces at 375/768/1440/1920 px under ignored `artifacts/ux-refresh/`. The isolated runners explicitly set their fictional account locale to English for deterministic regression copy; real account preferences are untouched.


## Full interface redesign

The complete Phase 1–3 interface supports English, Norwegian Bokmål, Swedish and Danish, with separate regional formatting and time zone, light/dark/system themes and normal/compact density. Account preferences use the additive `20260913181606_InterfacePreferences` migration. Apply reviewed migrations with the existing database-update workflow before running the updated API; this migration preserves Locale, time zone and historical domain data. Restart the development API after rebuilding.

Build with `npm run build`, then run `powershell -NoProfile -ExecutionPolicy Bypass -File tests/browser/run-isolated.ps1 -Redesign` for the production-preview Chromium matrix. Add `-BrowserEngine firefox` for the second engine (`npx playwright install firefox` once). `-PerformanceStage after` records local production loading, route/action timings, requests and raw/gzip bundles. These options create disposable databases and fictional accounts, use ports 5082/5174, and leave ordinary development services alone. Run the runner without options for the full existing Phase 1–3/authentication/API-restart regression sequence.

See [the design system](docs/DESIGN_SYSTEM.md) and [the coverage and verification record](docs/UX_REDESIGN_PLAN.md). Generated screenshots, comparison pages and logs stay under ignored `artifacts/`.
