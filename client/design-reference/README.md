# P1 designreferanse — isolert demonstrasjon

Denne inngangen bruker eksisterende React, JavaScript/JSX, CSS Modules, Inter og lokale UI-ikoner. Ingen ny dependency eller låsefil. Ingen import fra autentisering, QueryClient, API eller domenekommandoer. Alle data er fiktive og ligger i `fixtures.js` eller lokalt React-minne. Normal appbygging inkluderer ikke denne HTML-inngangen eller disse bildene.

Fra repositoryroten, med eksisterende avhengigheter installert:

```powershell
npm run dev --workspace client -- --port 5175
```

Åpne [sammenligningen](http://127.0.0.1:5175/design-reference/?compare=1), [A / mørkt](http://127.0.0.1:5175/design-reference/?direction=A&theme=dark) eller [B / lyst](http://127.0.0.1:5175/design-reference/?direction=B&theme=light). `?page=areas`, `?page=ranks`, `?page=settings`, `?page=tasks` og `?day=empty|busy` velger prøver direkte. Retning, tema og arbeidsdag kan også velges i kontrollinjen. Ingen innlogging kreves. Kontroller at porten er ledig før oppstart; ikke stopp en ukjent prosess.

Prototypen demonstrerer lokal avkrysning, oppgavedetaljer, områdebasert filtrering, vanelogging, tema og en enkel oppgavedialog. Reload nullstiller. Fokus og utlogging forklarer at ingen virkelig handling utføres. Språkkontrollen viser fire valg, men P1-teksten er bevisst bokmål; dette erstatter ikke produktets oversettelser eller innstillingslagring. Detaljpanelet er en enkel demonstrasjon, ikke en erstatning for produksjonens adresse-/fokushåndtering.

Med serveren over kjørende:

```powershell
npx playwright test --config tests/browser/signature.config.mjs
node tests/browser/build-signature.mjs
node tests/browser/review-signature.mjs
```

Nettlesertestene bruker Chromium og Firefox fra prosjektets eksisterende Playwright. Byggeskriptet bruker samme Vite-konfigurasjon med en eksplisitt, separat HTML-inngang og skriver til ignorert `artifacts/p1/build`. Review-skriptet måler semantiske kontrastpar og lager `artifacts/p1/review.html`, `contrast.json`, filmetadata og sammenligningsbilde. Generert build, skjermbilder og rapporter skal ikke trackes. Ikke publiser denne demonstrasjonen som appens produksjonsbygg.

Se [designkontrakten](../../docs/SIGNATURE_DESIGN_REFERENCE.md), [ressursoversikten](ASSETS.md) og [de nøyaktige bildepromptene](PROMPTS.md). Ingen eiergodkjenning er gitt. Ingen interaktiv 3D-modell er levert; P3-porten er åpen.
