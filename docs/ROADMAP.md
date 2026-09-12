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

## Skal vente

| Versjon | Første verdifulle leveranse | Forutsetning | Skal ikke bygges på forskudd |
| --- | --- | --- | --- |
| V3 Connected | Kalender med godkjent toveis synk og sporbar konfliktbehandling, deretter én nyttig importkilde | Stabil V2, private autorisasjonsdata og dokumentert dataproveniens | Generell integrasjonsplattform og støtte for alle leverandører |
| V4 Intelligence | Forklarbare trender og ukentlig review, siden valgfri AI med menneskelig godkjenning | Nok historiske data, måledefinisjoner og samtykkeflyt | Automatisk AI styring av prioriteringer og ubegrunnede korrelasjonsråd |
| V5 Life Archive | Perioder, milepæler, refleksjoner, beslutninger og personlige mediefiler | Stabil historikk, egen lagring for filer, varig backup og eksport | Offentlig publisering som standard |
| V6 Mature Personal OS | Sammenhengende planlegging, utførelse, innhenting, analyse, arkiv og kunnskap | Dokumentert daglig nytte fra tidligere versjoner | Ny arkitektur bare fordi produktet har flere moduler |

## Prioriteringsport mellom fasene

En fase avsluttes med minst én faktisk nettleserflyt gjennom API til PostgreSQL, relevante feilstier, oppdatering av dokumentasjon og fungerende eksisterende tester. Ingen fase regnes som ferdig med bare UI, mockdata eller databasetabeller. V2 skal ikke begynne før V1 brukes i realistiske scenarioer som også omfatter gjenåpning, tapt nettverk, datoendring og håndtering av tomme data.
