# LIFEMAXING

A personal operating system for planning, execution and progress. Phase 2 adds Today, Tasks, Inbox, Daily Commitments and Mission, Habits with schedule/log history, Goals with progress history, and Quick Add to the private Phase 1 foundation.

## Prerequisites

- .NET SDK 10.0.401 (the 10.0.4xx feature band is selected by `global.json`).
- Node.js 24.13.0 and npm 11. Node 24 is the supported frontend major.
- Docker with a running Linux container engine and Docker Compose v2.
- Rider can open `LIFEMAXING.sln` and run the API's `http` profile.

On this Windows development machine, .NET 10 was installed per-user at `%LOCALAPPDATA%\Microsoft\dotnet`. Select that `dotnet.exe` in Rider's toolset settings, or prepend it for each PowerShell terminal:

```powershell
$env:PATH = "$env:LOCALAPPDATA\Microsoft\dotnet;$env:PATH"
dotnet --version
```

On another machine, a normal installation of the matching SDK works. All commands below run from the repository root. Three separate processes are used during development.

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

Apply reviewed migrations explicitly before starting the API:

```powershell
dotnet tool restore
dotnet tool run dotnet-ef database update --project server/Lifemaxing.Api
dotnet run --project server/Lifemaxing.Api --launch-profile http
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

There is no registration endpoint. After the migration, put the intended owner email and a unique password in ASP.NET Core User Secrets:

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

## 3. Start the client

In a separate terminal:

```powershell
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. `/` checks `/api/v1/auth/me` and sends an anonymous visitor to `/login` or the authenticated owner to `/today`. Sign in with the provisioned account. Vite proxies `/api/v1` and `/health` to port 5080; the client always uses relative URLs. No CORS setup or frontend secrets are needed.

The browser stores only HttpOnly Identity and antiforgery cookies. The request token remains in memory and is refreshed across authentication changes. In production, both cookies use the `__Host-` prefix, `Secure`, and `SameSite=Strict`; development uses HTTP-compatible names on localhost. Login is limited to ten requests per IP per minute, and five failed passwords lock the account for five minutes.

## Builds and tests

```powershell
dotnet build --no-restore
dotnet test --no-build
npm run lint
npm run test -- --run
npm run build
```

The server integration tests create and remove an isolated database on the configured PostgreSQL server. They read the API database connection from User Secrets by default; set `LIFEMAXING_TEST_CONNECTION` to override it. Tests cover migrations, authentication, lockout, rate limiting, CSRF, owner isolation, settings, logout and the missing registration routes. Frontend tests cover loading and form behavior. Package versions are exact in project manifests; `package-lock.json`, NuGet lockfiles and `dotnet-tools.json` lock dependencies and EF tooling. Use `npm ci`, `dotnet restore --locked-mode` and `dotnet tool restore` for reproducible restores.

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
docker build -t lifemaxing:phase1 .
```

Create an ignored `.env.container` containing a connection string with the local database password (replace the placeholder):

```dotenv
ConnectionStrings__Database=Host=db;Port=5432;Database=lifemaxing;Username=lifemaxing;Password=replace-with-your-local-password;Timeout=5;Command Timeout=5
```

With the database running:

```powershell
docker run --rm --name lifemaxing-phase1 --network lifemaxing_default --env-file .env.container -p 127.0.0.1:8080:8080 lifemaxing:phase1
```

Open `http://localhost:8080/start` and refresh it directly. ASP.NET Core serves the app and API on the same origin. `/api/v1/missing` must still return JSON 404. Stop the container with Ctrl+C. This is a local serving check; Phase 8 covers TLS, deployment, backups and operational security before public exposure.

For a host publish without Docker, run `npm run build`, `dotnet publish server/Lifemaxing.Api -c Release -o artifacts/publish`, then copy `client/dist/*` into `artifacts/publish/wwwroot/`. Run `dotnet Lifemaxing.Api.dll` from that publish directory with `ASPNETCORE_URLS=http://localhost:8080` and `ConnectionStrings__Database` set in the process environment. Production does not load development User Secrets.

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

Phase 2 routes are `/today`, `/inbox`, `/tasks`, `/tasks/new`, `/tasks/:id`, `/habits`, `/habits/:id`, `/goals` and `/goals/:id`. Areas and Settings remain available. Detailed API contracts, validation and historical planning rules are in [docs/PHASE2_API.md](docs/PHASE2_API.md). XP and progression remain Phase 3 work.

On this Windows/Compose development setup, the complete browser checks can run without touching the private owner's data:

```powershell
dotnet build -c Release
powershell -NoProfile -ExecutionPolicy Bypass -File tests/browser/run-isolated.ps1
```

The runner uses the existing User Secrets database connection, creates a uniquely named temporary PostgreSQL database, applies migrations and provisions a fictional owner. It starts a separate Release API on 5082 and Vite on 5174, runs Phase 0/1/2 browser flows, restarts the API and verifies the stored task, habit/schedule/log and goal history again. It removes its database and stops its processes in `finally`. Ports 5082 and 5174 must be free. Development services on 5080/5173 are left running. `LIFEMAXING_API_TARGET` overrides the Vite proxy only for this isolated run; the normal default remains 5080.

Browser checks edit records and must use a disposable owner. The isolated runner is the preferred full-suite workflow. Restart any already-running development API after rebuilding to load new endpoint code.
