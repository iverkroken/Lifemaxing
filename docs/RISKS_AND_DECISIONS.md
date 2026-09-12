# RISKS_AND_DECISIONS.md

Status 12. september 2026. Disse beslutningene styrer V1 og V2 og kan endres ved en ny, begrunnet beslutning. Navn på leverandører og priser er tidsavhengige og verifiseres ved drift.

## Beslutninger

| ID | Valg | Hvorfor og konsekvens |
| --- | --- | --- |
| ADR 01 | React med JavaScript og JSX, Vite og deklarativ React Router | Rask utvikling i en kjent, komponentbasert frontend; brukeren ønsker uttrykkelig ikke TypeScript. Tap av statisk typet klient kompenseres med små DTO kontrakter, Zod på formularer og faktiske kontrakttester. [React Router beskriver denne installasjonen](https://reactrouter.com/start/declarative/installation). |
| ADR 02 | TanStack Query, React Hook Form, Zod, CSS Modules og CSS variabler | Ett eierskap til servertilstand, enkel formularvalidering og et synlig designsystem. @hookform/resolvers trengs for enkel Zod kobling. Recharts, date-fns og Lucide brukes bare der en faktisk skjerm krever dem. [TanStack Query beskriver sin serverdataflyt](https://tanstack.com/query/latest/docs/framework/react/overview). |
| ADR 03 | ASP.NET Core 10 LTS, C#, EF Core og Npgsql | Rider passer godt til C#; én språkgrense mellom browser og server er lett å forstå. .NET 10 støttes til 14. november 2028; velg kompatible EF og Npgsql utgaver, ikke kopier gamle versjonsnumre fra eksempler. [Microsofts støtteplan](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core), [Npgsql dokumentasjon](https://www.npgsql.org/efcore/). |
| ADR 04 | PostgreSQL og EF migrasjoner | Relasjoner, konsistente transaksjoner, historikk, indekser og selektiv JSONB passer et personlig datasett gjennom flere år. Penger lagres som decimal, ikke flyttall. [PostgreSQLs JSON dokumentasjon](https://www.postgresql.org/docs/current/datatype-json.html). |
| ADR 05 | Modular monolith, én API prosess og én delt DbContext | Én utvikler kan følge en brukerhandling gjennom all kode og én transaksjon. Ingen mikroservices, generisk repository eller ekstra Clean Architecture lag uten konkret problem. Splitt i egne prosjekter bare ved faktiske behov for separat kjøring eller eierskap. |
| ADR 06 | Identity og same origin HttpOnly cookie med CSRF | Nettleseren slipper å oppbevare bearer token i localStorage. Til gjengjeld er CSRF vern obligatorisk, også på innlogging og utlogging. Ingen offentlig register rute. [Microsoft om CSRF](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0) og [Identity standardruter](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-api-authorization?view=aspnetcore-10.0). |
| ADR 07 | ASP.NET serverer React build fra wwwroot | Samme host for app og /api/v1 gir enklere cookie, én deploy og lite CORS behov. I utvikling løser Vite proxy ulik prosess uten å endre klientens relative API adresser. [Vite proxy](https://vite.dev/config/server-options#server-proxy). |
| ADR 08 | Vanlige domenetabeller pluss XP ledger, Activity og Metrics historikk | Vi trenger sporbarhet uten full Event Sourcing. Gjenåpning kompenserer XP; Activity kan forklare tidligere tilstander uten å være sannhetskilde for alle data. |
| ADR 09 | Score baseres på dokumentert oppfølging, ikke generisk «livskvalitet» | Tidligere 45/45/10 med målbevegelse er svakt fordi mål og målinger har ulike rytmer og enheter. V2 bruker 50/50 Task og Habit komponenter når data finnes, renormaliserer når én mangler, har minstekrav og viser grunnlag. Goal og Metric trender vises separat. Formel versjoneres. |
| ADR 10 | XP tak for Tiny/Small og Habit, ingen XP for samme modulhendelse to ganger | Forhindrer at mange trivielle oppgaver fortrenger viktig arbeid; senere ny scoring besluttes først ut fra reell bruk. Høyt nivå og rank er avledede egenskaper. Rewards er nivålåste, ikke en egen valuta. |
| ADR 11 | Ingen integrasjoner, AI eller filopplasting i V1 og V2 | Kalender med godkjent toveis synk krever OAuth, konflikthåndtering og samtykke. Modulkilder får derfor senere adaptere, ikke tomme tidlige APIer. Dagens modelldata får eier, tid og kilde der det trengs. |
| ADR 12 | Railway som foreløpig driftkandidat, vertnøytral applikasjon | Ett containerimage og PostgreSQL er enkelt å flytte. Velg region og dokumenter pris og backups i fase 8. Railway har egen [prisoversikt](https://docs.railway.com/pricing/plans), [PostgreSQL veiledning](https://docs.railway.com/databases/postgresql), [regioner](https://docs.railway.com/deployments/regions) og [volumbackups](https://docs.railway.com/volumes/backups). Ingen plattformspesifikk SDK i kjernen. |

## Leverandørvalg ved Phase 8

Railway er første kandidat fordi den kan kjøre container og PostgreSQL med forholdsvis lite driftsarbeid. Render og DigitalOcean er rimelige sammenligningspunkter for tilsvarende administrert oppsett. En egen virtuell server kan være billigere i faktura men gir eieren ansvar for sikkerhetsoppdateringer, database, offsite kopier og gjenoppretting. Azure gir flere administrerte muligheter og mer konfigurasjon enn dette ene produktet trenger tidlig. Vercel eller separat statisk hosting deler app og API på tvers av origins og gir liten gevinst her. Ingen alternativ vurderes som avvist for alltid. Sammenlign aktuell pris på app, Postgres, lagring, utgående trafikk, backup og datalokasjon ved fasen. Railway Hobby er per dato oppført til 5 USD per måned inkludert 5 USD bruksramme, mens ressursbruk kan gjøre totalen høyere; det er ikke et estimat for denne appen. [Railways prisside](https://docs.railway.com/pricing/plans). En hostbackup som bare kan gjenopprettes i samme prosjekt er ikke nok; [Railways backupbegrensninger](https://docs.railway.com/volumes/backups) begrunner en separat eksport.

Kostnadsvekst følger sannsynligvis V1 og V2 app og database, V3 leverandørkvoter og jobber, V4 AI bruk og eventuelt beregning, V5 filvolum og sikkerhetskopier, V6 summen av valgte funksjoner. Unngå beløpsestimater for framtidige udefinerte bruksmengder; mål faktiske data etter hver versjon.

## Største risikoer og mottiltak

| Risiko | Følge | Konkret mottiltak og test |
| --- | --- | --- |
| Bred V2 bygges som mange tomme sider | Produktet brukes ikke | Ferdigstill ett områdes hele opprett → vis → historikk løp før neste; test første nyttige handling |
| XP og Score oppmuntrer til lettvinte handlinger | Misvisende fremgang | Daglige XP tak, eksplisitt plan før kl. 12, synlig datadekning, score uten mål og finansvekting; test manipulering med opprett, flytting og reopen |
| Tap av historikk ved redigering eller sletting | Life Archive kan ikke rekonstrueres | Uforanderlig XP og Activity, Goal og Metric entries, soft delete, kontrollert backup og gjenoppretting |
| Cookie og CSRF feil; offentlig register endpoint | Private helse og økonomidata kan bli tilgjengelige | Eier på alle spørringer, ingen register, CSRF på alle writes, rate limit og integrasjonstester med to brukere |
| Tapt Data Protection nøkkel ved restart | Alle sesjoner brytes | Beskyttet persistent nøkkellagring, restart test; [Microsofts veiledning](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/configuration/overview?view=aspnetcore-10.0) |
| Én vert er eneste backupsted | Mange års data kan forsvinne | Krypterte offsite Postgres eksporter, planlagte kopier, kvartalsvis restore prøve og etter hvert mediekopier |
| Tidssoner, sommertid og uens valuta | Feil score, tidsbruk eller totalsum | YYYY-MM-DD for planer, UTC for hendelser, lagret IANA sone, valuta per konto og transaksjon, DST og kryssvalutatester |
| Feilaktig migrasjon i produksjon | Datatap | Gjennomgå SQL eller bundle, ta backup, bruk eget migrasjonstrinn, unngå blind Migrate() ved start; [EF veiledning](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/applying) |
| AI eller integrasjoner røper persondata | Personverntap og feilhandlinger | Ikke implementert nå; senere minimum scopes, krypterte tokens, datakontroll, brukerens godkjenning og logg over kilder |

## Produksjonskrav for privat data

I fase 8 besluttes konkret drift, region og finansiering. Daglig kryptert logisk databaseeksport utenfor driftsleverandøren og leverandørens egne snapshots gir to uavhengige gjenopprettingsveier. Behold for eksempel 7 daglige, 4 ukentlige og 12 månedlige logiske eksportversjoner dersom faktisk pris og datamengde tillater det; dokumenter valgt retensjon og maksimal akseptabelt tap. Test restore til separat database minst kvartalsvis og før større datamigrasjoner. Oppbevar krypteringsnøkkel separat fra kopiene. Ved V5 må objekter og DB metadata gjenopprettes samlet.

Ikke lag en offentlig profil eller koble eksterne AI tjenester til private data som del av V1 eller V2. Det er produktbeslutninger som må tas med faktiske funksjoner og synlig samtykke senere.
