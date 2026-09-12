# DATABASE.md

Dette er en relasjonell blueprint, ikke en beskjed om å opprette alle tabeller i fase 0. Fasefordelingen følger IMPLEMENTATION_PLAN.md. En delt PostgreSQL database, ett AppDbContext og EF migrasjoner er nok gjennom V2. Bruk IdentityUser<Guid>, UUID primærnøkler for domenedata og UserId på alle private rotdata. Ingen bruker ID kommer fra klienten. LifeAreaId er eksplisitt på delte objekter; spesialiserte moduler har et entydig område og trenger ikke gjentatte AreaId kolonner.

## Felles regler for lagring

Datoer for planlegging og vaner er date i database og DateOnly i C#. Brukerens IANA tidssone, først Europe/Oslo, er lagret i UserSettings. Absolutte hendelser lagres som timestamptz og UTC. Fristen for en Task er en lokal dato uten tvungen klokkepresisjon i V1; senere kan DueAtUtc legges til særskilt. En reise endrer ikke historiske lokale datoer eller tidligere registrerte hendelser.

Money er decimal og numeric(18,2) med ISO valutakode på konti og transaksjoner. BodyMeasurements bruker decimal med enhet, ikke float. Sett grenser for lengder, ikke null felter, positive verdier der det er logisk, sjekk at slutt er etter start, og unike nøkler i database. Lag også FK og indekser på UserId og periode for enhver privat tabell som brukes i lister. Sletting av innhold med historiske hendelser er arkivering eller soft delete; fjernelse av data krever en egen senere eksport og slettestrategi. Ikke la cascade delete fjerne Activity, XP eller Metrics ved et uhell. En bruker kan bare henvise til sine egne relaterte rader, bekreftet i serverlogikken før lagring.

## Core, fase 1 og 2

| Entity | Viktige felt | Relasjoner og invariant |
| --- | --- | --- |
| AppUser | Identity felter, Guid Id | Eier alle private data; kun administrativ opprettelse i V1 |
| UserSettings | UserId, TimeZoneId, Locale, CreatedAtUtc | 1:1 med bruker; start Europe/Oslo, nb-NO |
| LifeArea | Id, UserId, Key, DisplayName, IsActive, SortOrder | Unik (UserId, Key); 10 seedede områder per bruker; nøkkel endres ikke |
| Task | Id, UserId, LifeAreaId?, GoalId?, Title, Details?, Tier, Priority, PlannedDate?, DueDate?, EstimateMinutes?, CreatedAtUtc, UpdatedAtUtc, DeletedAtUtc? | Goal og Area må tilhøre samme bruker; Task uten PlannedDate ligger i Inbox; fullført status avledes av aktiv TaskCompletion |
| DailyCommitment | Id, UserId, TaskId, LocalDate, TimeZoneId, CommittedAtUtc, RemovedAtUtc? | Unik (UserId, TaskId, LocalDate); oppstår når brukeren velger en Task for dato; etter dagens start fjernes ikke historisk forpliktelse ved flytting |
| DailyMission | Id, UserId, LocalDate, TaskId, SelectedAtUtc | Unik (UserId, LocalDate); valgt Task må være aktiv og eies av bruker; bytte gir Activity |
| Habit | Id, UserId, LifeAreaId?, Title, XpPerLog, IsActive, CreatedAtUtc, ArchivedAtUtc? | Egen livssyklus, ikke Task |
| HabitSchedulePeriod | Id, HabitId, EffectiveFromDate, EffectiveToDate?, TimeZoneId, Pattern, DaysOfWeek?, WeeklyTarget? | Periodehistorikk uten overlapp; Daily, SelectedWeekdays eller WeeklyCount 1–7; endringer gjelder fremover |
| HabitLog | Id, UserId, HabitId, LocalDate, TimeZoneId, LoggedAtUtc, ReversedAtUtc? | Delvis unik aktiv (HabitId, LocalDate); maks én fullføring per dag per vane, også ved ukentlig mål |
| Goal | Id, UserId, LifeAreaId?, Title, Description?, State, TargetValue?, BaselineValue?, Unit?, Direction?, TargetDate?, CreatedAtUtc, CompletedAtUtc? | Kan være kvalitativt uten TargetValue; ingen automatisk XP |
| GoalProgressEntry | Id, UserId, GoalId, RecordedAtUtc, Value?, Note? | Historiske målepunkter; Value og Goal target har samme enhet og retning |

DailyCommitment er en liten, bevisst historisk plan, nødvendig for å kunne regne en ærlig Task komponent i V2. Å sette eller endre Task.PlannedDate oppretter en forpliktelse for valgt dag; Today kan også legge en Task til valgt dag uten å endre opprinnelig frist. Today viser foruten forpliktelser også oppgaver som forfaller og Inbox snarveien. Å velge en oppgave som Daily Mission lager en DailyCommitment for samme dag hvis den ikke finnes. Framtidige planendringer er tillatt; flyttes en plan før datoens lokale midnatt, markeres den tidligere raden som fjernet og teller ikke i score. Flytting etter at dagen har begynt lar den opprinnelige raden bli stående i scoregrunnlaget, mens en ny dato får en egen rad. Opprettelser etter at dagen begynner teller med, men UI viser at de ble planlagt samme dag. Life Score teller bare forpliktelser registrert før lokalt kl. 12:00, et enkelt vern mot å lage oppgaver etter fullføring. Senere registrerte oppgaver kan fullføres og gi XP uten score. Denne grensen må gjelde både API, migrasjoner og scoretesten. Avlyst på grunn av legitim endring vises som avlyst, men fjerner ikke en forpliktelse retroaktivt fra score; dette er et produktvalg som kan revideres med versjonert formel.

## Progression og Activity, fase 3

| Entity | Viktige felt | Relasjoner og invariant |
| --- | --- | --- |
| TaskCompletion | Id, UserId, TaskId, CompletedAtUtc, AwardedXp, ReversedAtUtc? | Delvis unik aktiv TaskId; hver syklus er identifiserbar; AwardedXp er historisk beløp |
| XpEntry | Id, UserId, AmountSigned, Kind, SourceKind, SourceId, LifeAreaId?, OccurredAtUtc, RuleVersion, Note? | Append only; unik (UserId, Kind, SourceKind, SourceId); negativ reversal refererer original kilde via RelatedEntryId |
| ActivityEvent | Id, UserId, Kind, SubjectKind, SubjectId, LifeAreaId?, OccurredAtUtc, Summary, DetailsJson?, SchemaVersion, SourceEventId? | Append only, unik (UserId, Kind, SourceEventId) når SourceEventId finnes; ingen hard FK til slettbart subjekt |
| FocusSession | Id, UserId, TaskId?, StartedAtUtc, RunningSinceUtc?, AccumulatedSeconds, EndedAtUtc?, Status | Maks én uavsluttet økt per bruker med delvis unik indeks; serveren beregner varighet ved pause og stopp |
| Reward | Id, UserId, Title, RequiredLevel, CreatedAtUtc, ArchivedAtUtc? | Én brukerdefinert belønning knyttet til levelterskel |
| RewardClaim | Id, UserId, RewardId, ClaimedAtUtc | Unik (UserId, RewardId); tidligere hentet belønning beholdes ved XP korreksjon |
| CommandReceipt | Id, UserId, ClientActionId, Operation, ResultId?, CreatedAtUtc | Unik (UserId, ClientActionId); idempotens for fullføring, reversering, vanelogg og RewardClaim |

Registrer TaskCompletion, XpEntry, ActivityEvent og CommandReceipt i én databasetransaksjon. Gjentatt fullføringskall med samme ClientActionId returnerer samme resultat. Konkurrerende kall med ulike nøkler møter aktiv unik indeks, og kun én får XP. Gjenåpning lager reversal av nøyaktig den aktuelle positive XP posten; ingen rader i ledger endres eller slettes. HabitLog bruker tilsvarende positiv og negativ post ved registrering og reversering. For små daglige XP tak må tildeling serialiseres per bruker og lokal dato, for eksempel med en transaksjonell lås på en rad i UserSettings, og evalueres mot tidligere tildelt netto kategori den dagen. Et avvist eller takbegrenset XP beløp lagres som AwardedXp 0 eller delbeløp; aktiviteten består.

Ikke bruk full Event Sourcing. Task, Goal, Habit og hver områdemodul beholder vanlig nåtilstand. ActivityEvent er lesbar revisjonshistorikk, ikke eneste kilde for rekonstruksjon. For avgrenset arkivbehov legges nødvendige felt i hendelsens Summary eller versjonerte, begrensede DetailsJson.

## Metrics, Area Scores og Life Score, fase 4

| Entity | Viktige felt | Relasjoner og invariant |
| --- | --- | --- |
| MetricDefinition | Id, UserId, LifeAreaId?, Key, Name, Unit, ValueKind, Direction?, IsActive | Unik (UserId, Key); beskrivende måleserie, ingen scorevekt i V2 |
| MetricEntry | Id, UserId, DefinitionId, LocalDate, RecordedAtUtc, NumericValue?, TextValue?, SourceKind, SourceId?, Note? | Historikk; felt passer ValueKind; ikke skriv samme observasjon både her og i områdets typed tabell |
| LifeAreaStatusPeriod | Id, AreaId, EffectiveFromDate, EffectiveToDate?, IncludedInScore | Historisk områdevalg uten overlapp; avaktivering påvirker ikke eldre perioder |
| LifeScoreSnapshot | Id, UserId, AsOfLocalDate, Score?, IncludedAreaCount, DataCoverage, AlgorithmVersion, CalculatedAtUtc | Unik (UserId, AsOfLocalDate, AlgorithmVersion); én global rad per dag og regelversjon |
| AreaScoreSnapshot | Id, LifeScoreSnapshotId, LifeAreaId, Score?, EligibleTaskCount, EligibleHabitOpportunities, DataCoverage | Unik (LifeScoreSnapshotId, LifeAreaId); en rad per område, også ved manglende datagrunnlag |

BodyMeasurement er sin egen sannhetskilde. Dersom en universell graf senere skal vise kroppsvekt, hent fra den typed tabellen gjennom en lesemodell; ikke skriv en kopi inn i MetricEntry. Manuelle serier som søvntimer og egenvurdering kan bruke MetricEntry. Metrics kan i framtiden få kildepeker og importidentitet.

Life Score algoritme v1, implementeres bare i V2:

1. Observasjonsvindu er 28 fullstendige lokale dager til og med i går. Nåværende dag vises separat på Today. Bruk dato og den lagrede TimeZoneId på forpliktelse eller vaneperiode; endring av brukerens tidssone skriver ikke om fortiden.
2. Task ratio per område = antall fullførte DailyCommitments senest kl. 23:59:59 lokal forpliktelsesdag dividert med antall kvalifiserte DailyCommitments. Bare forpliktelser opprettet før lokal kl. 12 samme dag og ikke fjernet før datoens start kvalifiserer. En oppgave plassert på en framtidig dato kvalifiserer også når den beholdes til datoen begynner. Flere forpliktelser på samme Task og dag er umulig. Manglende fullføring teller som ikke utført; flytting etter dagens start sletter ikke nevneren.
3. Habit ratio = antall utførte forventede vanehandlinger / antall forventede. Daily og SelectedWeekdays utvider aktive HabitSchedulePeriod til datoforekomster. WeeklyCount fordeler forventning proporsjonalt over antall dager i hvert ISO ukeutsnitt av vinduet, og teller min(antall unike loggdager, forventet verdi) per ukeutsnitt. Dette hindrer én intensiv uke i å kompensere fullt for flere tomme uker. For en vane som ble startet midt i vinduet regnes bare aktive dager.
4. En komponent er tilgjengelig når den har minst 7 forventede muligheter fordelt på minst 4 datoer. Et område er «Ikke nok data» fram til 7 kalenderdager er gått siden første registrerte plan i området, og dersom ingen komponent er tilgjengelig. Regn kun på kvalifiserte komponenter: 50 % Task + 50 % Habit; når bare én finnes vektes den 100 %. Score = rund(100 × vektet ratio), 0 til 100.
5. Global Life Score er likt vektet gjennomsnitt av score for aktive områder med tilstrekkelig data. Vis alltid hvilke områder som mangler, antall områder i beregningen, planlagte muligheter og periode. Inkludering følger LifeAreaStatusPeriod slik den gjaldt på AsOfLocalDate; historiske snapshots bevarer tidligere utvalg.
6. GoalProgressEntry og MetricEntry vises ved siden av score, ikke i formelen. Det finnes ingen troverdig felles måleenhet som kan gjøre kilo, kroner og prosjektmål til ett rettferdig prosenttall. «Life Score» må forklares som oppfølging av egne planer, ikke som velvære eller livskvalitet.

Snapshot skrives ved lesing av en ferdig dag når den mangler. Ved retting av en handling i fortiden ugyldiggjøres snapshots for alle etterfølgende 28 dagers vinduer som inkluderer datoen; ved neste lesing beregnes de på nytt. Lagre AlgorithmVersion og dekning, slik at senere formelendringer kan forklares. Regn ikke score i frontend. Vis alltid tom tilstand når det mangler grunnlag.

## Områdetabeller, fase 5 og 6

| Område | Entities og første felt | Relasjoner og regel |
| --- | --- | --- |
| Fitness | WorkoutSession (UserId, LocalDate, StartedAtUtc?, EndedAtUtc?, Note); Exercise (UserId, Name, Type, Unit); WorkoutExercise (SessionId, ExerciseId, Position); ExerciseSet (WorkoutExerciseId, Position, Reps?, LoadKg?, DurationSeconds?, DistanceKm?); BodyMeasurement (UserId, LocalDate, Kind, Value, Unit) | 1:m økt → øvelseslinjer → sett; ExerciseSet er nødvendig for å lagre sett, repetisjoner og vekt som brukeren forventer |
| University | Course (UserId, Code, Name, Term, Credits?, State); Assessment (CourseId, Kind, Title, DueDate, Weight?, Result?); StudySession (UserId, CourseId, StartedAtUtc, EndedAtUtc, Note?); CourseTask (CourseId, TaskId) | Kursets oppgaver får konkret FK via koblingstabell; unikt kurs og Task par, begge samme eier, Task med University som Life Area |
| Career | CareerProject (UserId, Title, State, StartedOn?, EndedOn?, Summary?); Skill (UserId, Name, Category?); SkillLog (SkillId, UserId, LoggedAtUtc, Minutes?, Note?, CareerProjectId?) | Logg ferdighet separat fra en løs selvvurdert skillscore |
| Finance | FinanceAccount (UserId, Name, Currency, OpeningBalance, IsActive); FinanceCategory (UserId, Name, Kind); FinanceTransaction (UserId, AccountId, CategoryId?, OccurredOn, AmountSigned, Currency, Description?, TransferGroupId?); MonthlyBudget (UserId, CategoryId, MonthStart, Currency, LimitAmount) | MonthStart er første dato i måneden. Unik budsjett per kategori, måned og valuta. Overføring krever to poster med felles TransferGroupId, balansert sum, ulik konto og samme valuta, uten utgiftskategori. Ingen FX konvertering i V2 |
| Plants | Plant (UserId, Name, Species?, Location?, AcquiredOn?, Notes?, IsActive); PlantCareLog (PlantId, UserId, Kind, LocalDate, Notes?) | Siste stell utledes fra historiske logger; lagre ikke redundant LastWatered |
| Style | WardrobeItem (UserId, Name, Category?, Size?, AcquiredOn?, Price?, Currency?, Notes?); WishlistItem (UserId, Name, Priority, EstimatedPrice?, Currency?, Link?, State) | URL valideres; ingen krav om bilder |
| Food | Recipe (UserId, Title, Instructions, Portions?, Notes?); RecipeIngredient (RecipeId, Position, Name, Quantity?, Unit?); MealLog (UserId, RecipeId?, LocalDate, MealType?, Notes?) | Ingrediensnavn er tekst i V2; ingen global ingrediensdatabase, ernæringsberegning eller duplikat av Recipe data i MealLog |
| Creative | CreativeProject (UserId, Title, Kind, State, StartedOn?, CompletedOn?, Summary?); CreativeSession (UserId, ProjectId, StartedAtUtc, EndedAtUtc, Notes?) | Bevar fullførte prosjekter for V5 |
| Travel | Trip (UserId, Title, StartDate?, EndDate?, Destinations?, Notes?, State); TripChecklistItem (UserId, TripId, Title, IsDone, CompletedAtUtc?, Position) | Reisedatoer og avkrysninger består etter reisen |
| Personal | Ingen egne tabeller | LifeArea key personal kobles til felles Tasks, Habits, Goals, Metrics og Activity |

For modulens subrader uten egen UserId, håndheves eier gjennom roten og en indeksert FK. Legg UserId på direkteressurser som kan hentes separat. Alle POST eller PATCH forespørsler som refererer til andre IDer kontrollerer eierforholdet.

## Future Integrations, V3

Ingen tabeller nå. Forutsatt modell ved behov: IntegrationConnection (eier, provider, consent, status, scopes), ExternalIdentity (provider, external id, intern entity), ImportRun (tidsrom, cursor, status, antall), SyncConflict (lokal og ekstern versjon, valgt løsning) og EventOutbox hvis pålitelig ekstern publisering viser seg nødvendig. Unik (UserId, Provider, ExternalId) for kildehendelser. Tokens krypteres og holdes utenfor vanlige logs. Kalenderutgående hendelser krever ApprovedForSync og konfliktregler; import skal ikke skape automatisk XP.

## Future Life Archive, V5

Ingen tabeller nå. Framtidige Period, Milestone, Reflection, Decision, Memory og MediaAsset får UserId, egne tidspunkter og valgfrie typed lenker til Goal eller prosjekt. En MediaAsset lagrer metadata og nøkkel til privat objektlagring, ikke rå videobytes i PostgreSQL. Arkivet må kunne koble til eksisterende ActivityEvent, GoalProgressEntry og områdets varige prosjekter uten å gjøre ActivityEvent til eneste sannhetskilde.

## Indekser og JSONB

Opprett unike indekser for: (UserId, LifeArea.Key), (UserId, DailyMission.LocalDate), (UserId, DailyCommitment.TaskId, LocalDate), aktiv TaskCompletion per Task, aktiv HabitLog per Habit og LocalDate, aktiv FocusSession per User, (UserId, CommandReceipt.ClientActionId), (UserId, XpEntry.Kind, SourceKind, SourceId), (UserId, RewardClaim.RewardId), (UserId, MonthlyBudget.CategoryId, MonthStart, Currency). Legg indeks på Task (UserId, PlannedDate, DeletedAtUtc), Task (UserId, DueDate), ActivityEvent (UserId, OccurredAtUtc DESC, Id), XpEntry (UserId, OccurredAtUtc), MetricEntry (DefinitionId, LocalDate), FinanceTransaction (AccountId, OccurredOn DESC), Assessment (CourseId, DueDate), PlantCareLog (PlantId, LocalDate DESC) og alle brukte FK. Score snapshots trenger unik (UserId, AsOfLocalDate, AlgorithmVersion) og AreaScoreSnapshot unik (LifeScoreSnapshotId, LifeAreaId). Mål spørringer før ytterligere indekser.

Bruk relasjonelle kolonner for eier, dato, beløp, status, mål, kilder og alt som filtreres eller valideres. JSONB kan brukes til et lite versjonert DetailsJson i ActivityEvent, senere leverandørers rå metadata som kan gjenskapes, eller formularspesifikke visningsdetaljer. Ikke legg Tasks, transaksjoner, treningssett eller hele livsområder i JSONB. [PostgreSQL dokumenterer JSONB og indeksvalg](https://www.postgresql.org/docs/current/datatype-json.html). Backups skal inneholde både data og migrasjonshistorikk, og en faktisk gjenoppretting må prøves med [PostgreSQLs dokumenterte eksport og import](https://www.postgresql.org/docs/current/backup-dump.html).
