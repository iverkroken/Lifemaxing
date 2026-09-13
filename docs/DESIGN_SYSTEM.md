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

Typografi: Inter, lokalt levert hvis mulig, for UI og brødtekst; system sans som robust fallback. Newsreader kan brukes svært sparsomt til redaksjonelle overskrifter, refleksjoner og arkiv, ikke til felter og små datapunkter. Brødtekst 16 px med linjehøyde omkring 1,5; sekundær tekst minst 14 px; mikrotekst 12 px bare for uviktig metadata. Typografisk skala: 12, 14, 16, 18, 20, 24, 32, 36 px. Bruk tabellariske tall for klokke, penger, KPI og datatabeller.

Spacing bygger på 4 px grunnsteg: 4, 8, 12, 16, 24, 32, 48, 64, 96 px. Bruk 8/12 mellom ikon og tekst, 16/24 innen kort, 32/48 mellom innholdsgrupper, 64/96 mellom store seksjoner. Radius: 8 px felt og små kontroller, 12 px knapper, 16 px vanlige kort, 24 px større fremhevet modul, 999 px for kompakte chips. Bruk lette rammer og få skygger; maksimal én skygge på forhøyet dialog eller flytende element.

## Layout

Desktop fra 1200 px: en rolig, fast venstrenavigasjon på 224 px og venstrejustert arbeidsflate opptil 1600 px inkludert sidepadding, med 32 px avstand fra sidebaren. Today bruker en bred hovedkolonne for Mission og forpliktelser og en smalere kolonne for dagens vaner og faktisk progresjon. Nettbrett 768–1199 px får toppstripe, sentrert bunnnavigasjon og to innholdskolonner der det er nyttig. Mobil under 768 px bruker én kolonne og bunnnavigasjon med Today, Tasks, Capture, Goals og More. More gir tilgang til alle implementerte sider, inkludert Habits, Life Areas, Inbox og Settings. Inbox er også direkte tilgjengelig i toppstripen. Alle navigasjonsvalg har tekstetiketter. Bunnpadding holder siste handling fri av navigasjonen og telefonens safe area. Ingen horisontal rulling på vanlige skjermbilder.

Bruk containerbredde, faste kolonnerytmer og felles PageHeader. Today har ekstra luft rundt Daily Mission og Quick Add innen tommelrekkevidde. Focus, Progress og andre senere funksjoner skal ikke vises før de er implementert. Områdesider bruker samme tittel, intro og handlinger. Et tomt område viser neste naturlige første steg, ikke dekorativt fiktivt innhold. Foretrekk åpne seksjoner med typografisk hierarki og lette skillelinjer fremfor like kort rundt alt.

## Komponentkontrakter

| Komponent | Varianter og regler |
| --- | --- |
| Button | primary, secondary, quiet, danger; small og regular. Én tydelig primærhandling per panel. Loading hindrer dobbeltklikk og bevarer etikettbredde |
| Input | label, hint, error og obligatorisk markering i fast rekkefølge. Synlig ramme, fokus og inline validering; bruk egnet inputmode for tall og dato |
| Card | base og featured. Base har samme radius, ramme og padding overalt; featured brukes sparsomt til Mission og hovedresultat |
| Navigation | Samme destinasjonsnavn, strekikoner og aktivtilstand på alle bredder; fysisk plassering tilpasses desktop, nettbrett og mobil. Settings og konto er sekundære |
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

## Implemented product experience — UX pass, September 2026

This section describes the implemented Phase 2 experience. Later roadmap references above do not authorize placeholder features.

- **Hierarchy:** Today is home. Desktop primary navigation is Today, Tasks, Goals, Habits and Life Areas. Inbox is a visible capture/processing destination and a sibling task view; Settings/account sit at the foot of the sidebar. Mobile and tablet use the dock and a keyboard-accessible More dialog.
- **Today:** The selected server-local date is explicit. Daily Mission is the strongest composition, using a restrained accent surface. The mission is not repeated in the task list. Intentional commitments, earlier/due work, and completed/cancelled/archived plans have separate groups. Changed plans remain available in a disclosure. No fictional hourly timeline is shown because Phase 2 stores calendar dates, not appointments.
- **Capture:** Quick Add uses one shell dialog, opened from the shell, Today and Tasks/Inbox. Focus retains its distraction-free shell. Title-only capture goes to Inbox; choosing a day makes a real commitment. Enter submits, failed requests preserve text, successful captures reset the field for the next thought.
- **Tasks:** Compact rows place completion first, title next, and meaningful metadata below. High priority, area, due/planned dates and estimated minutes help scanning. Completion buttons have task-specific accessible names and 44 px targets. Task detail separates the action/context from planning fields; archival is secondary.
- **Habits:** Daily logging is the primary experience. The routine library provides access to details and history. Create/edit/schedule forms open deliberately in dialogs. Schedule periods and reversed logs remain visible and unchanged.
- **Goals:** Lists show actual latest progress, current state and Life Area. Measured progress is the recorded value relative to baseline and target; percentages can regress or exceed 100, while the visual meter is clamped. No entry means “Starting point”, not fabricated recorded progress. Qualitative goals use their latest note. Completion stays manual. Detail places history and recording ahead of configuration. Latest-entry queries are bounded to the visible 12-goal page using existing endpoints.
- **Life Areas:** Open, editorial domain tiles with short conceptual descriptions and links to existing area-filtered Tasks, Goals and Habits. Display name, order and active state are behind Edit Life Area. No specialized modules are implied or implemented.
- **Settings:** A quiet Time & place section explains time zone effects beside the existing regional form. Settings is reachable on all widths without competing with execution.
- **Shared components:** Existing Button/Input/Select/PageHeader are retained. Input supports multiline text. Small shared Icon, Dialog, EmptyState and TodayHabits components cover repeated needs. GoalProgress is a feature component. Native dialogs provide modal semantics, Escape dismissal and focus restoration, with explicit initial field focus and Tab containment. No external icon/UI library was added; the small stroke icon set uses currentColor and decorative accessibility semantics.
- **Visual tokens:** Existing colors, spacing and radii remain. Page titles use --text-page-title (36 px, 32 px on mobile); section titles use --text-section-title (20 px). Surface boxes are reserved for the mission, focused data-entry panels and dialogs. Added semantic scrim and dialog-shadow tokens, a 224 px sidebar token, and an 80 px dock allowance. Hover/focus feedback uses the existing 160 ms motion token, reduced to zero for reduced-motion preferences. The skip link stays hidden until focused and route navigation focuses the main region.

## Phase 3 integration

Today remains home. A small progression meter sits alongside daily routines, below the primary mission/commitments hierarchy. An unfinished focus session has a return link on Today. Task rows, task details and the mission provide direct Focus entry points.

Desktop adds a secondary Progress & execution disclosure with Focus, Progress, Activity and Rewards. Mobile/tablet expose these through the existing More dialog; the primary dock remains unchanged. Focus deliberately hides the workspace navigation and capture controls, retains a clear return to Today, and presents one task/context, a tabular server-based timer and explicit pause/resume/finish controls. End/cancel choices are secondary. Focus has no XP meter or unrelated lists competing with execution.

Progress uses real level/rank/XP, a native accessible progress element, simple lifetime counts and recent activity. Activity is chronological readable text. Rewards use the existing open tile layout, show locked/ready/claimed states in words, and open creation/editing in the shared accessible dialog. Claim dates remain visible, including archived rewards. No reward currency or checkout pattern.

Completion feedback is an inline status announcement with the actual signed XP change and level increase when one occurs. Zero-point pause/claim operations do not announce meaningless XP. No confetti, forced level-up modal, new palette, global state library or component library was added. Existing focus styles, reduced-motion rules, typography and spacing tokens apply.

## Prompt B reference pages — approved

The implemented reference scope is the shared shell, Today and Login. Other pages retain their compositions; Tasks/Inbox, Habits and Goals only route their creation buttons into the shared dialog. The owner has now approved these reference pages for Prompt C.

- Keep the existing muted green palette, neutral canvas and white work surfaces. Desktop content starts 32 px after the 224 px sidebar instead of centering a narrow workspace. Mobile uses 24 px page padding. Login remains a readable 448 px maximum form.
- Today puts the date above its 32/36 px title. Daily Mission offers Start focus and Complete mission with actual task context. The work/support ratio is 2:1 on desktop and 1.6:1 on tablet. Container-based reflow also stacks columns when enlarged text leaves insufficient room; viewport width alone is not enough.
- Planned tasks remain scannable rows. Earlier/due work is shown only when present, and historical plans remain accessible. Habits use named 44 px completion toggles and explicit completion text. Progress is a secondary real-data meter with loading, failure and retry states; no placeholder totals or invented timeline.
- An empty new account has one compact start section for a first task, habit and goal. Existing records, including archives and activity, distinguish a new account from an empty day. A completed day has its own confirmation, including habit-only days. Failed lookups never imply no data.
- All task capture triggers open one dialog with one heading and focus the title. Title alone is sufficient. More details discloses optional description, size and priority. Today supplies the selected day; Inbox capture supplies no day. Habit/goal creation uses the existing forms within that same shell dialog. Existing full task-edit/create routes remain available.
- Login uses direct English action text and one form surface. Password reveal, autofill, paste, explicit RememberMe and all Prompt A failure/session semantics remain intact. No pretend recovery link.
- Preserve focus visibility, native dialog Escape/Tab handling and focus return, reduced-motion rules, normal scrolling and touch targets. Review real screenshots as well as overflow assertions. Long mobile days remain scrollable rather than hiding tasks to shorten the page.

Local before/after references live under ignored artifacts/reference-before and artifacts/reference-after; artifacts/reference-review.html compares all four widths and the empty, small and busy day states. These contain isolated fictional data and are not repository assets.