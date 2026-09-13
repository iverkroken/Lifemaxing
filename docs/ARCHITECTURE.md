# ARCHITECTURE.md

## Arkitekturbeslutning

Én React SPA i JavaScript og JSX, ett ASP.NET Core 10 Web API i C#, én PostgreSQL database. Backend er en modular monolith i én kjørbar prosess og normalt ett applikasjonsprosjekt. EF Core og Npgsql er datatilgangen; eksisterende DbContext er allerede en nyttig Unit of Work. React Router brukes i deklarativ rutemodus, TanStack Query for serverdata, React Hook Form med Zod og @hookform/resolvers for formularer, CSS Modules for lokale stiler og globale CSS variabler for designsystemet. Vitest og React Testing Library brukes der brukeratferd må verifiseres. xUnit og EF integrasjonstester dekker serverregler. Valg av majorversjoner for EF Core og Npgsql skal passe .NET 10 og låses i prosjektfil og låsefiler.

Begrunnelse for .NET 10 er støttet LTS drift til november 2028. [Microsofts støtteoversikt](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core) bekrefter dette. [React Router dokumenterer deklarativ installasjon](https://reactrouter.com/start/declarative/installation), [TanStack Query beskriver servertilstand](https://tanstack.com/query/latest/docs/framework/react/overview), og [Npgsql er EF leverandøren for PostgreSQL](https://www.npgsql.org/efcore/). Bruk React Router til navigasjon og TanStack Query til API data; ikke la begge eie samme innhenting.

## Anbefalt repoform

    client/
      src/
        app/                 ruting, QueryClient, auth bootstrap
        features/            today, tasks, habits, goals, focus, progress og områdemoduler
        shared/
          api/               fetch klient og feilformat
          ui/                knapper, felt, dialog, kort, layout
          styles/            tokens, reset, typografi
          lib/               dato og rene formateringsfunksjoner
      public/
    server/
      Lifemaxing.Api/
        Features/            Auth, Areas, Tasks, Habits, Goals, Today, Focus, Progression, Activity, Metrics, Fitness og videre
        Data/                AppDbContext, migrasjoner og EF konfigurering
        Common/              auth, feil, eieroppslag, tid, idempotens
        Program.cs
    tests/
      Lifemaxing.Api.Tests/
    docs/
      PROJECT_SPEC.md ... RISKS_AND_DECISIONS.md
    Dockerfile
    compose.yaml
    LIFEMAXING.sln
    README.md

Hver feature eier sine endepunkter, forespørsels og svarmodeller, regler og EF konfigurering. Delt DbContext er akseptabelt så lenge moduler ikke lager tilfeldige avhengigheter. Opprett egen tjeneste når regelen brukes på flere steder eller krever en transaksjon. Del ikke alt i Controller → Interface → Service → Repository uten faktisk behov. Frontend bruker samme mønster: egne skjermbilder, API funksjoner, Query hooks og skjemaer i hver feature; gjenbrukbare visuelle primitiver bor i shared/ui.

## Datavei og API kontrakt

I utvikling åpner nettleseren Vite på localhost. Relative kall til /api/v1 og /health går via Vites proxy til ASP.NET Core. Vite dokumenterer denne [proxyfunksjonen](https://vite.dev/config/server-options#server-proxy). I produksjon bygger Vite statiske filer som ASP.NET Core serverer fra wwwroot på samme origin; /api/v1 og /health håndteres før SPA fallback. En ukjent API rute må returnere 404 JSON, aldri index.html. Et gyldig refresh av /today må returnere appen.

Sekvensen er: React visning → feature hook → felles fetch klient → API endpoint → eierkontroll og validering → domeneregel → DbContext transaksjon → PostgreSQL → DTO → Query invalidation → visning. Kun serveren beregner XP, level, rank og Life Score. Klienten kan vise estimert XP før lagring, men serverresponsen er fasit. Ikke send EF entities direkte i JSON. Bruk ISO 8601 UTC tidsstempel for hendelser, YYYY-MM-DD for kalenderdato og eksplisitt valutakode eller måleenhet når dette kreves.

API prefiks er /api/v1. V1 og V2 bruker samme API major når kontrakten bare utvides. Ressurser bruker GET liste, GET per id, POST, PATCH og DELETE når handlingen passer. Handlinger som fullføring bruker POST /{id}/complete og POST /{id}/reopen; GET endrer aldri tilstand. Lister bruker pageSize, cursor eller page og filtrering; begrens standard og maksimal pageSize. Feil bruker Problem Details med stabile maskinlesbare feilkoder, gyldige HTTP statuser og feltfeil for validering. 401 er uinnlogget, 403 avvist handling, 404 også for fremmede eller manglende eierressurser, 409 ved konflikt, 400 for ugyldig input. Klientens Query keys inkluderer bruker og filter, og tømmes helt ved utlogging.

### Phase 3 API additions

All routes below use the existing authenticated `/api/v1` group, CSRF filter and owner transaction lock. Level/rank/cap calculations live in the concrete ProgressionRules class; Focus reuses TaskEndpoints.Complete for task completion within the same transaction.

| Route | Contract |
| --- | --- |
| GET `/progress` | Server-derived progress (total XP, level, rank, XP into level, next transition, percentage, rule version), active task/habit completion counts and ended non-cancelled focus seconds |
| GET `/progress/ledger?page=&pageSize=` | Paged signed XP entries with source, original-entry reference, calendar bucket and rule version |
| GET `/activity?page=&pageSize=&kind=` | Paged owner history, newest first; optional exact event-kind filter |
| GET/POST `/rewards`, GET/PATCH/DELETE `/rewards/{id}` | Title and requiredLevel (1–100000); list supports page/pageSize and archived. Responses include claim date and current eligibility. DELETE archives |
| POST `/rewards/{id}/claim` | One eligible claim per reward; retained through later XP corrections |
| GET `/focus-sessions`, GET `/focus-sessions/active` | Paged history and `{ session: ... or null }`; session DTO includes serverNow, elapsedSeconds and persisted running/accumulated timestamps |
| POST `/focus-sessions` | `{ taskId: UUID or null }`; at most one unfinished session per owner |
| POST `/focus-sessions/{id}/pause`, `/resume` | Server-timed transitions; no focus XP |
| POST `/focus-sessions/{id}/stop` | `{ outcome: "Stopped" | "Completed" | "Cancelled", completeTask: false }`; completeTask true requires a linked task and Completed outcome |

Task complete/reopen, habit log/revoke, reward claim and all focus commands require a non-empty UUID **ClientActionId HTTP header** (400 if absent/invalid). This is the documented client-action identity represented as a header, leaving existing Phase 2 resource bodies intact. Repeating the same operation/body/key returns the saved status and response, including its original progression feedback; using that key for another request returns 409. Different keys cannot create multiple active task completions, habit/date logs, claims or focus sessions. Habit duplicate dates and already claimed rewards return 409; repeated task completion with a new key is a successful no-op with 0 XP.

Successful command DTOs retain their resource fields and add `progression: { xpChange, progress, levelUp }`. The query layer refreshes all dependent productivity queries after success; transport/server failures retain the action identity for an explicit retry. CSRF-token refresh also preserves it. Navigation/reload reconstructs persisted task/focus/progression state from the server. No local timer or optimistic points become a persisted source of truth.

Goal progress accepts the same optional ClientActionId header for replay protection; the current client always supplies it. Older Phase 2 callers without that header retain append-entry behavior. Goal progress and transitions to Completed create meaningful activity but no XP. Task, habit and reward command identities remain mandatory as specified above.

## Autentisering og sikkerhet

Bruk ASP.NET Core Identity med IdentityUser<Guid> og SignInManager. Lag kun egne login, logout, me og CSRF endepunkter; ingen offentlig register rute. MapIdentityApi registrerer også /register og passer derfor ikke uten særskilt sperring. [Microsofts Identity API dokumentasjon](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-api-authorization?view=aspnetcore-10.0) viser endepunktene. Eieren opprettes én gang av en dokumentert lokal eller administrativ engangskommando med hemmelighet utenfor Git, ikke gjennom et internettvendt standardpassord. Identity håndterer passordhash, lockout og sesjoner; login får rate limit. Alle private endepunkter krever autentisering og slår opp eier fra innlogget identitet, aldri fra body. Ved hver referanse til en annen ressurs må begge tilhøre samme eier.

Autentiseringscookie er HttpOnly, Secure i produksjon og SameSite=Lax eller Strict når samme origin fungerer. Bruk CSRF beskyttelse på alle tilstandsendrende cookieautentiserte endepunkter, inkludert login og logout: GET /api/v1/auth/csrf gir et request token fra IAntiforgery; klienten sender token i X-CSRF-TOKEN header, og serveren validerer det. Oppbevar token bare i minnet, forny etter login og ved utløpt sesjon. Test ekte kryssoriginforsøk. Samme origin og SameSite erstatter ikke bevisst CSRF kontroll. [Microsofts CSRF veiledning](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0) beskriver cookie risikoen og tokentilnærmingen. Sett sikre headers, HTTPS, begrens CORS til nødvendig lokalt oppsett, og logg ikke passord, tokens, helsedata eller transaksjonsbeskrivelser.

I container må ASP.NET Data Protection nøkler overleve restart, ellers kan alle cookies bli ugyldige. Bruk persistent beskyttet volum for én replika eller egnet ekstern nøkkellagring ved flere; ikke legg nøklene i image eller Git. [Microsofts dokumentasjon](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/configuration/overview?view=aspnetcore-10.0) beskriver dette.

### Authentication policy — Prompt A, 13 September 2026

This is an intentional authentication-policy update after Phase 3, not a new product phase. Identity, its password hasher/stores, cookie scheme and CSRF remain the architecture.

- Password selection (provisioning, UserManager change/reset, local recovery): 15–128 Unicode scalar values, spaces/Unicode allowed, no required character classes. Exact input is hashed, with no hidden trimming/truncation or normalization. Ordinary login does not apply new-password rules to existing accounts. A bundled SecLists 10k common-password list is checked locally, case-insensitively; its pinned source, MIT license, checksum and limited coverage are recorded beside the resource. It is not a complete breached-password corpus. No external password checks or forced periodic changes.
- Login request adds `rememberMe: false`. Session cookie: 12-hour absolute server expiry. Opted-in persistent cookie: 30-day absolute expiry. Central `AuthSessionOptions` allows shorter configured limits. Sliding expiration is off; Identity stamp refresh must retain the original absolute expiry. HttpOnly, SameSite=Strict, production Secure/`__Host-` cookies and all CSRF checks remain intact.
- Preserve Identity's `OnValidatePrincipal`; configure redirect handlers individually. Security stamp checks run at a configured interval no longer than 60 seconds. `POST /api/v1/auth/logout-everywhere` requires authentication and CSRF, updates the authenticated owner's stamp and signs out this client. Other old cookies fail on their next request after the interval. Ordinary logout only deletes the current client's cookie. Account lockout remains five attempts/five minutes, but the public response is the same 401 as unknown/wrong credentials; the independent IP limiter returns 429.
- Data Protection has a stable, environment-specific application name and an environment-specific directory beneath a protected absolute root outside Git/images. Windows uses DPAPI for the process account; Linux creates owner-only directories. Containers must reuse the documented named key volume across recreations. Development and Production do not share keys. Moving from the earlier default key identity requires one sign-in, not any data migration.
- Local `--reset-owner-password` is Development-only, interactive/masked and non-HTTP. It identifies an existing account by unique email and uses Identity reset tokens in a transaction with lockout clearance. Reset changes the stamp, preserves the user ID/history and does not remove passkeys. README defines the operator command and separate, deferred production recovery plan.
- Client `/auth/me` failures redirect only on 401. Network/5xx, 403 and 429 have recoverable/appropriate error states. No credentials or session identifiers go into web storage; existing ClientActionId retry/fingerprint logic is unchanged.

See [Microsoft's stamp interval API](https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.identity.securitystampvalidatoroptions.validationinterval?view=aspnetcore-10.0) and [Data Protection configuration](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/configuration/overview?view=aspnetcore-10.0). The numerical session and password-policy limits above are project decisions.

## Docker, migrasjoner og drift

Lokalt kjører Compose bare PostgreSQL med vedvarende volum og healthcheck; API startes i Rider, Vite separat. Valgfri full Compose profil kan legges til når den har praktisk verdi. Produksjon bruker multi stage Dockerfile: Node bygger client, .NET SDK bygger API, ASP.NET runtime image inneholder server og wwwroot. Ingen Node runtime behøves i ferdig image. Database er en egen vedvarende tjeneste og eksponeres ikke offentlig uten særskilt grunn.

EF migrasjoner opprettes og granskes med endringen. Kjør produksjonsmigrasjoner kontrollert én gang med migrasjonsbundle eller gjennomgått SQL før ny applikasjonsversjon, ikke med Migrate() ved hver oppstart. [EFs driftsveiledning](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/applying) støtter eksplisitt migrasjon og separat tilgang. Unngå destruktiv migrasjon uten backup og restore plan.

Første aktuelle driftskandidat er Railway med én app container og PostgreSQL, siden prosjektet prioriterer enkel oppstart. Dette er en beslutning ved fase 8, ikke et bibliotek eller arkitekturkrav. [Railway beskriver PostgreSQL](https://docs.railway.com/databases/postgresql), [pris og ressursbruk](https://docs.railway.com/pricing/plans), [regioner](https://docs.railway.com/deployments/regions) og [volumkopier](https://docs.railway.com/volumes/backups). Verifiser EU region, datalagring, løpende pris og konkret backupoppsett når hosting velges. Volumkopier alene er utilstrekkelige for varig personlig historikk; lag kryptert, gjenopprettbar kopi utenfor leverandøren.

## Framtidige koblinger

V3 kan legge til Integrations feature med separat adapter per leverandør, brukerforbindelse, tokenlagring, kildeidentitet, importjobb og konfliktstatus. Domenet mottar validerte normaliserte data gjennom en vanlig service; frontend kjenner ikke leverandørens tokens. Automatisering som må være pålitelig lagres som jobbtilstand og kan kjøres med BackgroundService når behovet oppstår. Ingen tabeller, OAuth klienter, køer eller generelle plugin grensesnitt for dette i V1.
