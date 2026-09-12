# FUTURE_ARCHITECTURE.md

Formålet er å bevare gode endringspunkter i V1 og V2. Ingen av de framtidige tabellene, adapterne eller bakgrunnsjobbene nedenfor skal opprettes før en konkret versjon trenger dem.

## Prinsipper som allerede må være på plass

Privat eier på alle data, stabile UUID, UTC hendelser og lokale kalenderdatoer, historiske registreringer, eksplisitt kilde på Metrics, uforanderlig Activity og XP, versjonert score, eget API lag og klar forskjell mellom privat og offentlig innhold. Klienten sender brukerhandlinger; serveren avgjør hvilke domeneregler som gjelder. Dette gir framtidige importer, AI forslag og arkiv noe virkelig å bygge på.

## V3 Connected

Start med kalender fordi den har en dokumentert plass i daglig planlegging. En Connection til ekstern leverandør skal ha owner, scopes, samtykke, opprettet/utløpt, status og tidspunkt for siste vellykkede synk. Tokens krypteres i separat felt eller secret store, aldri i ActivityEvent, klient eller åpne logger. Adapter per leverandør implementerer autentisering, innlesing, avgrenset normalisering og utgående operasjoner. Ikke lag en universell provider motor før to ulike leverandører viser et reelt fellesmønster.

Importer har stabil ekstern ID, kildetid, innlest tid, versjon og deduplisering per bruker og provider. Behold rå leverandørdata bare så lenge de trengs til feilsøking og med dokumentert sletting. Importer av fysiske aktiviteter eller GitHub bidrag får ikke XP automatisk; brukeren kan godkjenne kobling til en Task eller Habit uten dobbel belønning.

Kalender trenger en eksplisitt lokal hendelsesmodell, ikke en antakelse om at Task og Event er samme type. En Task kan foreslå et kalenderblokkeringsbehov, men utgående hendelser krever brukerens ApprovedForSync. Når en hendelse redigeres begge steder, behold lokal og ekstern versjon, vis konflikt og la brukeren velge. Synk begge veier, og vis siste synktid og feil. Teknisk pålitelighet kan senere kreve en outbox og en vedvarende jobbkø; start med en enkel persistert jobbstatus og BackgroundService hvis én instans er nok.

Delvis offlinebruk er en separat V3 eller senere beslutning. Før klienten får lov å opprette eller endre data offline, definerer man lokal kø, ClientActionId, idempotens, ordre, konfliktløsning og sikker oppbevaring på enheten. En PWA manifest alene er ikke offline synk.

## V4 Intelligence

Begynn med deterministiske aggregeringer fra historiske kilder: ukentlig Task og Habit oppfølging, Focus tid, frister, Goal utvikling og Metric trender. Hvert funn må ha observasjonsperiode, sample size og sammenligningsgrunnlag. Lite utvalg gir «for lite data». Samvariasjon presenteres aldri som årsak; unngå utsagn som tolker kroppsdata eller økonomi som medisinsk eller finansiell rådgivning.

Når ukentlige reviews faktisk brukes, legg til Review og Insight som lagrer kilder, algoritmeversjon, tidspunkt, forslag, brukerens redigering og eventuelt eksplisitt avslag. Regler kommer før LLM når de kan forklare resultatet. Valgfri AI mottar bare data brukeren uttrykkelig valgte for oppgaven, med synlig liste over delte felt, tredjepartsvilkår og slettestrategi. Bruk strukturert og validert resultat. AI kan foreslå Daily Mission, oppgaveoppdeling og oppsummering, men kan ikke i det skjulte endre Task, kalender, private data eller score.

Bruk Postgres aggregeringer og egnede indekser først. Vurder bakgrunnsjobb, materialiserte view eller egen analyseprosess bare hvis konkrete spørringer blir trege. Arkivér Insight versjoner hvis de senere brukes til beslutninger.

## V5 Life Archive

Period kan representere «Høst 2026» med start, slutt, sted og egne notater. Milestone markerer et betydningsfullt punkt. Reflection knyttes til et mål, prosjekt eller periode og har egen privatstatus. Decision lagrer valg, begrunnelse og senere utfall. Memory kan lagre tekst og valgfrie relasjoner. Mediefiler lagres privat i objektlagring, mens PostgreSQL beholder eier, filnøkkel, MIME type, størrelse, hash, dato, samtykke og koblinger. Valg om offentlig publisering må være per element og som standard av.

ActivityEvent gir sporbare handlinger, men er ikke hele arkivet. En kreativ prosjektbeskrivelse, et bilde eller en refleksjon har egne levende og historiske data. Bevar lenker til slettede Task titler i hendelsens trygge sammendrag, slik at eldre tidslinjer fortsatt kan leses. Skill mellom å arkivere, å skjule fra daglig visning og å slette persondata endelig, inkludert backupretensjon. Søk starter med PostgreSQL tekstsøk og filtrering; vurder særskilt søketjeneste først ved dokumentert behov.

Når medier finnes, må både database og objekter ha versjonerte, uavhengige offsite kopier. Test gjenoppretting av hele relasjonen mellom metadata og filer, ikke bare at bilder finnes i en bøtte. Eksportér i åpne formater og behold stabile referanser.

## V6 som moden helhet

V6 kan gi felles planlegging på tvers av områder, overblikk over tid, anbefalinger basert på dokumenterte mønstre, godkjente automatiseringer, arkiv og en privat portefølje. Brukeren skal fortsatt kunne svare på: hva er planen, hvorfor anbefales dette, hva er faktisk registrert, hva er automatisert, og hvordan angrer jeg? Ny tjeneste eller ny database godtas først etter målt skaleringsproblem, ikke fordi antall funksjoner vokser. Historikkens størrelse og filvolum er viktigere enn antall samtidige brukere.

Versjonene er retningsvalg med brukerbehov som utløser implementeringen. V1 og V2 skal levere de konkrete datamodellene og handlingene som trengs nå, ikke tomme abstraksjoner for en tenkt V6.
