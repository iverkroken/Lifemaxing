# PROJECT_SPEC.md

Status: Endelig produktspesifikasjon for første utviklingsløp. Produktversjoner V1 til V6 beskriver funksjonelle milepæler, ikke versjoner av HTTP API.

## Formål

LIFEMAXING er et privat, personlig operativsystem som hjelper eieren å omsette planer til utført arbeid. Det samler oppgaver, rutiner, mål og etter hvert data fra livsområder i én sammenhengende arbeidsflyt:

PLAN → DO → COMPLETE → RECORD → REWARD → ANALYZE → IMPROVE.

Today svarer på «hva skal jeg gjøre nå?». Focus Mode gjør det enklere å starte og fortsette. Fullføringer blir registrert én gang, gir sporbar progresjon og blir senere grunnlag for innsikt. Overview svarer på «hva har faktisk skjedd over tid?». Produktet skal kunne brukes i mange år av én person, men alle private data eies av en eksplisitt bruker i modellen.

## Produktregler

1. Første skjerm viser én Daily Mission, et håndterlig utvalg planlagte oppgaver og dagens vaner. Analyse må ikke skyve utførelse ut av Today.
2. Opprettelse skal være rask: Quick Add krever tittel; planlagt dato, område og detaljer kan legges til etterpå. Å velge en planlagt dato lager samtidig en Daily Commitment for datoen. Oppgaver uten dato går til Inbox.
3. Life Areas organiserer handlinger og analyser. Standardnøkler: fitness, university, career, finance, home, style, food, creative, travel, personal. Brukeren kan endre visningsnavn og deaktivere områder, mens stabile nøkler brukes internt.
4. En Task er en avgrenset handling. En Habit er en gjentakende forventning med egen logg. Et Goal er et ønsket resultat med målverdi eller dokumentert framdrift. Ikke modeller disse som samme tabell.
5. Brukeren velger Daily Mission manuelt i V1, høyst én per lokal kalenderdag. Focus Mode kan brukes uten at tid alene automatisk gir XP.
6. Viktige endringer får historikk. En feilaktig fullføring kan korrigeres, mens historikken viser både handling og korreksjon.
7. Appen er privat. Ingen deling, offentlig profil eller offentlig registrering i V1 eller V2. Offentlig portefølje krever senere eksplisitt publisering av utvalgt innhold.
8. Mobil skal kunne gjennomføre samme kjernehandlinger som desktop. Ingen sentral funksjon får kun en mobil eller kun en desktopflyt.
9. Helse og økonomi lagres bare fordi brukeren legger dem inn. Score er en beskrivelse av registrert oppfølging, ikke en diagnose, økonomisk vurdering eller karakter på mennesket.
10. Tilgjengelighet, tydelig samtykke til framtidige datakilder og praktisk eksport er del av produktkvaliteten.

## Begreper og handlinger

| Begrep | Betydning | Første leveranse |
| --- | --- | --- |
| Inbox | Oppgaver uten planlagt dato | V1 |
| Today | Planlagte og forfalte oppgaver, vaner, Daily Mission og raske handlinger | V1 |
| Daily Commitment | En oppgave brukeren aktivt plasserer på en bestemt dag; beholdes som historisk plan | V1 |
| Daily Mission | Dagens ene fremhevede oppgave, valgt blant egne aktive oppgaver | V1 |
| Focus Session | Registrert start, pauser, gjenopptakelse og stopp av arbeid | V1 |
| XP | Netto sum av uforanderlige poster for godkjente fullføringer og korreksjoner | V1 |
| Level | Avledet av netto XP etter versjonert regel | V1 |
| Rank | Avledet av Level etter versjonert regel | V1 |
| Reward | Brukerdefinert belønning som åpnes ved et level og kan markeres hentet én gang | V1 |
| Life Score | Dokumentert oppfølgingsgrad for planlagte handlinger i en avgrenset periode | V2 |
| Metric | Historisk måleserie med enhet og eksplisitt kilde | V2 |
| Activity | Lesbar aktivitetsstrøm fra betydningsfulle domenehendelser | V1 |

XP for Task velges ved opprettelse fra Tiny 10, Small 25, Medium 50, Large 100, Epic 200. Brukeren kan endre tier før fullføring; den tildelte verdien lagres på selve fullføringen. Vaner gir 10 XP som standard og høyst 25 XP per registrering. Små oppgaver kan samlet gi høyst 50 XP per lokal dag; vaner kan samlet gi høyst 75 XP per lokal dag. Tak gjelder nye tildelinger og endrer aldri gammel historikk. En Task fullføres én gang per aktiv fullføringssyklus. Gjenåpning lager en egen negativ ledgerpost mot nøyaktig den fullføringen, og ny fullføring oppretter en ny syklus. Ingen XP for å opprette, flytte eller slette planer, for rene fokusminutter, eller automatisk for å markere et Goal fullført. Dette demper insentivet til å lage mange små oppgaver. Et daglig XP tak gjelder ikke Medium, Large og Epic; historikk og brukerens skjønn trengs fortsatt.

Level starter på 1, også dersom korrigeringer midlertidig gjør netto XP negativ; bruk da 0 som grunnlag for level. XP for overgangen fra level N til N + 1 er 500 + 100 × (N − 1). Totalgrensen for level L er summen av alle tidligere overganger, altså 500 × (L − 1) + 50 × (L − 1) × (L − 2). Beregn i én sentral tjeneste fra netto XP, aldri ved å oppdatere Level som sannhetskilde. Ranks: Bronze 1–9, Silver 10–19, Gold 20–29, Platinum 30–39, Diamond 40–49, Apex 50+. Legg regelversjon på XP poster og historiske visninger slik at framtidige justeringer er forståelige. Ingen spendable XP i V1 eller V2.

## V1: fungerende kjerne

Innlogging og utlogging med beskyttet grensesnitt og API. Today, Inbox, Tasks, Habits, Goals, Life Areas, Daily Mission, Focus Mode, Progress og Activity fungerer mot PostgreSQL. Tasks kan opprettes, endres, fullføres og gjenåpnes. Habits kan opprettes, få daglig eller ukentlig plan og loggføres. Goals får status, valgfri målverdi, enhet og historiske fremdriftsoppdateringer. Rewards kan opprettes, åpnes og hentes. Progress viser netto XP, level, rank, neste terskel, oppgavefullføringer, vaneoppfølging, fokusminutter og nylig aktivitet. Analytics i V1 er beskrivende, uten Life Score.

V1 er ferdig først når innlogging → opprett Task → lagring i PostgreSQL → oppdatering i nettleser → fullføring → én XP post og én aktivitetsregistrering → gjenåpning med korrekt korrigering fungerer på både mobil og desktop. Det samme prinsippet gjelder vanelogg, mål, Daily Mission og Focus Session. V1 kan verifiseres lokalt; offentlig tilgjengelig drift krever også Phase 8.

## V2: nyttige livsområder

| Område | Nyttig første arbeidsflyt |
| --- | --- |
| Health and Fitness | Registrer økt med øvelser og sett; se økthistorikk og kroppsmål |
| University | Registrer kurs, vurderinger og studieøkter; se kommende frister og studietid |
| Work and Career | Registrer prosjekter, ferdigheter og dokumenterte øvinger |
| Finance | Legg inn konti og transaksjoner manuelt; følg kategorier og månedsbudsjett |
| Home and Plants | Før planteprofiler og vanning eller annen stellhistorikk; bruk vanlige Tasks for husarbeid |
| Style | Organiser garderobe og ønskeliste uten bildelagring som krav |
| Food and Cooking | Lag oppskrifter med ingredienser og registrer måltider |
| Creative | Før kreative prosjekter og arbeidsøkter |
| Travel | Planlegg turer med konkrete sjekklister |
| Personal | Bruk felles Tasks, Habits, Goals, Metrics og Activity |

V2 får Metric Definitions, Metric Entries, Area Scores, Life Score og Overview. Alle områder får en egen nyttig visning og minst én gjennomførbar handling, ikke bare en tom kategori med et nytt navn. Life Score bygger på oppfølging av forhåndsplanlagte oppgaver og vaner, og viser datadekning og «Ikke nok data» når grunnlaget er svakt. Goal progress, kroppsdata og penger vises separat og tas ikke inn i en vilkårlig felles vurdering. Spesialiserte økter og registreringer gir Activity, mens XP fortsatt kommer fra Task eller Habit som brukeren faktisk fullfører; systemet gir ikke to XP belønninger for samme handling. Full definisjon finnes i DATABASE.md og ARCHITECTURE.md.

## Retning V3 til V6

V3 Connected: kontrollert innhenting fra eksterne kilder. Kalender prioriteres; synkronisering begge veier skal bare sende hendelser brukeren har godkjent. Strava og GitHub kan følge når de gir tydelig nytte. Garmin, bank og andre kilder avhenger av tilgang, samtykke og dokumenterte vilkår. Delvis offlinebruk og PWA kan vurderes som egen arbeidsflyt, med konfliktregler før synkronisering aktiveres.

V4 Intelligence: statistikk med kildegrunnlag, forklarte mønstre, ukentlige gjennomganger og valgfri AI som foreslår handlinger. Ingen AI får skrive private data uten synlig forslag og brukerens godkjenning.

V5 Life Archive: år, perioder, milepæler, refleksjoner knyttet til mål eller prosjekter, beslutninger, minner, arbeid og personlige medier. Brukeren bestemmer selv hvilke opplysninger som blir bevart eller eventuelt publisert.

V6 Mature Personal Operating System: planlegging, utførelse, data, analyse, automatisering, kunnskap og arkiv virker sammen. Dette er en kvalitetsmilepæl, ikke en unnskyldning for å bygge alle framtidige moduler nå.

## Avgrensninger i første utviklingsløp

Ingen offentlig profil, native app, bankkobling, kalenderkobling, AI coach, pushvarsler, bildefilopplasting, full offline synkronisering, mikroservices, køsystem eller full Event Sourcing. En responsiv mobilvisning leveres nå. Prioriter driftsklarhet, sikkerhet, historikk, klar interaksjon og reell bruk før flere funksjoner.
