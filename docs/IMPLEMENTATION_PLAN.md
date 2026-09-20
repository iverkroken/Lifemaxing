# IMPLEMENTATION_PLAN.md

## Approved local completion — 21 September 2026

The [approved follow-up](superpowers/plans/2026-09-21-local-completion.md) explicitly authorizes the reviewed additive migration on the normal local Development database, real Planning Mode verification, all-area detail routes/ID filtering, Finance discoverability and search ranking corrections. This is the specific permission required by the general migration rule below. The initial selected-feature pass described next used disposable databases only; this follow-up preserves existing local data with a private backup and before/after checks. Live Google/Resend/Apple configuration, commits and pushes remain outside scope.

## Selected additions — 20–21 September 2026

The current explicitly requested addition follows the [selected-features plan](superpowers/plans/2026-09-20-selected-features.md) and [design](superpowers/specs/2026-09-20-selected-features-design.md). Deliverable increments are Identity account lifecycle, Today modes/search and manual Finance subscriptions, followed by integrated migration/browser verification. Public registration and manual subscriptions are explicit exceptions to older phase restrictions below. No automatic progression into original Phase 4 or the remaining area modules is implied. Apply the additive migration only through a reviewed deployment/local migration step; this implementation tests disposable databases and does not migrate the owner's private database.

Dette er den operative byggeordren for Astra i Rider. Ikke bygg hele prosjektet i ett steg. For hver fase implementeres én gjennomgående flyt, kjøres mot PostgreSQL og avsluttes med testen og Definition of Done nedenfor. Alle private ruter under /api/v1 krever autentisering hvis ikke annet er uttrykkelig nevnt. CRUD i tabellene betyr liste, hent én, opprett, endre og arkiver eller slett etter reglene i DATABASE.md; konkrete unntak er angitt. HTTP API major 1 dekker både produkt V1 og V2.

## Navngitt forbedringsserie etter Phase 3

[EXPERIENCE_EVOLUTION_PLAN.md](EXPERIENCE_EVOLUTION_PLAN.md) er arbeidsoversikten for P0–P11. Serien endrer ikke faseordenen eller produktgrensen: Phase 3 avslutter V1-kjernen; Phase 4 starter V2-analyse. P0 er bare dokumentasjon og analyse. Arbeid på én eksplisitt bestilt P-oppgave om gangen, med status, avhengigheter og porter i tabellen; ikke fortsett automatisk.

P1 leverer faktiske visuelle alternativer og en gjennomførbar ressursprøve, med eiergodkjenning før P2. P6 avklarer og prøver Inbox/Backlog, arbeidsdag/periode, separat frist og historiske DailyCommitments før eventuell additiv migrasjon. P7s interne kalender og P8s begrensede AI-registrering er uttrykkelige scopeunntak, ikke en start på V3/V4. P9 simulerer en selvstendig rank uten Life Score og får eksakte tall godkjent før P10 implementerer dem. P11 samler regresjonene; hver tidligere oppgave leverer egne relevante tester, fire språk, begge temaer og tilgjengelige tilstander.

De eksisterende Phase 2/3-beskrivelsene nedenfor beskriver leverte opprinnelige regler. Inbox- og levelrank-semantikk endres først når P6 respektive P10 er implementert og verifisert, med eksplisitte produktregler i PROJECT_SPEC og overgangskontrakter i arbeidsoversikten. Bevar XP, level, rewards, historikk, ClientActionId, Focus og autentisering. Ingen passkeys, authombygging, ekstern synk, original Phase 4 eller spesialiserte V2-moduler er forutsetninger for serien.

P0 oppretter ingen migrasjon. Senere nødvendige skjemaendringer skal være additive, testes mot isolert PostgreSQL med fiktiv historikk og leveres med gjennomgått oppgraderingsfremgangsmåte. Ingen ny migrasjon på eierens private database uten særskilt tillatelse. Eksterne AI-kall krever runtime-samtykke og håndhevet kostnadsramme selv om funksjonen er godkjent; se ADR 14.

## Phase 0: Foundation

Mål: et fungerende vertikalt skall i en ren eller allerede eksisterende repo. Les AGENTS.md og prosjektet før valg av filer. Bruk en LIFEMAXING.sln som Rider kan åpne.

Implementer: React, Vite, deklarativ React Router, QueryClient, felles fetch klient, CSS variabler og Button/Input/Card/PageHeader i første versjon. ASP.NET Core 10 API med Problem Details, enkel health endpoint, Postgres i Compose, utviklingsproxy /api/v1, statisk produksjonsservering og en grunnleggende Dockerfile. Dokumenter hvordan klient, API og DB startes hver for seg. Frys kompatible hovedversjoner og låsefiler.

Entities: ingen domenetabeller; databasen er tilgjengelig.

API: GET /health/live uten personlig data, GET /api/v1/system/status som bekrefter API og eventuelt DB status uten hemmeligheter.

Views: startskjerm og felles shell med design tokens; ingen falske KPI.

Test: ren bygg av klient og server, Compose health, nettleseren henter status gjennom Vite proxy, refresh av klientrute faller tilbake til appen i produksjonsbygg.

Definition of Done: en annen utvikler kan starte alle tre deler fra README og se ekte API respons i nettleseren.

## Phase 1: Auth og database

Mål: én privat eier som kan logge inn og hente bare egne Life Areas.

Implementer: AppDbContext, første EF migrasjon, Identity med Guid nøkler, UserSettings med lagret IANA tidssone og seed av ti Life Areas for opprettet eier. Én dokumentert engangsprosedyre for eieropprettelse med passord i secret store eller terminalprompt, ikke hardkodet seed. Cookie policy, CSRF token og validering på alle skrivende ruter, login rate limit, 401 JSON istedenfor omdirigering til HTML, beskyttede React ruter med /me som sannhet. Begynn enkel transaksjonell migrasjonsrutine lokalt. Ikke slå på offentlig registrering.

Entities: AppUser, UserSettings, LifeArea og Identity tabeller.

API: GET /api/v1/auth/csrf offentlig; POST /api/v1/auth/login og POST /api/v1/auth/logout med CSRF; GET /api/v1/auth/me; GET /api/v1/settings; PATCH /api/v1/settings; GET /api/v1/areas; PATCH /api/v1/areas/{id} for visningsnavn, sortering og aktiv status.

Views: Login, protected app shell, enkel Areas oversikt, 401 og session expired tilstand.

Test: feil og rett passord, lockout, CSRF mangler og feil, direkte kall til privat rute uten login, refresh etter login, logout, owner A kan ikke lese owner B, ingen /register rute.

Definition of Done: anonym bruker kan ikke se privat data, riktig eier kan logge inn og lese lagrede områder etter ny nettlesersesjon.

## Phase 2: Core productivity

Mål: planlegg og utfør oppgaver og vaner, følg mål, og se hva som teller i dag.

Implementer: Task CRUD med Inbox, planlagt dato og forfall; DailyCommitment når en Task får PlannedDate eller legges til Today; Today aggregerer forpliktelser, forfall, vaner og mission; DailyMission kan velges manuelt; Habit og versjonert HabitSchedulePeriod med Daily, SelectedWeekdays eller WeeklyCount; HabitLog; Goal og GoalProgressEntry. Servervalidering av dato, eier, måltype og vanefrekvens. Opprett enkle Activity hooks som Phase 3 ferdigstiller før V1 slippes. Slettehandlinger på historiske rader er arkivering.

Entities: Task, DailyCommitment, DailyMission, Habit, HabitSchedulePeriod, HabitLog, Goal, GoalProgressEntry.

Avklaring under implementering: Phase 2 inkluderer også den minimale TaskCompletion-historikken (uten AwardedXp), slik at complete/reopen kan bruke den dokumenterte sannhetskilden. Phase 3 utvider den med XP, Activity og CommandReceipt. Konkrete dato-, historikk- og API-regler er dokumentert i PHASE2_API.md.

API:
1. GET /api/v1/today?date=YYYY-MM-DD, GET /api/v1/tasks med filter, POST /api/v1/tasks, GET /api/v1/tasks/{id}, PATCH /api/v1/tasks/{id}, DELETE /api/v1/tasks/{id}, POST /api/v1/tasks/{id}/complete, POST /api/v1/tasks/{id}/reopen.
2. POST /api/v1/daily-commitments og DELETE /api/v1/daily-commitments/{id}; PUT /api/v1/daily-mission/{date}, DELETE /api/v1/daily-mission/{date}.
3. CRUD /api/v1/habits, PUT /api/v1/habits/{id}/schedule, GET /api/v1/habits/{id}/logs, POST /api/v1/habits/{id}/logs, POST /api/v1/habits/{id}/logs/{logId}/revoke.
4. CRUD /api/v1/goals, GET /api/v1/goals/{id}/progress og POST /api/v1/goals/{id}/progress.

Views: Today, Inbox, Tasks liste og detalj, Habits oversikt og logg, Goals oversikt og detalj, Quick Add, Mission velger. Responsiv grunnflyt i alle views.

Test: Task overlever refresh; Today viser riktige forfalte og planlagte data; mission kun én per dag; uten planlagt dato havner Task i Inbox; ukevaner og DST dato gir riktig forventning; dobbel vanelogg avvises; måloppdateringer bevares historisk; relasjoner kan ikke krysse eiere.

Definition of Done: bruker kan fra UI opprette og endre alle fire kjernebegreper og gjenfinne riktig status og logg etter omstart. XP kommer i neste fase, så Phase 2 er ikke V1 ferdig.

## Phase 3: Progression

Mål: fullføringssyklusen er sporbar og robust, og Focus Mode støtter faktisk utførelse. Dette er V1 funksjonsport.

Implementer: TaskCompletion og HabitLog kobles transaksjonelt til XpEntry, ActivityEvent og CommandReceipt. Klient sender ClientActionId per menneskehandling og bruker samme ID ved nettverksretry. Håndhev unik aktiv fullføring i database, daglige XP tak, gjenåpning som negativ korreksjon, null XP ved nytt forsøk uten ny syklus og deduplisert aktivitet. Innfør sentral level og rank kalkulator. FocusSession med pause, fortsett og stopp; timer vises basert på serverlagret start og akkumulert tid. Reward med levelkrav og unik RewardClaim. Progress viser enkle beskrivende tall uten Life Score. Spesialiserte V2 moduler gir ikke egne XP poster automatisk; en tilhørende Task eller Habit gir XP når den fullføres, slik at én handling ikke belønnes dobbelt.

Entities: TaskCompletion, XpEntry, ActivityEvent, FocusSession, Reward, RewardClaim, CommandReceipt.

API: POST /api/v1/tasks/{id}/complete og /reopen samt vanelogg fra Phase 2 får obligatorisk ClientActionId; POST /api/v1/focus-sessions, POST /api/v1/focus-sessions/{id}/pause, /resume og /stop; GET /api/v1/focus-sessions; CRUD /api/v1/rewards, POST /api/v1/rewards/{id}/claim; GET /api/v1/activity, GET /api/v1/progress.

Views: Focus Mode, Progress med level, rank, terskel og nylige hendelser, Activity, Rewards. Today viser reell XP tilbakemelding.

Test: to samtidige fullføringer gir én aktiv syklus og ett XP resultat; samme ClientActionId etter tapt respons gjør ingenting på nytt; reopen gir eksakt negativ post og bevarer Activity; ny fullføring gir ny syklus; små oppgaver og vaner møter dagsgrense; levelterskler 499/500 og flere levels; én aktiv FocusSession per eier; pause teller ikke tid; RewardClaim én gang; owner isolasjon.

Definition of Done: hele V1 scenariet i PROJECT_SPEC.md fungerer ende til ende i nettleser, inkludert gjenåpning og reboot, med ekte PostgreSQL og korrekt saldo. V1 er klar for privat bruk. Offentlig deploy krever Phase 8 krav.

## Phase 4: Metrics og Life Score

Mål: V2 analyse forteller hva som er målt og hva som ikke er det.

Implementer: MetricDefinition og MetricEntry for manuelle historiske serier; versjonert LifeArea score deltagelse; LifeScoreSnapshot og AreaScoreSnapshot. Implementer formel v1 i DATABASE.md på server, 28 fullstendige lokale dager, daglig committed Task ratio, Habit ratio per gyldig plan og «Ikke nok data» etter eksplisitte terskler. Invalider berørte snapshots ved historiske korreksjoner. Overview samler ekte nåtilstand, historikk, datadekning og forklarte diagrammer. Ikke kopier BodyMeasurement eller FinanceTransaction til MetricEntry.

Entities: MetricDefinition, MetricEntry, LifeAreaStatusPeriod, LifeScoreSnapshot, AreaScoreSnapshot.

API: CRUD /api/v1/metrics/definitions; GET /api/v1/metrics/{definitionId}/entries, POST /api/v1/metrics/{definitionId}/entries, PATCH /api/v1/metrics/entries/{id}, DELETE /api/v1/metrics/entries/{id}; GET /api/v1/scores?asOf=YYYY-MM-DD, GET /api/v1/scores/areas/{id}?asOf=YYYY-MM-DD; GET /api/v1/overview?period=28d.

Views: Overview, Area Scores og detalj, Metric detalj med historikk og forklaring av scoregrunnlag. Today viser score bare som diskret lenke og korrekt dato dersom nok data.

Test: manglende datatype vektlegges ikke som null; område uten tilstrekkelige dager viser ikke tall; samme commit kan ikke telle to ganger; etter kl. 12 planlegging og retroaktiv flytting manipulerer ikke gamle scorevinduer; WeeklyCount tak per ukeutsnitt; korrigert logg oppdaterer relevante snapshots; global score viser inkluderte områder og algoritmeversjon.

Definition of Done: tall kan forklares ved konkrete rader i DB, perioden er synlig, og tomt grunnlag forveksles aldri med score 0.

## Phase 5: Fitness, University, Career og Finance

Mål: fire områder har spesifikke data og daglige nyttige arbeidsflyter. Lag én modul ferdig før neste.

| Modul | Entities | API kontrakt | Views | Særlig test |
| --- | --- | --- | --- | --- |
| Fitness | WorkoutSession, Exercise, WorkoutExercise, ExerciseSet, BodyMeasurement | CRUD /api/v1/fitness/workouts; CRUD /api/v1/fitness/exercises; POST/PATCH /api/v1/fitness/workouts/{id}/exercises med sett; CRUD /api/v1/fitness/measurements | Øktliste, registrering av øvelse og sett, kroppsmål med enhet | settsekvens, decimal last, økt uten øvelser, historisk måleserie |
| University | Course, Assessment, StudySession, CourseTask | CRUD /api/v1/university/courses; CRUD /api/v1/university/courses/{id}/assessments; CRUD /api/v1/university/courses/{id}/study-sessions; PUT/DELETE /api/v1/university/courses/{id}/tasks/{taskId} | Aktive kurs, frister, studieøkter og koblede Tasks | frister, summering av timer, kryssbruker og kurskobling |
| Career | CareerProject, Skill, SkillLog | CRUD /api/v1/career/projects; CRUD /api/v1/career/skills; GET/POST /api/v1/career/skills/{id}/logs | Prosjektoversikt, ferdighetslogg og historikk | logg til egen Skill, prosjekthistorikk |
| Finance | FinanceAccount, FinanceCategory, FinanceTransaction, MonthlyBudget | CRUD /api/v1/finance/accounts; CRUD /api/v1/finance/categories; CRUD /api/v1/finance/transactions; POST /api/v1/finance/transfers; CRUD /api/v1/finance/budgets; GET /api/v1/finance/overview?month=YYYY-MM&currency=NOK | Manuell transaksjonsføring, konti, kategorier, budsjett og månedsgraf | decimal presisjon, balansert overføring, riktig valuta, budsjett per måned |

Felles implementering: spesialiserte registreringer skriver passende ActivityEvent, men gir ikke automatisk ekstra XP. En bruker kan separat fullføre en planlagt Task eller Habit som representerer samme arbeid. UI skal forklare hvor XP kom fra. Ikke opprett ufullstendige generiske koblinger mellom alle domener.

Definition of Done for hver modul: opprett, rediger, les historikk, håndter feil og tomme data fra UI og Postgres; ingen fremmed eierressurs kan knyttes til posten. Phase 5 er ferdig når alle fire består disse testene og V1 regresjonstesten.

## Phase 6: Plants, Style, Food, Creative og Travel

Mål: resten av Life Areas får samme reelle nytte, uten å opprette tomme funksjonsskall.

| Modul | Entities | API kontrakt | Views | Særlig test |
| --- | --- | --- | --- | --- |
| Plants | Plant, PlantCareLog | CRUD /api/v1/plants; GET/POST /api/v1/plants/{id}/care; PATCH /api/v1/plants/care/{logId} | Plantekort, siste stell avledet fra logg, ny registrering | rekkefølge og historikk etter redigering |
| Style | WardrobeItem, WishlistItem | CRUD /api/v1/style/wardrobe; CRUD /api/v1/style/wishlist | Garderobe med filter og nyttig ønskeliste | eier, pris og gyldig lenke |
| Food | Recipe, RecipeIngredient, MealLog | CRUD /api/v1/food/recipes med ingredienser; CRUD /api/v1/food/meals | Oppskriftsdetaljer, redigering og måltidshistorikk | ingrediensrekkefølge og historiske måltider |
| Creative | CreativeProject, CreativeSession | CRUD /api/v1/creative/projects; CRUD /api/v1/creative/projects/{id}/sessions | Prosjekter, faktisk tid og fullførte arbeider | historisk tid og eier |
| Travel | Trip, TripChecklistItem | CRUD /api/v1/travel/trips; CRUD /api/v1/travel/trips/{id}/checklist | Turplan, redigerbar sjekkliste og reisehistorikk | unik eier, status og datoorden |
| Personal | ingen egne | bruk /tasks, /habits, /goals, /metrics, /activity med AreaId | Personalside med filtrert fellesdata og opprett handling | filtrering følger eier og området |

For API underordnet CRUD skal samme metodekonvensjon som Phase 2 gjelde. Historiske registreringer gir ActivityEvent; unngå automatisk ny XP kilde. Ikke gjør bilder, kart eller eksterne bestillinger til skjult krav.

Definition of Done: ti områder er navigerbare; alle V2 områder kan opprette og lese minst sin første nyttige datastruktur gjennom UI, Personal virker gjennom fellesfunksjoner, og produktet har ingen fiktiv demodata.

## Phase 7: Polish og testing

Mål: én konsekvent og stabil app på mobil, nettbrett og desktop.

Implementer: felles tom, lasting og feiltilstander, formsvar ved utløpt sesjon, tastatur og skjermleser, dialogfokus, datavisning uten horisontal overflow, pagination av voksende lister og reelle nettfeil. Gjennomgå kontrast og reduced motion. Reduser kopiert kode der det allerede finnes minst to faktiske brukstilfeller. Slett ubrukt scaffolding når det er trygt.

Entities og API: ingen nye som standard; kontrakter rettes ved påviste feil.

Views: alle V1 og V2 skjermer i 375 px mobil, 768 px nettbrett og stor desktop, med meningsfull tom tilstand.

Test: kritisk innloggingsflyt, Task og Habit, Focus, scorekorrigering, Finance beløp og minst én CRUD flyt i hvert område; bygg, lint, server integrasjon, klient brukeratferd og tilgjengelighet.

Definition of Done: dokumenterte funn er rettet eller har eksplisitt begrunnet avvik; ingen åpne data eller tilgangsfeil, ingen uverifiserte sentrale flyter.

## Phase 8: Production readiness

Mål: en konkret, gjenopprettbar og sikkert tilgjengelig tjeneste. Utfør fasen før enhver offentlig eksponering også dersom V1 publiseres tidlig.

Implementer: produksjons Docker image med client under wwwroot, eksplisitte og vurderte EF migrasjoner, secret store, TLS, riktig host og forwarding headers, persistent Data Protection nøkler, intern PostgreSQL tilgang, databasebackup både hos vert og kryptert utenfor, prøvd restore, helsesjekk, logg uten private felt, kort driftsdokument og enkel CI som bygger og tester. Avtal i repo dokumentasjon rutine for oppgradering, rollback av image og datakompatibel migrasjon. Velg hosting etter faktisk kostnad og dataplasseringsbehov; Railway er første kandidat, ikke tvang.

Entities og API: ingen nye domenedata; /health/live og /api/v1/auth/me kontrolleres i produksjon.

Views: fungerende SPA ruter etter refresh, feilsider uten lekkasje, sikker cookie.

Test: bygg image fra ren checkout; deploy i testmiljø eller gjennomfør tilsvarende kontrollert oppsett; verifiser login og DB etter restart, logout, CSRF avvist, cookie overlever restart med bevart nøkkel, databasebackup kan gjenopprettes i separat testdatabase, og ikke en hemmelighet finnes i image eller Git.

Definition of Done: V2 er komplett når alle foregående faser er gjennomført, driftskontroller er bestått og reelle brukerdata kan gjenopprettes fra en kopi utenfor vertens egen infrastruktur. Selve publiseringen skjer bare når eieren har bedt om det.
