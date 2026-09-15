# Nordic Atelier — visuell designstudie

## Current decision - production foundation

Nordic Atelier is approved and **Joint** is the locked production identity, as implemented in `../../src/shared/ui/BrandMark.jsx`. The Fold/Meridian comparison below is retained unchanged as historical study material. Its pending-approval language describes the earlier delivery. Production transfers shared foundations and real appearance previews only; fixtures, complete compositions, sculptural renders and Blender sources stay in this reference entry. Experience P3/P4 have not started. Current authority: `../../../docs/DESIGN_SYSTEM.md`.

## Historical study delivery

14. september 2026. En separat, interaktiv studie basert på eierens godkjente plan. **Nordic Atelier og redigerbare skulpturelle stilleben er valgt som retning. Fold er hovedkandidat, ikke endelig logo. Denne konkrete studien venter på visuell eiergodkjenning.**

[Åpne sammenligningen](http://127.0.0.1:5176/design-reference/atelier/). Åtte grupper viser Today desktop/mobil, Fold mot Meridian, Life Areas, sidebar/ikoner, flater/typografi, Progress og Settings. Alle har lys/mørk sammenligning. Bytt merke i galleriet; «Åpne og prøv» åpner den responsive prøven i full størrelse. Life Areas, Progress og Settings har også mobilvalg i galleriet.

## Omfang og bruk

Dette er en egen Vite-entry under `client/design-reference/atelier`. Den importeres ikke av produksjonsappen, bruker ingen API-kall, og gjør ingen konto-, backend-, XP- eller databaseendringer. Fiktive data og lokale tilstander nullstilles ved lasting. Ingen P3-runtime, P4-utrulling eller ny produktfunksjonalitet er startet.

Fra repository root:

```powershell
npm run dev --workspace client -- --port 5176
node tests/browser/build-atelier.mjs
npx playwright test --config tests/browser/atelier.config.mjs
node tests/browser/review-atelier.mjs
```

Bygg, nettleserbilder, spor og PNG-renderoriginaler ligger under ignorert `artifacts/atelier/`. Galleriet bruker reelle HTML-visninger i skalerte rammer; 16/24/32 px skal bedømmes i fullvisning ved 100 % nettleserzoom. Parameteren `preview=1` skjuler bare studieverktøylinjen. `theme=light|dark`, `mark=fold|meridian`, `day=normal|empty|busy|complete|long` og `density=normal|compact` gir direkte prøver.

Prøv avkrysning/angring, vanelogging, ny oppgave, oppgavedetaljer, områdefiltre, Start Focus/retur, mobilnavigasjon, kollaps av «Din utvikling», systemtema, tetthet og Settings-lagringsfeil med nytt forsøk. Focus er en uttrykkelig lokal demonstrasjon med statisk klokke. Aktivitet/Belønninger utenfor Progress-prøven er bare navigasjonsdestinasjoner. Grensesnittet er bokmål; engelske områdenavn og «Start Focus» er beholdt i denne studien. Regionalt dato-/tallformat kan prøves separat.

## Designvurdering

**Fold anbefales.** Den sammenhengende, kantede silhuetten står tydeligere ved 16 px og er lettere å kjenne igjen uten tekst. Den vertikale stammen gir ro; den diagonale returen tilfører bevegelse. Optisk masse ligger litt lavt og til venstre, men den åpne øvre høyresiden balanserer formen. Meridian er elegant i stor størrelse og som metallobjekt, men kretsen med separat hjørne nærmer seg et refresh-/fremdriftsikon. Det lille hjørnet er også en svakere identitetsbærer ved 16 px. Fold bør få en siste optisk finjustering av diagonal og stamme etter eierens valg. Ingen av formene er fremstilt som juridisk klarert varemerke.

**Paletten bør beholdes med den tydelig kjøligere sidebarflaten som er prøvd her.** Lys canvas er nesten hvit, standardflater har svakt porselenspreg, mens sidebaren er mineralgrønn/grå. Valgt tilstand er en egen kjølig flate. Det gir tydeligere lag enn beige på beige. Dark mode skiller mørk sidebar, blålig canvas, arbeidsflater og hevede kontroller. Rubin er en avgrenset handlingsfarge; blått brukes til informasjon og områdeidentitet, salvie til fullføring, bronse til opptjent verdi. Dekorative kategorifarger må ikke leses som status alene.

**Nordic Atelier er sterk nok til å anbefales som kanonisk visuell retning etter godkjenning av denne studien.** Komposisjon, typografi, navigasjon og materialfamilie fungerer sammen på tvers av prøvene. Anbefalingen låser ikke resten av appen automatisk. De seks øvrige Life Areas skal først produseres etter at de fire representative stillebenene er vurdert. Videre arbeid bør begynne med endelig merkegeometri og oppdatering av kanoniske tokens, deretter én avgrenset produksjonsoverføring av shell/Today. Dette er en anbefalt rekkefølge, ikke startet arbeid.

Tre avgjørelser gjenstår: velge Fold eller Meridian, godkjenne palett/komposisjon i de faktiske skjermene, og godkjenne Nordic Atelier som kanonisk referanse for en senere, separat produksjonsoppgave.

## Komposisjon og tilstander

- Today har kompakt tittel/dato, én åpen Mission-seksjon og rubin Start Focus. Desktop deler oppgaver og vaner i ulike kolonner; mobil viser vanene tidlig. Signaturobjektet ligger ved siden av teksten, og blir 104 px på mobil. Oppgaver er delte rader, ikke kort i kort. Progress samler level, opptjent materiale og vei til neste level i én rolig avslutning.
- Normaldagen har seks planlagte oppgaver, én fullført og én av tre vaner logget. Travel dag har 18 planlagte oppgaver. Tom/fullført dag og lang hovedtittel er egne prøver. Lokale avkrysninger er reversible; XP forblir et merket fast eksempel.
- Progress viser level 8, 6 200 total XP og 600 av 1 200 XP på veien til level 9. Det retter inkonsistensen i den historiske P1-prøven, som viste 5 600 total sammen med 600 opptjent i level 8. Bronse-emblemet er en materialprøve, ikke en ny rangmodell. Historikken viser både opptjening og korrigering.
- Settings bruker små, faktiske komposisjonsprøver for lyst/mørkt/system, egne seksjonsikoner og eksplisitte lagringstilstander. «Lagret» er bare en lokal tilstand i denne isolerte demonstrasjonen.
- Phosphor **Regular** er valgt for den åpne, konsekvente konturen: Sun for dagen, CheckSquare for oppgaver, ArrowsClockwise for gjentakelse, Target for mål, SquaresFour for områder, Crosshair for fokus, ChartBar for fremgang og SlidersHorizontal for innstillinger. Ikoner er normalt 20 px i navigasjon, 24 px i mobilnav og inventar; navigasjon og hovedkontroller har klikkflater på minst 44 px. Valgt tilstand har både flate, markør og tekstvekt.
- Native scrollbarer har egne thumb/track-tokens, tynn bredde og stabil gutter. Fokus bruker en separat blå ring. Reduced motion og forced colors respekteres. Bildenes ytterste skyggekanter tones ut med en CSS-maske; geometri og materialer endres ikke per side.

## Fargearkitektur i prøven

| Rolle | Lyst | Mørkt |
| --- | --- | --- |
| Canvas | `#F6F5F1` | `#181E22` |
| Sidebar | `#E8ECEA` | `#12181C` |
| Standardflate | `#FFFEFA` | `#232B30` |
| Hevet flate | `#FFFFFF` | `#2D373D` |
| Valgt | `#DCE5E5` | `#303E47` |
| Interaktiv flate | `#EDF0ED` | `#263137` |
| Hover | `#D9E0DD` | `#34434A` |
| Overskrifter / tekst | `#202A30` | `#F3F4F0` |
| Sekundærtekst | `#566269` | `#B3BEC3` |
| Dekorativ divider | `#D8DEDD` | `#3C484F` |
| Kontrollkant | `#77868B` | `#819196` |
| Primærknapp, hvit tekst | `#963D55` | `#A5415C` |
| Rubin tekst / merke | `#963D55` | `#E8A2B6` |
| Informasjon / blå kategorietikett | `#3D6090` | `#9EBBF2` |
| Fullføring / salvie | `#416B5C` | `#9BBDB0` |
| Opptjent verdi | `#80632D` | `#D0AE75` |
| Feil | `#B4232C` | `#FF9E98` |
| Tastaturfokus | `#355ACB` | `#A4C3FF` |
| Scrollbar thumb | `#73827E` | `#899A9E` |

Inter 400/500/600 er lokalt levert via eksisterende avhengighet. Arbeidstitler er 16 px; sekundærtekst/kontroller typisk 14 px; korte etiketter 12 px. Små merke-/studieetiketter bruker mindre størrelser uten å bære nødvendige instruksjoner. Headline 28 px på mobil og opptil 48 px på desktop. Kontrollkanter har en annen rolle og større kontrast enn dekorative skillelinjer.

## Redigerbare ressurser og rettigheter

`studio/atelier-studio.blend` er en **faktisk Blender-fil**, åpnet og kontrollert med Blender 4.5.9 LTS: seks objektkolleksjoner, 43 mesh-objekter, én ortografisk kamera og tre studiolys. `studio/render.py` er den komplette parametriske kilden. Alle objekter er originale, bygget for denne studien; ingen eksterne mesh, stockbilder, teksturer eller genererte AI-bitmaps er brukt. Visuelle inspirasjonskilder fra designreviewen er ikke innlemmet som ressurser.

| Kolleksjon | Motiv | Materialer |
| --- | --- | --- |
| Fold | Brettet geometrisk signatur | Satinert aluminium, rubin emalje |
| Meridian | Åpen krets og separat orienteringshjørne | Samme aluminium og rubin |
| Health & Fitness | Oppreist keramisk ring over bølgende tekstil | Lys keramikk, salvie |
| University | Åpen bok med faktiske sidelag og bokmerke | Porselenshvitt papir, mørk tekstil, blå emalje |
| Work & Career | To sammenføyde konstruksjonsformer | Aluminium, blå emalje, mørk detalj |
| Travel | Foldet kart med relieff og én rute | Papir, salviekonturer, blå rute |

Felles kamera: posisjon `(4, -7, 6.3)`, mål `(0, 0, .75)`, ortografisk skala `3.65`. Samme tre lyskilder og 768 × 768 utsnitt brukes for alle. Objektets orientering og motiv varierer; kamera, bildeskala og materialfamilie gjør det ikke. Lys/mørk-render endrer skyggeunderlagets respons, ikke kamera eller lys. Tolv transparente WebP-er er 36–81 kB hver. Rå PNG-er regenereres til ignorert `artifacts/atelier/renders`.

```powershell
# Bruk egen Blender 4.5 LTS-sti.
& 'C:/path/to/blender.exe' -b --python client/design-reference/atelier/studio/render.py
node client/design-reference/atelier/studio/optimize.mjs
```

Valgfri utvelgelse etter `--`, for eksempel `-- fold meridian`. Filen lagres med alle seks kolleksjoner, mens bare valgte objekter rendres. `optimize.mjs` bruker lokal Playwright/Chromium-canvas til formatkonvertering av egne renderfiler. Portable Blender ble hentet fra [offisiell 4.5-utgivelseskatalog](https://download.blender.org/release/Blender4.5/); ZIP-ens SHA-256 ble kontrollert mot den offisielle checksum-filen. Programmet ligger utenfor repositoryet.

`assets/fold.svg` og `assets/meridian.svg` er originale vektorstudier. Phosphor-SVG-ene er uendrede Regular-filer fra et låst upstream-commit; [kildeangivelse](assets/icons/SOURCE.md) og [MIT-lisens](assets/icons/LICENSE) følger med. Inter bruker eksisterende Fontsource-pakke og SIL OFL, bevart i [prosjektets Inter-lisens](../assets/INTER-OFL.txt). Et ressursmanifest dokumenterer hashes og størrelser. Ingen ny npm-avhengighet eller lockfile-endring er nødvendig.

Dette beviser et redigerbart offline-løp, ikke en ferdig 3D-runtime. Ved senere P3 er anbefalingen fortsatt Blender → optimalisert GLB → valgfri React Three Fiber, med statisk WebP som standard/fallback. GLB, polygon-/GPU-budsjett og interaktiv ytelse er ikke levert eller godkjent her.

## Verifikasjon

Studietestene består 16/16 (8 i Chromium og 8 i Firefox). Frontendens eksisterende 35 tester består. Produksjonsbygg og separat studiebygg består. Lint er uten feil/advarsler. Den egne nettlesersuiten prøver begge temaer ved 320, 390, 768, 1440 og 1920 px, begge merker i første mobilviewport, lokale handlinger, områdenes representerte tall, Settings/systemtema/retry, dialogfokus, scrolling, reduced motion, bildefallback og 200 % forstørret tekst. 22 rollebaserte kontrastpar per tema kontrolleres: 4,5:1 for tekst og 3:1 for nødvendige kontrollkanter/fokus/scrollbar. Dette er målrettede kontroller, ikke en full WCAG-sertifisering.

Skjermbilder tas med Chromium uten Playwrights `--hide-scrollbars`. Firefox-automatiseringen rapporterer scrollbar-bredde `none` selv med korrekt deklarert `thin`; testen kontrollerer derfor deklarasjon, temafarger og faktisk scrolling i denne motoren. Headless-forskjellen er også omtalt i [Mozillas Playwright-sak](https://bugzilla.mozilla.org/show_bug.cgi?id=1989011). Vanlig headed Firefox-scrollbar er ikke visuelt kontrollert i denne runden.

Et komplett nettleserresultat og Git-avgrensning registreres i `docs/IMPLEMENTATION_STATUS.md`. Produksjonsfiler og eldre P1-filer sammenlignes med inngangens SHA-256-manifest; tidligere staging skal være bevart. Ingen commit, push, merge eller branchoperasjon inngår.
