# ARCHITECTURE.md

## Recoverable deletion and custom Life Areas — 22 September 2026

Task, Habit, Goal and LifeArea use an owner-scoped `DeletedAtUtc` lifecycle. EF query filters exclude deleted records from normal reads; the dedicated Recently Deleted service uses `IgnoreQueryFilters` only after resolving the authenticated owner. Restore clears the timestamp on the original row and rejects records at or beyond the exact 30-day boundary. Permanent deletion is explicit and removes dependent operational rows while retaining append-only XP and Activity history. A hosted cleanup service runs at startup and hourly in bounded batches. Deleting a focused entity stops the active session with accumulated server time and retains its reference until permanent deletion.

Life Area deletion retains child foreign keys during recovery, so Tasks, Habits and Goals render as Unassigned while the area is hidden and reconnect when it is restored. Permanent area deletion nulls those links. Custom Life Areas use a server-generated stable key and the same queries, filters and routes as seeded areas. Optional private JPEG/PNG/WebP bytes (maximum 5 MiB), MIME type, version timestamp and focal coordinates are stored on LifeArea; authenticated image URLs take precedence over built-in artwork, then the generic fallback. Finance subscriptions also have canonical `/subscriptions` navigation because they are not owned by the Finance Life Area.

The owner-scoped API is `GET /api/v1/recently-deleted`, `POST /api/v1/recently-deleted/{type}/{id}/restore`, and `DELETE /api/v1/recently-deleted/{type}/{id}`. Life Areas add create, delete-impact, delete, image upload/read/remove and focal-position editing. Soft deletion remains distinct from indefinite archive state.

Cleanup locks the same UserSettings row as interactive mutations, then rechecks the deletion deadline before removing dependencies. Each candidate has its own transaction, avoiding cross-owner lock ordering. Private images use `Cache-Control: private, no-store`; upload checks validate MIME, raster signature and container structure without decoding/re-encoding pixels. Failed post-create image uploads reuse the created Life Area ID on retry.

## Daily planning and progression — 21 September 2026

Today derives `tasks` strictly from owned, unarchived Tasks with `PlannedDate == localDate`, including completed tasks. Earlier unfinished plans/deadlines are returned separately as `attentionTasks`; off-date or archived historical commitments/priority references are returned as `planHistory`. Modes change settings and guidance only. Daily priority selection reuses DailyMission and requires an already-planned task; it never schedules or copies a task.

`PUT/DELETE /api/v1/today/{date}/goals/{goalId}` persists an owned daily selection. Today's Goals are the deduplicated union of these references and Goals linked to Tasks planned that day. Today includes each Goal's latest progress and each scheduled Habit's Life Area, configured XP and actual completion award. Historical views use current entity state, not reconstructed snapshots.

Focus accepts at most one existing `taskId`, `habitId` or `goalId`, or none for unstructured work. All references are owner-validated and preserved on sessions. Existing server timing and atomic task-completion commands remain. Habit logging is a separate action; goal progress and focus duration do not award XP.

`ProgressionRules` remains authoritative for XP and numerical Level. `RankRules` consumes Level and exposes the ten-rank catalog, divisions, image URLs, color-token names and next-division XP progress through `/progress` and `GET /progress/ranks`. JavaScript formats these DTOs without recalculating ranks or levels. `/progress/ranks` is the full rank-system route. See [DAILY_PLANNING_PROGRESSION.md](DAILY_PLANNING_PROGRESSION.md) for exact thresholds and migration behavior.

This supersedes earlier six-rank and independent-rank proposals for this delivery. No frontend framework, authentication, state-management or database technology changes were made.

## Life Area detail completion — 21 September 2026

`/areas/:areaKey` resolves a stable key through the authenticated user's existing area query, then supplies the owned area and original shell context to nested Overview/Tasks/Goals/Habits screens. Existing paginated endpoints filter by the resolved UUID, never the display name. Unknown areas do not mount child queries. Route scope overrides conflicting query filters and survives filter reset; switching areas remounts scoped state. Global list/filter URLs remain supported. Scoped Habits uses the existing ID-filtered library and week endpoint while Today now also carries habit area IDs. Capture and full task creation receive area defaults without replacing server ownership checks.

Finance adds its existing `/areas/finance/subscriptions` page to this navigation and an overview entry; other area keys cannot display the Finance workspace. Search area results use stable overview paths and area context resolves to an owned UUID on nested routes. Localized page/actions rank exact, prefix and substring matches with stable ties, including Finance Subscriptions. No endpoint response shape, domain schema or authentication architecture changes are introduced by these navigation corrections.

## Selected additions — 20–21 September 2026

The explicit feature brief extends existing Identity rather than replacing it. Public registration, verification/recovery and current-password change supersede the earlier owner-only endpoint restriction below. AccountRegistration shares transactional WorkspaceInitialization with provisioning and Google account creation. IAccountEmailSender has Disabled/Development/Resend behavior; only configured account messages leave the server. Google uses Microsoft's supported handler and Identity external login records; verified provider email is required and existing email matches are never automatically linked. Apple remains a disabled configuration boundary. Exact routes, trust boundaries and secret names are in [ACCOUNT_SETUP.md](ACCOUNT_SETUP.md).

GET/PATCH settings adds planningMode. Today presents the same authoritative records in Simple, ThreeThreeThree, FocusedDay or Custom; no template tables are necessary. GET `/api/v1/search?q=&areaId=` is authenticated, bounded to 100 query characters and 20 returned metadata results, and scoped by the principal before projection. Exact/prefix/word/substring ranking occurs before the bounded candidate window; limited typo similarity then considers recent/contextual candidates. Area is a relevance boost, never an ownership substitute. Navigation/action matches remain immediate in the existing command dialog; server reads are debounced/cancelled and cached by owner/query. No complete private search corpus is stored on a device.

The Finance feature uses the existing authenticated productivity group and write filter for CSRF and transaction handling: GET/POST `/api/v1/finance/subscriptions`, GET/PUT `/{id}`, PUT `/{id}/status`. Lists are paged; cost/category/upcoming summaries use all active owned records, independent of the current list page/status. DTOs omit UserId; submitted IDs never determine ownership. The route `/areas/finance/subscriptions` is reached through the Finance card. No repository wrapper, microservice, bank adapter or external financial API is added.

### Future bank transaction boundary — planned only

A future consented Open Banking/PSD2 adapter would import transactions into separately owned Finance transaction records, with provider account/transaction IDs, amount, currency, booking date and merchant provenance. A unique owner/provider/external-ID key makes import retries idempotent. Provider credentials belong in encrypted server storage, never subscription rows or the browser. A revoked connection stops imports without deleting manual records.

Matching would propose Subscription links using normalized merchant identity, exact currency, amount tolerance and recurring cadence. Confidence and reasons must be visible; the user confirms ambiguous matches. A separate owned transaction/subscription association can preserve manual corrections and matching-rule versions. Imports must not rewrite subscription price/interval/cancellation or infer paid charges merely from an expected date. No matching model, import job, provider account, fake connection or bank credentials are implemented here.

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

I utvikling starter rotkommandoen `npm run dev` PostgreSQL ved behov og kjører ASP.NET Core med `dotnet watch` og Vite under samme terminalstyrte prosess. Delkommandoene `dev:db`, `dev:api` og `dev:client` kan brukes isolert. Nettleseren åpner Vite på localhost. Relative kall til /api/v1 og /health går via Vites proxy til ASP.NET Core. Vite dokumenterer denne [proxyfunksjonen](https://vite.dev/config/server-options#server-proxy). I produksjon bygger Vite statiske filer som ASP.NET Core serverer fra wwwroot på samme origin; /api/v1 og /health håndteres før SPA fallback. En ukjent API rute må returnere 404 JSON, aldri index.html. Et gyldig refresh av /today må returnere appen.

Sekvensen er: React visning → feature hook → felles fetch klient → API endpoint → eierkontroll og validering → domeneregel → DbContext transaksjon → PostgreSQL → DTO → Query invalidation → visning. Kun serveren beregner XP, level, rank og Life Score. Klienten kan vise estimert XP før lagring, men serverresponsen er fasit. Ikke send EF entities direkte i JSON. Bruk ISO 8601 UTC tidsstempel for hendelser, YYYY-MM-DD for kalenderdato og eksplisitt valutakode eller måleenhet når dette kreves.

API prefiks er /api/v1. V1 og V2 bruker samme API major når kontrakten bare utvides. Ressurser bruker GET liste, GET per id, POST, PATCH og DELETE når handlingen passer. Handlinger som fullføring bruker POST /{id}/complete og POST /{id}/reopen; GET endrer aldri tilstand. Lister bruker pageSize, cursor eller page og filtrering; begrens standard og maksimal pageSize. Feil bruker Problem Details med stabile maskinlesbare feilkoder, gyldige HTTP statuser og feltfeil for validering. 401 er uinnlogget, 403 avvist handling, 404 også for fremmede eller manglende eierressurser, 409 ved konflikt, 400 for ugyldig input. Klientens Query keys inkluderer bruker og filter, og tømmes helt ved utlogging.

### Phase 3 API additions

All routes below use the existing authenticated `/api/v1` group, CSRF filter and owner transaction lock. Level/cap calculations live in ProgressionRules and rank/division calculations in RankRules; Focus reuses TaskEndpoints.Complete for task completion within the same transaction.

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

Lokalt kjører Compose bare PostgreSQL med vedvarende volum og healthcheck. Den normale rotkommandoen starter database, API-watch og Vite samlet; Rider eller delkommandoene kan fortsatt kjøre API og klient isolert. Vanlig applikasjonsoppstart kjører aldri migrasjoner. Valgfri full Compose profil kan legges til når den har praktisk verdi. Produksjon bruker multi stage Dockerfile: Node bygger client, .NET SDK bygger API, ASP.NET runtime image inneholder server og wwwroot. Ingen Node runtime behøves i ferdig image. Database er en egen vedvarende tjeneste og eksponeres ikke offentlig uten særskilt grunn.

EF migrasjoner opprettes og granskes med endringen. Kjør produksjonsmigrasjoner kontrollert én gang med migrasjonsbundle eller gjennomgått SQL før ny applikasjonsversjon, ikke med Migrate() ved hver oppstart. [EFs driftsveiledning](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/applying) støtter eksplisitt migrasjon og separat tilgang. Unngå destruktiv migrasjon uten backup og restore plan.

Første aktuelle driftskandidat er Railway med én app container og PostgreSQL, siden prosjektet prioriterer enkel oppstart. Dette er en beslutning ved fase 8, ikke et bibliotek eller arkitekturkrav. [Railway beskriver PostgreSQL](https://docs.railway.com/databases/postgresql), [pris og ressursbruk](https://docs.railway.com/pricing/plans), [regioner](https://docs.railway.com/deployments/regions) og [volumkopier](https://docs.railway.com/volumes/backups). Verifiser EU region, datalagring, løpende pris og konkret backupoppsett når hosting velges. Volumkopier alene er utilstrekkelige for varig personlig historikk; lag kryptert, gjenopprettbar kopi utenfor leverandøren.

## Framtidige koblinger

V3 kan legge til Integrations feature med separat adapter per leverandør, brukerforbindelse, tokenlagring, kildeidentitet, importjobb og konfliktstatus. Domenet mottar validerte normaliserte data gjennom en vanlig service; frontend kjenner ikke leverandørens tokens. Automatisering som må være pålitelig lagres som jobbtilstand og kan kjøres med BackgroundService når behovet oppstår. Ingen tabeller, OAuth klienter, køer eller generelle plugin grensesnitt for dette i V1.


## Interface preferences and bounded presentation reads — September 2026

Session changes between tabs are signalled through a data-free BroadcastChannel message; returning to a protected tab also rechecks `/auth/me`. During revalidation, private content is hidden/inert while its layout and drafts remain mounted. A native verification dialog keeps retry accessible above an already-open form. An owner change or confirmed 401 removes private query/mutation caches and remounts owner-specific UI. The shared API client gates private requests during the check and rejects stale-session responses/retries. Same-owner checks preserve drafts and scrolling. No identity or private data is written to browser storage, and cookies/CSRF/server authorization remain authoritative.

The redesign preserves the modular monolith and Phase 1–3 commands. GET/PATCH `/api/v1/settings` adds independent `uiLanguage` (en/nb/sv/da), `theme` (light/dark/system) and `density` (normal/compact). PATCH changes only supplied fields; existing Locale and TimeZoneId keep their meaning. An additive migration derives the initial language from existing Locale. Authenticated settings remain authoritative; only these three non-sensitive display choices have guarded local memory and synchronous prepaint application. No credentials or private domain data enter web storage.

GET `/api/v1/areas/counts` projects all owned areas and actual open-task, active-goal and active-habit totals without client page-size truncation. GET `/api/v1/habits/week?date=&areaId=&page=` returns 12 habits per page with seven real schedule/log states. Relevant schedule intervals and grouped corrections are read only for the selected week/page. Neither read endpoint changes XP, schedules or historical records. Both inherit authentication and owner filtering.

Feature routes are lazy-loaded. Task list query parameters retain filters/page; desktop navigation can render the existing detail form in a non-modal side panel over its background location. Direct URLs, refresh and smaller viewports use the full route. Shared TanStack Query data and existing ClientActionId command identities remain the persistence boundary.

## Life Area layout ordering ? September 2026

PUT `/api/v1/areas/order` accepts `{ areaIds: [...] }`, requiring exactly the complete set of areas owned by the authenticated user, including inactive areas. Authentication and antiforgery apply; duplicate, omitted, unknown and foreign IDs return validation errors without writes. One EF SaveChanges transaction updates every SortOrder (including unchanged positions) and returns ordered area DTOs. Only order changes; names, activation and other users are untouched. Complete concurrent saves replace the order, rather than merge individual moves. No migration or new storage is needed. PATCH area retains optional sortOrder compatibility; omitting it preserves order.

The Life Areas route uses pinned `@dnd-kit/react` 0.5.0 for handles and a compact drag overlay. Local drafts are separate from TanStack Query data until Save; Cancel or canceled dragging does not write. Save success updates the owner-scoped areas cache and invalidates productivity reads; failure retains the draft for retry. Shared areaPresentation metadata defines artwork and wide-card presentation, while pure areaLayout functions maintain regular-card order and complete-row wide slots. No IDs, user records, or persisted order are hardcoded in the frontend.
