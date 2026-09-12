# DESIGN_SYSTEM.md

Designet skal gjøre handling lett å finne, historie lett å forstå og personlige data verdige å ta vare på. Det skal føles som et rolig kontrollsenter med redaksjonell typografi og varme detaljer, ikke som en spillmeny eller en samling dashboardmaler. Funksjonsklare og konsistente skjermbilder kommer før dekorative særtilfeller.

## Fundament og tokens

| Rolle | Token | Verdi | Bruk |
| --- | --- | --- | --- |
| Sidebakgrunn | color.canvas | #F5F6F2 | Sammenhengende rolig flate |
| Primær overflate | color.surface | #FFFFFF | Skjemaer, hovedkort og dialoger |
| Sekundær overflate | color.surfaceMuted | #EDF2EE | Mindre paneler og stille framheving |
| Sterk tekst | color.text | #1B2923 | Titler, innhold og viktige tall |
| Sekundær tekst | color.textMuted | #506158 | Hjelpetekst og metadata |
| Linjer | color.border | #D7DFD8 | Skiller og feltrammer |
| Hovedaksent | color.accent | #215C48 | Primærknapp, aktiv navigasjon, grafisk tyngde |
| Myk aksent | color.accentSoft | #DDEBE3 | Valgt tilstand, subtil fremdrift |
| Feil | color.danger | #9A3F46 | Feiltekst og destruktive handlinger |
| Advarsel | color.warning | #87531D | Forfalte ting og kontrollpunkter |
| Fokus | color.focus | #235F95 | Synlig keyboardfokus |

Fargetall er startverdier som må sjekkes mot faktisk tekststørrelse og WCAG kontrast i implementeringen. Farger formidles alltid sammen med ord, ikon eller mønster. CSS variabler er sannhetskilden; CSS Modules bruker tokens, ikke hardkodede enkeltfarger. Senere mørkt tema endrer semantiske tokens uten å endre komponentgrensesnitt.

Typografi: Inter, lokalt levert hvis mulig, for UI og brødtekst; system sans som robust fallback. Newsreader kan brukes svært sparsomt til redaksjonelle overskrifter, refleksjoner og arkiv, ikke til felter og små datapunkter. Brødtekst 16 px med linjehøyde omkring 1,5; sekundær tekst minst 14 px; mikrotekst 12 px bare for uviktig metadata. Typografisk skala: 12, 14, 16, 18, 24, 32, 44, 60 px. Bruk tabellariske tall for klokke, penger, KPI og datatabeller.

Spacing bygger på 4 px grunnsteg: 4, 8, 12, 16, 24, 32, 48, 64, 96 px. Bruk 8/12 mellom ikon og tekst, 16/24 innen kort, 32/48 mellom innholdsgrupper, 64/96 mellom store seksjoner. Radius: 8 px felt og små kontroller, 12 px knapper, 16 px vanlige kort, 24 px større fremhevet modul, 999 px for kompakte chips. Bruk lette rammer og få skygger; maksimal én skygge på forhøyet dialog eller flytende element.

## Layout

Desktop fra 1200 px: venstre navigasjon omkring 248 px og hovedinnhold maks 1120 px; Today får en tydelig primærkolonne med dagens Mission, oppgaver og vaner, og en roligere sekundærkolonne for status. Nettbrett 768 til 1199 px: smalere navigasjon eller et tilgjengelig navigasjonspanel og 2 kolonner når plassen tillater det. Mobil under 768 px: én kolonne, handlingsorientert bunnnavigasjon med Today, Inbox, Areas, Progress og More, der alt har tekstetiketter. Ingen horisontal rulling på vanlige skjermbilder. Dataintensive tabeller kan bruke en tydelig responsiv alternativ visning eller et avgrenset scrollområde med etiketter.

Bruk container bredde, faste kolonnerytmer og felles PageHeader. Today har ekstra luft rundt Daily Mission, et synlig «Start focus» valg og Quick Add innen tommelrekkevidde. Overview har et rolig første sammendrag, deretter forklarte grafer. Områdesider bruker samme tittel, intro, hovedhandling, statusrad og historikkmønster. Et tomt område viser neste naturlige første steg, ikke dekorativt fiktivt innhold.

## Komponentkontrakter

| Komponent | Varianter og regler |
| --- | --- |
| Button | primary, secondary, quiet, danger; small og regular. Én tydelig primærhandling per panel. Loading hindrer dobbeltklikk og bevarer etikettbredde |
| Input | label, hint, error og obligatorisk markering i fast rekkefølge. Synlig ramme, fokus og inline validering; bruk egnet inputmode for tall og dato |
| Card | base og featured. Base har samme radius, ramme og padding overalt; featured brukes sparsomt til Mission og hovedresultat |
| Navigation | Samme ikon, tekst, rekkefølge og aktivtilstand på alle bredder; gruppering Today, Areas, Progress, Archive senere |
| Badge | status, area og rank; informasjonsbrikker er diskrete og semantiske; rank markeres med typografi og sparsom farge, ingen konfetti |
| ProgressBar | label, tall, maksimaltall og forklaring. XP og Goal progress har tydelig forskjellige etiketter |
| Chart | Recharts med delte akser, tooltip, format og farger; alltid tekstlig oppsummering, synlig tidsrom og tom datatilstand |
| Table | høyrejusterte tall, lesbare datoer, tydelig kolonneoverskrift, sorteringsstatus og mobilalternativ der nødvendig |
| Dialog | brukes kun når handlingen krever fokus eller bekreftelse; Escape lukker, fokus fanges og returneres, destruktiv handling navngis |
| Toast | kort bekreftelse etter vedvarende endring; feil har også varig synlig tekst ved tilhørende felt eller panel |

Ingen komponent skal ha hemmelige egne fargeverdier, knappestørrelser eller radier. Del visuelle komponenter, men ikke bygg ett generisk kort som prøver å representere alle livsområders ulike data. Bruk riktige HTML elementer og konsistent tom, loading, success og error struktur.

## Area character

Life Areas deler layout og komponenter, men kan få én dempet aksentfarge, illustrasjon eller bilde når området har et reelt visuelt innhold. Fitness kan ha skoggrønn, University dempet blekkblå, Career steingrå, Finance mørk oliven, Home varm salvie, Style taupe, Food dempet terrakotta, Creative plomme, Travel sjøblå, Personal dyp sand. Dette er kategorisignaler, ikke ti nye fargesystemer. Bruk aksenten bare i ikonbakgrunn, liten markør eller én dataserie. Primærknapper og semantiske statusfarger forblir identiske. Dersom aksentfargen ikke har tilstrekkelig kontrast, bruk den som dekor og behold standard tekstfarge.

## Tilstander og bevegelse

Skeleton brukes kort på kjente layoutformer; tomme data får forklaring og én opprett handling; feil viser hva brukeren kan prøve igjen uten å miste utfylte data. Ved dårlig nett vises en tydelig tilstand, aldri falsk vellykket synk. Fokusøkten viser lagret start og serverbasert klokketid; pauset status må være entydig.

Overganger varer vanligvis 120–220 ms og viser tilstandsendring eller hierarki. Respekter prefers-reduced-motion. Unngå parallax, vedvarende glød, aggressive gradienter, store glassflater og gamification animasjoner som forstyrrer. Fullføring får en rolig bekreftelse, presis XP tilbakemelding og oppdatert progress; skjermleser får tilsvarende melding. Tastatur, 44 px omtrentlige trykkmål der relevant, lesbar fokusmarkering, semantiske overskrifter og testet kontrast inngår i Phase 7.
