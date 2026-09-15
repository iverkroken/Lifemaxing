# Ressursoversikt og produksjonsbrief · P1 draft

## Current authority - Nordic Atelier and Joint

The production identity is the owner-approved Joint in `../src/shared/ui/BrandMark.jsx`: exact two flat paths, black/white support, uppercase LIFEMAXING, 20 px navigation mark with 14 px Inter Medium and 12 px gap. Do not revive the older compass production brief below. Fold/Meridian are study-only. Canonical roles and behavior are in `../../docs/DESIGN_SYSTEM.md`.

Phosphor Regular path data is transferred through the existing semantic Icon API, with pinned provenance and MIT licensing in the production resource inventory. P1 now imports `LegacyIcon.jsx` to preserve its original icon appearance. All images, Blender sources and study SVGs remain untouched references; no models or object renders are imported into production. Do not run renderer/optimizer scripts without explicit approval.

The following brief and asset descriptions preserve historical approval evidence.

## Historical production brief after the graphite review

The original PNG masters below remain untouched historical concepts. The next compass resource should use a matte graphite body, a precise ruby needle and restrained brushed bronze; simplify screws, antique rings and glossy highlights. Its silhouette must survive small display sizes without competing with the mission title. Use consistent neutral studio light and camera across all ten Life Area objects, with muted blue/sand/rose/sage details and generous negative space. Avoid a different background treatment per area.

Production currently uses the original editable BrandMark, AreaArtwork and rank SVGs, recolored through shared tokens. No new raster, GLB, renderer or model is delivered by this revision. Final isolated transparent area objects and the P3 model/fallback remain separate resource work. The older material/camera values below describe the P1 experiment and do not override the revised direction.

Alle stier er relative til denne mappen. Ressursene er vedlikeholdte designkandidater, ikke godkjente produksjonsressurser. Ingen skjermbilder eller persondata ble sendt til en ekstern tjeneste. Tre nye bilder ble laget med det innebygde `image_gen`-verktøyet fra kun tekst, 13. september 2026. Ingen CLI/API-nøkkel, kjøpt bibliotek, Figma-konto, eksternt 3D-mesh eller Riot-bilde ble brukt. Nøyaktige input er bevart i [PROMPTS.md](PROMPTS.md).

| Ressurs | Format / dimensjoner / faktisk størrelse | Opphav og bruk | Rettigheter og endring |
| --- | --- | --- | --- |
| `assets/compass-espresso.png` | PNG, RGB, 1254 × 1254, 2 138 338 byte | Ny AI-generert original kandidat A; Today og visuell referanse for modellering | Generert output under gjeldende OpenAI-vilkår; kan viderebearbeides i prosjektet. Ingen separat tredjepartslisens eller offentlig lisens til andre er lagt på |
| `assets/compass-stone.png` | PNG, RGB, 1254 × 1254, 2 272 981 byte | Ny AI-generert original kandidat B; alternativ Today og materialreferanse | Samme outputgrunnlag som A |
| `assets/life-objects-atlas.png` | PNG, RGB, 1983 × 793, 2 028 465 byte | Ett AI-generert atlas med ti materialstudier; CSS-utsnitt i Life Areas | Samme outputgrunnlag. Atlaset er en faktisk bildekonseptressurs, ikke ti ferdige transparente produktbilder |
| `Emblem.jsx` | Redigerbar JSX/SVG, viewBox 96 × 96; prøvd ved 24, 64, 80 og 128 CSS px | Ti egne LIFEMAXING-silhuetter og en felles kompasskjerne; rangstudie | Ny prosjektkode; ingen ekstern emblemkunst. Eier kan redigere. Ingen ny offentlig kodelisens valgt |
| `LegacyIcon.jsx` | Eksisterende redigerbar JSX/SVG, viewBox 24 × 24, 1.6 stroke | Prosjektets ett eksisterende UI-ikonsett; direkte gjenbrukt med tekstetiketter | Eksisterende prosjektkode, uendret; ingen konkurrerende ikonpakke |
| `@fontsource/inter` 5.3.0 | Eksisterende lokale Latin 400/500/600 WOFF2: 23 664 / 24 272 / 24 452 byte | Eksisterende Inter til all arbeidstekst | SIL OFL 1.1, komplett kopi i `assets/INTER-OFL.txt`. Ingen fontendring. Behold lisens ved redistribusjon |
| Georgia / system serif | Ingen levert fontfil eller ekstra nedlasting | Kun Bs større hovedoppgavetittel; lokal fallback Times New Roman/serif | Systeminstallert font brukes via CSS, ingen fontfil redistribueres |

[OpenAIs europeiske vilkår, Content](https://openai.com/policies/eu-terms-of-use/) ble åpnet: output tilordnes brukeren i forholdet til OpenAI så langt loven tillater; output kan ligne andres output. [Generelle vilkår](https://openai.com/policies/terms-of-use/) ble også åpnet. Dette er proveniens, ikke en garanti for eksklusivitet, varemerkeklarering eller opphavsrettslig vern. Ingen ny lisens som binder eieren er valgt. Materialene kan brukes som egne prosjektkandidater; offentlig lisensiering er ikke utført i P1.

SHA-256 for de uendrede genererte originalene:

```text
compass-espresso.png   f1ec6218baa32952d34684ad8cc14b6ef975252a2bb42ff4afb4d2855c5ba762
compass-stone.png      f7e91a5ff4a2fd543be4833348d0cfb96d8c33d3cfc0633ec2700f386f8eebf6
life-objects-atlas.png dc8016d64609f1a1f6167298f21c949c05b6c872f314efcb3ab63213479069aa
```

## Felles material- og kamerakontrakt

Kildemodell i meter, enhetsdiameter 0,12 m for kompasset. Z opp. Ortografisk kamera: azimut 25°, elevasjon 55°, objektets senter i bildesenter, minst 15 % fri margin. Stor varm softbox øverst til venstre, smal champagnefarget kantbelysning øverst til høyre, myk kontaktskygge mot underlaget. Lyssettingen skal ikke rotere med objektet. PNG-ene følger denne retningen visuelt; eksakte kameramatriser kan ikke utledes av en generert rasterfil.

Espresso anodisert kropp: metall 0,8, roughness 0,38. Børstet bronse: metall 1, roughness 0,32, fine retningsbestemte spor i normalmap. Grafittskive: roughness 0,68. Rubin: dyp burgunder med begrenset intern lysgjennomgang; unngå kostbar flerpass-refraction som første runtimevalg. Elfenbenstein/keramikk: metall 0, roughness 0,72 og diskret poretekstur. Tallene er konkrete produksjonsstartverdier, ikke målte materialegenskaper fra bildene.

## Kritisk leveranse før P3

**Ikke levert: redigerbar 3D-kildescene, GLB og prøvd renderer. P1 er ikke klar for P3s interaktive signatur.** `Get-Command blender` fant ingen kommando, og standardmappen `C:/Program Files/Blender Foundation` finnes ikke. Tilgjengelig bildeverktøy ga faktisk PNG; ingen bekreftet modell-/mesh-eksportør ble funnet. Dette beviser ikke fravær av alle mulige 3D-programmer på maskinen. Ingen installasjon, kjøp eller ekstern opplasting ble utført.

Faktisk prøvd løp: tekstbrief → image_gen → original PNG → kopiert lokal ressurs → React/Vite → Chromium/Firefox → bildeinspeksjon. Ingen del av dette kalles en GLB-prøve.

Etter visuelt valg skal kompass-A modelleres med navngitte, separate deler: `body`, `bezel_outer`, `bezel_inner`, `dial`, `cardinal_marks`, `needle_ruby`, `pivot`, `screws`. Behold tydelig nord/sør-asymmetri, trinn i bezelen, graveringer, knurling og kontrollert materialroughness. Graveringer og knurling skal bakes; unngå unødvendig mikrogeometri. Lever `.blend` eller tilsvarende full redigerbar kilde, `.glb`, kilde-/rettighetsnotat og 512/1024 PNG/WebP-fallback fra **samme scene og kamera** i begge bakgrunner. Den nåværende PNG-en er et brukbart stillbildekonsept, men er ikke bevis for at en fremtidig modell matcher.

Planlagte budsjetter, må måles før aksept: ≤20 000 trekanter, ≤8 draw calls, én teksturatlas på høyst 1024², GLB ≤600 kB overført, separat renderer-kode ≤100 kB gzip hvis mulig, fallback ≤150 kB. Dagens 2,14 MB A-PNG overskrider fallbackmålet og er kun konseptmaster. Ingen ny rendererdependency velges før kompatibilitet med React 19.3/Vite 8.3, lisens og faktisk pakkestørrelse er undersøkt.

Kun én Today-scene. Reserver plassen, last etter hovedinnhold, begrens DPR til 1,5. En kort ≤600 ms respons ved eksplisitt handling kan rotere nålen høyst 6°; ingen kontinuerlig idle-spin eller pseudopoeng. Stopp rendering i skjult fane/utenfor viewport. Reduced motion, WebGL-feil, context loss og lastfeil skal vise statisk fallback og bevare alle oppgavehandlinger. Verifiser dette med virkelig GLB og GPU før P3, inkludert frame time på representativ mobil; det er ikke testet her.

## Livsområder — ti konkrete motiv og neste eksport

Atlaset bruker samme lysside og en sammenhengende materialfamilie. Objektene er åpnet som faktisk bilde og sett i Areas. Utsnitt er kun presentasjon: originalen har litt ujevn celleregistrering og bok-/plantemotiv nær kanten. Før P4 skal hver valgte gjenstand få separat, uskåret 512 × 512 alpha-master, 256/512 WebP og identisk kamera. Målet er ≤60 kB per 256-variant og lazy loading; ingen samtidige WebGL-scener. Ikke strekk atlaset for å skjule formatproblemer.

| Område / atlasposisjon | Motiv og konsistenskrav | Neste produksjon |
| --- | --- | --- |
| fitness / rad 1, kolonne 1 | Espresso kettlebell, bronse i håndtaket; tung og stabil silhuett | Behold håndtakets åpning ved 48 px |
| university / 1,2 | Burgunder bok, elfenbenarkitektur i oppslaget | Fjern uleselig pseudotekst fra sluttmaster, behold sidevolum |
| career / 1,3 | Sammenbygde former i grafitt, stein og bronse | Synlig sammenføyning, ingen generisk stigende graf |
| finance / 1,4 | Balanse med metallskåler og steinfot | Bevar tydelig balansearm, unngå mynter/valutasymboler |
| home / 1,5 | Plante i kremkeramikk | Nok luft rundt blader; ingen grønn kortbakgrunn |
| style / 2,1 | Burgunder klesform på bronsestativ | Bevar tekstilfoldene og hel stativsilhuett |
| food / 2,2 | Keramikkskål, pære og skje | Varm keramikk; skjeen må ikke klippes |
| creative / 2,3 | Grafittoptikk og bronseringer | Rens genererte markeringer; ingen objektivmerkevare |
| travel / 2,4 | Terreng/kart med diskret grønn rute | Fiktivt terreng uten private stedsdata |
| personal / 2,5 | Egen burgunder keramisk knute på stein | Gjenkjennelig negativt rom i løkken |

Emblemene viser en samlet original familie. De små 24 px-prøvene er bevisst synlige i rangoversikten; de mest detaljerte ytterkonturene må optisk forenkles før P10. Dette er ingen godkjent ferdig emblemserie eller numerisk rangmodell.
