# ROADMAP.md

Dette er produktets prioriterte rekkefølge. Fasenummer og akseptkriterier utdypes i IMPLEMENTATION_PLAN.md. Versjon betyr produktomfang; /api/v1 er en separat versjon av kontrakten.

## Må bygges nå: første samlede utviklingsløp

| Fase | Resultat | Milepæl |
| --- | --- | --- |
| 0 Foundation | Repo, .NET 10, React og Vite, Postgres, lokalt utviklingsmiljø, designvariabler, health endpoint | Samme maskin kan starte klient, API og database |
| 1 Auth og database | Identity, privat eier, CSRF, Life Areas, EF migrasjon | Innlogging og beskyttet lesing med riktig eier |
| 2 Core productivity | Inbox, Tasks, Daily Commitments, Habits, Goals, Today, Daily Mission | Planlegging, gjennomføring og lasting på nytt fungerer |
| 3 Progression | XP ledger, Levels, Ranks, Rewards, Activity, Focus Sessions, Progress | V1 er funksjonelt ferdig og korrekt ved gjentatte forespørsler |
| 4 Metrics og Life Score | Måleserier, dokumentert score, områdeoversikt og Overview | Første V2 analyse fungerer med ekte data |
| 5 Første områdemoduler | Fitness, University, Career, Finance | Fire områder har egen lagring, redigering og nyttig oversikt |
| 6 Øvrige områdemoduler | Plants, Style, Food, Creative, Travel; Personal med felles funksjoner | Alle ti områder har en reell arbeidsflyt |
| 7 Polish og testing | Responsiv gjennomgang, tilgjengelighet, feiltilstander, ytelse og relevante tester | V1 regresjoner fanges og V2 kan brukes daglig |
| 8 Production readiness | En produksjonsbygg, hemmeligheter, migrasjonsrutine, offsite backup, restore test, helseovervåking og dokumentasjon | V2 kan trygt tas i bruk utenfor utviklingsmaskinen |

V1 kan avprøves privat etter fase 3. Hvis V1 skal eksponeres på internett før V2, må alle produksjonskrav i fase 8 utføres på det tidspunktet. Fase 8 kan derfor trekkes fram som egen port, men funksjonsfasene beholdes i denne rekkefølgen.

## Bør bygges snart, men bare etter faktisk bruk

V1.5 er ikke en egen teknisk versjon. Gjentakende Tasks, oppgavemaler, deloppgaver, bedre Quick Add, kalenderoversikt uten ekstern synk, bedre filtrering, mørkt tema, globalt søk og ukentlig gjennomgang kan prioriteres ut fra observerte problemer. Løs én konkret friksjon om gangen. Ikke gjør noen av disse til en skjult forutsetning for V1 eller V2.

Etter lansering bør eksport av brukerdata, rutine for gjenoppretting, regelmessige avhengighetsoppdateringer og faktisk gjennomgang av aktivitetsloggen få høyere prioritet enn nye livsområder.

## Experience Evolution etter Phase 3

Eieren har godkjent en navngitt forbedringsserie P0–P11, avgrenset i [EXPERIENCE_EVOLUTION_PLAN.md](EXPERIENCE_EVOLUTION_PLAN.md). P-numrene er oppgaver, ikke nye produktversjoner eller en omnummerering av Phase 0–8. V1/V2-grensene i fasetabellen står fast. P0 er dokumentasjon/analyse; senere P-oppgaver starter bare ved eget oppdrag.

Retningen omfatter grafitt/varm stein med rubinhandlinger, bronseprogresjon og semantisk skoggrønt (designrevisjon 14. september 2026), Today med en gjennomarbeidet 3D-signatur, illustrasjoner/ikoner, kontekstuell hjelp/programguide, Inbox som ubehandlet og Backlog som behandlet uten plan, valgfrie arbeidsdager/perioder/frister, intern kalender med Task-tidsblokker, avgrenset AI-registrering og selvstendig rank atskilt fra level. Eksisterende fire språk, temaer, tetthet, hurtigmeny og Phase 1–3 videreføres.

Dette prioriterer intern kalender uten synk etter Phase 3 og gjør et uttrykkelig, avgrenset unntak fra tidligere AI-utsettelse til V4. P8 tillater bare godkjente registreringsforslag, med runtime-samtykke og budsjett før eksterne kall; se ADR 14. Ekstern kalendersynk forblir V3 og generell Intelligence forblir V4. Ingen passkeys, Life Score/original Phase 4, spesialiserte V2-moduler eller autonome agenter inngår. Rangmodellen skal ikke avhenge av Life Score.

P1 må få visuell eiergodkjenning før P2. P9 må få tallmodellen godkjent etter simulering før P10. Implementeringsgodkjenningen gir ikke tillatelse til kostnader, ekstern deling av privat innhold, migrering av eierens database eller publisering. Ingen senere funksjon er erklært ferdig gjennom denne scopeavklaringen.

## Skal vente

| Versjon | Første verdifulle leveranse | Forutsetning | Skal ikke bygges på forskudd |
| --- | --- | --- | --- |
| V3 Connected | Kalender med godkjent toveis synk og sporbar konfliktbehandling, deretter én nyttig importkilde | Stabil V2, private autorisasjonsdata og dokumentert dataproveniens | Generell integrasjonsplattform og støtte for alle leverandører |
| V4 Intelligence | Forklarbare trender og ukentlig review, siden valgfri AI med menneskelig godkjenning | Nok historiske data, måledefinisjoner og samtykkeflyt | Automatisk AI styring av prioriteringer og ubegrunnede korrelasjonsråd |
| V5 Life Archive | Perioder, milepæler, refleksjoner, beslutninger og personlige mediefiler | Stabil historikk, egen lagring for filer, varig backup og eksport | Offentlig publisering som standard |
| V6 Mature Personal OS | Sammenhengende planlegging, utførelse, innhenting, analyse, arkiv og kunnskap | Dokumentert daglig nytte fra tidligere versjoner | Ny arkitektur bare fordi produktet har flere moduler |

## Prioriteringsport mellom fasene

En fase avsluttes med minst én faktisk nettleserflyt gjennom API til PostgreSQL, relevante feilstier, oppdatering av dokumentasjon og fungerende eksisterende tester. Ingen fase regnes som ferdig med bare UI, mockdata eller databasetabeller. V2 skal ikke begynne før V1 brukes i realistiske scenarioer som også omfatter gjenåpning, tapt nettverk, datoendring og håndtering av tomme data.
