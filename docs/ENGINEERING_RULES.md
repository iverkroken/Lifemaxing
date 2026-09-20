# ENGINEERING_RULES.md

## Approved scope exception — 20–21 September 2026

The user's selected-feature brief permits public Identity registration, verification/recovery email, supported Google authentication and manual Finance subscriptions. This explicitly supersedes the older blanket no-registration/no-external-account-email wording below. Only account verification/recovery messages go to the configured email provider; no task, health or financial data is sent. Google runs only when configured; Apple and bank connections remain disabled/planned. Ownership, CSRF, secret handling, migration review and production release requirements are unchanged. See ACCOUNT_SETUP.md and IMPLEMENTATION_STATUS.md.

Dette dokumentet er arbeidsinstruks for Astra når implementeringen begynner. PROJECT_SPEC.md bestemmer produktatferd, DATABASE.md bestemmer datainvarianter, ARCHITECTURE.md bestemmer koblinger og denne filen bestemmer arbeidsmåte. Hvis dokumentene motsier hverandre, stopp den konkrete endringen, dokumenter konflikten og foreslå én begrunnet rettelse før videre kode.

## Før hver fase

1. Les relevante spesifikasjoner, eksisterende kode, migrasjoner, tester, README og eventuelle AGENTS.md i repoet. Inspiser faktisk struktur før opprettelse. Ikke skriv om fungerende kode blindt.
2. Bekreft hvilken fase som er aktiv, hvilke avhengigheter som allerede finnes, og hvilke akseptkriterier som gjenstår. Gjør én sammenhengende vertikal funksjon om gangen.
3. Gjør små, lesbare endringer. Gi en kort forklaring av hver filgruppe og hva som ble testet. Oppdater spesifikasjonen eller en beslutning når et nødvendig teknisk valg endres.
4. Bygg og kjør relevante tester etter hvert funksjonssteg. Verifiser minst én nettleserhandling mot PostgreSQL for hver fullført fase.
5. Ikke commit eller push uten at eieren uttrykkelig ber om det. Ikke deploy eller eksponer persondata uten separat beslutning fra eieren.

## Kode og struktur

Frontend er JavaScript og JSX. Ingen TypeScript, TSX, TypeScript konfigurasjon eller generert typeprosjekt. Bruk feature basert struktur og tydelige funksjonsnavn; JSDoc kun der det gjør en kontrakt lettere å lese. Bruk React Router i én deklarativ modus, TanStack Query for hentet serverdata og React Hook Form med Zod på formularer der runtime validering gir verdi. Serveren validerer alle data igjen. Ikke lag ekstra dependencies, state manager, grafbibliotek eller designrammeverk uten dokumentert behov. CSS Modules bruker felles CSS variabler og shared/ui.

Serveren er én forståelig ASP.NET Core API applikasjon med feature mapper og en delt DbContext. Bruk EF Core direkte i en feature eller en liten tjeneste. Unngå generiske repositories, servicegrensesnitt uten flere implementasjoner, mikroservices, full Clean Architecture og full Event Sourcing. Del business rules som XP tildeling, Life Score og eierkontroll i konkrete serverfunksjoner eller tjenester. Ikke dupliser reglene i React.

Ikke hardkode tilfeldige farger, engangsradius eller ulike mønstre per side. Bruk design tokens, samme knapper, felt, navigasjon, feedback og tilgjengelighetsmønstre. Ingen mockdata i ferdige V1 eller V2 visninger. Placeholders og testfixtures er tydelig merket og blir ikke produksjonsinnhold.

## Data og sikkerhet

Alle private spørringer filtreres på UserId fra autentisert principal. Sjekk eier på alle IDer i body, URL og relasjoner; cross owner tilgang må returnere 404 uten data. Ingen offentlig registrering. Ikke lagre access tokens eller auth JWT i localStorage. Cookie og CSRF valideres på alle skrivende API kall. Ingen eksterne API kall med private data i V1 eller V2.

Utførte handlinger, XP og score beregnes på server. Fullføring og XP ledger skal være atomisk, idempotent og forankret i unike databaseinvarianter. Gjenåpning skriver kompensasjon, ikke fysisk sletting av historikk. Ikke stol på at klientens klokke, tidssone eller beregnede XP er sannhet. Dag og tidsrom skal følge lagret IANA tidssone, dato type og UTC hendelser. Penger bruker decimal og riktig valutakode. Filtrering, paginering og projection brukes på voksende historikklister. EF migrasjoner er kildekontrollert og kontrolleres for datatap.

Bruk konfigurasjon og secret store, aldri hemmeligheter i Git eller logg. Ikke logg helsedata, budsjettrader eller personlig tekst. Sikkerhetsfikser og avhengighetsoppdateringer gjennomføres etter dokumentert kompatibilitetskontroll.

## Testing som gir informasjon

Enhetstest rene regler: levelterskler, dagsgrenser for XP, Life Score dekning, lokal dato rundt DST og vaneplan. Integrasjonstest server og PostgreSQL for transaksjon, unikhet, eierisolasjon, CSRF, Identity og migrasjoner. UI test viktige brukerflyter og tilgjengelige dialoger, ikke komponentimplementasjonens private detaljer. Test tapt respons og gjentatt fullføringsforespørsel, konkurrerende fullføringer, gjenåpning og ny fullføring, endring av plan etter start av dagen og tom score. Legg bare til tester som fanger en reell atferdsfeil; behold en rask relevant testpakke.

Før fase markeres ferdig: build passerer, relevante tester passerer, én faktisk skrive og lese flyt i nettleser er demonstrert, eksisterende funksjoner virker, dokumentasjon stemmer, og nye filer kan forstås av eieren i Rider. Ved feil: beskriv årsak og faktisk verifisering, ikke påstå at fase er ferdig.
