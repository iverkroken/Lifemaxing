# LIFEMAXING design system

## Current authority - artwork product redesign, 15 September 2026

### Selected additions — 20–21 September 2026

Life Area details extend the same visual language: a bounded original image beside the area title, a shared wrapping area-navigation row, lightweight overview actions/counts and the existing scoped lists. Main card surfaces link to their overview; explicit actions and layout editing remain independently operable. Scoped lists suppress competing global title/artwork and the editable all-area filter. Finance Subscriptions stays within the area context with a clear return to overview. The single application top navigation remains authoritative.

Account pages share a split composition using the original `no risk no story.jpg` in its full landscape framing, a bounded form and the existing Joint mark, language/theme controls and tokens. On small screens the form leads and framed artwork follows. Login/signup/recovery/verification transitions are ordinary links; provider buttons are disabled with truthful copy until configured. Security settings owns password change. No new visual identity, floating-card framework or secondary app navbar is introduced.

Today places a persisted planning-mode selector above the daily workspace. Simple prioritizes one list, Focused Day keeps the main mission, 3:3:3 adds a concise explanatory structure and Custom preserves free-form work. All use the same task/habit controls; switching never removes data. Search extends the same top-navigation dialog with immediate pages/actions and ranked owned results, keyboard arrows/Enter/Escape, loading/error/no-match copy.

Finance subscriptions uses open editorial rows, currency-separated monthly/yearly estimates, upcoming dates and category summaries. Shared dialogs/forms handle creation/editing. Cancellation is labelled as manual tracking and never implies cancellation with the vendor. Desktop columns reflow into one mobile reading order; no fictitious bank connection, default browser-style card system or finance-specific palette is added.

The approved full redesign replaces the previous mineral, burgundy and sidebar presentation. This section is current; the Nordic Atelier contract below preserves approval history. Product, API and data rules remain unchanged.

### Shared system

Inter 400/500/600 provides display (44-72 px), page titles (32-48 px), section titles (24 px), body (16 px) and supporting text (14 px). The shared spacing scale uses 4 px increments. Content uses a 1600 px maximum with responsive 16-40 px gutters; forms and descriptive text retain narrower measures.

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | #F7F4ED | #101826 |
| Surface | #FFFCF7 | #182335 |
| Elevated surface | #FFFFFF | #223047 |
| Primary text | #172133 | #F5F1E8 |
| Supporting text | #566173 | #B5BECC |
| Action | #3158C8 | #3158C8 |
| Earned progression | #806126 | #CFB579 |

Success remains green, warning amber and danger red. Components consume semantic tokens from client/src/shared/styles/tokens.css. Focus uses the dark semantic palette in either account theme, including hover and feedback surfaces.

### Navigation and interaction

The fixed header is 72 px on desktop and 64 px below 1200 px. Joint and the uppercase wordmark sit left; Today, Plan, Life Areas, Progress and Focus occupy the desktop center; Search and Menu are the only right-side actions.

Plan opens Tasks and exposes Tasks/Goals/Habits/Inbox contextual navigation. Progress exposes Progress/Activity/Rewards. Smaller screens use the closed right drawer for full navigation. The permanent sidebar and mobile dock are removed. Search adapts the existing command menu, preserving keyboard shortcuts and contextual creation. Native dialogs, task panels, focus return and browser history retain their behavior.

### Artwork and page composition

Original PNGs in client/public/images are runtime assets and must retain their bytes and names. Backround.png is the supplied filename; CSS rotates it 90 degrees counterclockwise. Today fills its first 100svh with this artwork, then transitions into the daily workspace. Current-day hero data remains independent of the selected planning date. Its task/habit summary, labelled mission and existing Focus entry stay in normal document flow. The fixed header becomes opaque when the start of the hero text reaches it, measured against the actual header height; no scroll scaling or pinned text is used. The document owns anchor clearance so it is not doubled at the workspace.

Goals gives the existing artwork more of the desktop composition. Progress and Rewards use larger responsive image sections with shared 12-16 px media corners. Full-bleed Today and Focus backgrounds remain immersive. Life Areas groups its counts in one compact row, bringing the unchanged image cards and their controls into the initial viewport.

Shared form fields use 16 px text and retain native labels, validation and keyboard behavior. Supporting browsers use CSS `base-select` to give native select pickers the application surface, spacing, selected state and elevation; other browsers retain native pickers. Date calendars and time-zone suggestions remain platform controls. Dialogs and task menus reuse the existing surfaces and focus rules. No custom calendar or JavaScript select framework is added.

Goals uses Gods plan.png; Finance and Style use Money.png and Rolex.png; Progress uses Muhammed ali.png; Rewards uses Tiger.png; Focus uses Odessey.png. The September 16 integration assigns Tutto passo.png to Creative (existing PNG explicitly approved). Food uses cooking.jpg, Travel Polo 1.jpg, Career Work.jpg, Personal personal.jpg, Home toscana.jpg and Fitness Ronaldo.jpg. These seven assignments are locked. The subsequent approved visual follow-up assigns Tesla.jpg to University. Life Area media is 16rem tall on desktop/tablet and 14rem below 640px; the 3/2/1 grid and other mappings remain. areaPresentation.js defines image source, position and wide-card metadata by stable area key, independent of display names; portrait focal positions preserve subjects within existing card dimensions. Text and controls remain usable if artwork cannot load. No production 3D runtime is introduced.

Tasks and Inbox share integrated filters and paginated rows. Goals and Habits preserve distinct layouts and real history. Life Areas retains a responsive 3/2/1 grid. From 1200px, Personal spans the full three-column width with equal image/content halves and a 20rem minimum height; below that it retains the standard stacked card. User sorting and image metadata remain unchanged. Three secondary link controls show localized Tasks/Goals/Habits labels above live counts, without arrows, and navigate through existing areaId filters. Precise-pointer hover and visible keyboard focus give cards a 1% scale, 2px lift, soft depth and area-tone glow. Reduced motion retains static feedback; opening an editor disables the parent effect. Progress integrates rank, XP and lifetime totals; Activity presents dated history; Rewards groups only the results returned for the current page. Focus emphasizes the persisted active session. Settings uses contextual navigation and content columns from 768 px, with a mobile category chooser and back action. Its previews depict the actual top-navigation system. Login, forms, empty states and dialogs share the foundation.

### Identity, accessibility and delivery

Joint retains exactly the two approved SVG paths. Navigation uses a 20 px mark, 14 px Inter Medium uppercase wordmark and 12 px gap. Phosphor Bold uses 35 pinned local SVG paths with MIT provenance and the existing semantic Icon API.

Standard and WebKit scrollbar rules hide tracks, thumbs and gutters without disabling native document or container scrolling. Only an open modal temporarily locks background scrolling. Keyboard focus, wheel, touch, reduced motion and forced-color support remain. All existing language, time-zone, theme and density preferences remain server-backed.

Completion requires all-route visual inspection and current browser/business regression evidence. See IMPLEMENTATION_STATUS.md for results.

## Historical Nordic Atelier contract


Nordic Atelier is the approved canonical direction, with the locked Joint production identity (14 September 2026). This foundation alignment follows the preserved P2 and later refinement baseline. Mineral light/dark surfaces, ruby actions, green completion and bronze earned progression replace the graphite/stone palette. Existing page behavior and compositions survive; Experience P3/P4 and complete Today redesign remain separate.

## Foundations

`client/src/shared/styles/tokens.css` is the source of truth. Components use semantic CSS custom properties through CSS Modules. No new styling framework, UI package, icon dependency or global state library was introduced.

| Role / CSS token suffix (`--color-`) | Light | Dark |
| --- | --- | --- |
| Canvas / canvas | #F6F5F1 | #181E22 |
| Navigation / sidebar | #E8ECEA | #12181C |
| Standard surface / surface, mission | #FFFEFA | #232B30 |
| Elevated / raised | #FFFFFF | #2D373D |
| Interactive / interactive, surface-muted | #EDF0ED | #263137 |
| Neutral hover / hover | #D9E0DD | #34434A |
| Selected / selected, accent-soft | #DCE5E5 | #303E47 |
| Selected hover / selected-hover | #D9E0DD | #34434A |
| Primary text / text | #202A30 | #F3F4F0 |
| Secondary text / text-secondary | #566269 | #B3BEC3 |
| Metadata / text-muted | #566269 | #B3BEC3 |
| Separator / border | #D8DEDD | #3C484F |
| Strong separator / border-strong | #718085 | #819196 |
| Input/control boundary / control-border | #718085 | #819196 |
| Ruby text and icons / accent, brand-ruby | #963D55 | #E8A2B6 |
| Primary fill / action | #963D55 | #A5415C |
| Primary hover / action-hover | #7D2E44 | #B54864 |
| Primary pressed / action-pressed | #692237 | #893247 |
| Primary boundary / action-border | #963D55 | #E8A2B6 |
| Text on primary / on-accent | #FFFFFF | #FFFFFF |
| Earned bronze / brand-bronze | #795B35 | #D0AE75 |
| Completion green / success | #406A5B | #9BBDB0 |
| Forest tint / success-soft | #E5EDE7 | #1C2C24 |
| Text on forest / on-success | #FFFFFF | #181E22 |
| Focus/information blue / info | #3D6090 | #9EBBF2 |
| Blue tint / info-soft | #E4EBF1 | #1C2934 |
| Warning / warning | #805718 | #D7AE68 |
| Warning tint / warning-soft | #F3EADB | #30281B |
| Danger text/boundary / danger, danger-border | #B4232C | #FF9E98 |
| Destructive fill / danger-fill | #B4232C | #B4232C |
| Destructive hover / danger-hover | #981D26 | #981D26 |
| Destructive tint / danger-soft | #F8E5E3 | #342120 |
| Text on destructive / on-danger | #FFFFFF | #FFFFFF |
| Keyboard focus / focus | #355ACB | #A4C3FF |

Ruby text is intentionally lighter than a ruby button in dark mode: one color cannot satisfy both small-text contrast on mineral surfaces and white text on a filled button. Light control borders, green and bronze use the approved production contrast adjustments; darker text roles preserve readable small labels. Danger remains separately named and colored. Standard cards use surface contrast without outlines; lists stay directly on canvas. Borders identify form fields and selected controls, separate rows and delimit panels. Raised dialogs and menus use the shared restrained shadow, not every card.

The four stable area families share exactly one component and typography system. University/career/travel use blue (#3D6090 / #9EBBF2); finance/home/food use sand (#665C4D / #C1B49B); style/creative use rose (#795468 / #D1AFBE); fitness/personal use sage (#406A5B / #9BBDB0). These are area-mark tokens on neutral surfaces, not full-page themes. Optional family tints are blue #E4EBF1 / #1C2934, sand #EDE7DC / #2D2922, rose #EEE5EB / #2E252E and sage #E5EDE7 / #1C2C24. Visible labels and stable icons accompany category colors. The six existing rank materials and level rules remain unchanged.

Locally bundled Inter 400/500/600 remains the single type family. Work page titles are 32 px (28 mobile); editorial titles on Today, Areas, Goals and Progress are 40 px (32 mobile). Page headings use weight 500 and line-height 1.15. Section titles are 20/500/1.3, subsections 18/500/1.3, body 16/400/1.5, task-title text 16/500, controls 14/500/1.4, secondary text 14/400/1.5 and short labels 12/500/1.4. Shared weight and line-height tokens keep the hierarchy consistent; specialized existing timers and page compositions retain their scales. Long copy stays within a readable measure. Tabular numerals are local to progress, dates and timers, not all prose. The Focus timer is 72 px, 48 on mobile. Font sizes remain unchanged in compact mode. Inter's SIL OFL is distributed at /licenses/INTER-OFL.txt.

Spacing follows 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 and 96 px. Normal rows use 12 px vertical padding and compact rows 8; section gaps are 32/24. Controls remain at least 44 px high. Controls have 8 px corners, normal cards 12, featured mission/dialogs 16, tiny status labels 4; pills are reserved for genuinely compact badges. Motion uses 160 ms and respects reduced motion. Joint is flat-vector first: the exact two paths in BrandMark.jsx use a 32-unit viewBox and optional single fill. No added facets, cuts, arrows, letters, gradients or decorative geometry. Black, white and currentColor are supported. Shell and Login use uppercase LIFEMAXING, 20 px mark, 14 px Inter Medium, 12 px gap and 0.035em tracking. The meaning is separate parts becoming one stronger coherent system, representing wholeness, integration and continuous personal transformation. Today reuses the mark at its existing dimensions without a new composition.

## Layout and navigation

Desktop navigation begins at 1200 CSS px with a 14.5 rem (232 px) rail, 40/20/24 px top/horizontal/bottom rail padding and 32 px content inset. The workspace container is at most 1344 px including 32 px insets (1280 px usable). Task lists stop at 1040 px; Focus at 720 px; forms and long text remain narrower. The rail scrolls on short screens or with enlarged text. Sidebar, raised task panels and dialogs use native thin scrollbars with stable gutters; track follows the surface. Thumb colors are #73827E light / #899A9E dark. The 8 px WebKit fallback is conditional on missing standard support. Forced colors restores native colors/width and system focus/selection cues. Wheel, touch and keyboard scrolling remain native. The progression group can be collapsed with a native keyboard-accessible disclosure; this is local navigation state, not a new account preference. Below 1200 px, a wrapping header and bottom navigation provide the same destinations through Today, Tasks, Capture, Habits and More. Tablet navigation is centered. Inbox remains visible in the header. Bottom clearance and safe-area padding keep final controls reachable.

Today is home. Tasks and Inbox are sibling views. Progress, Activity and Rewards retain direct addresses and share internal navigation. Focus has a direct entry and a truthful running/paused return state. During Focus, the workspace navigation is hidden and a clear return to Today remains available. Settings and sign-out controls sit apart from frequent work actions.

Ctrl/Cmd+K and a visible control open the command dialog; the trigger shows Ctrl K or ⌘ K for the platform. It searches implemented actions and destinations only. It shares task/habit/goal creation and navigation with normal controls. ArrowDown/ArrowUp from the input select the first/last result, arrows cycle result buttons, Enter runs the focused result, and Escape closes with focus return. No results has an explicit status. Text fields, contenteditable, composition, existing dialogs and Alt/Shift-modified shortcuts retain their own keyboard behavior.

Task list filters and pagination live in the URL. Clicking a task row on desktop retains the list beside a non-modal detail panel. Direct navigation, refresh and small screens render the complete detail route. Both views use the same form and API mutations. Closing the panel restores the originating task focus and list context; history navigation retains recorded scroll positions in memory. The side panel does not trap Tab or mark the background inert.

## Preserved P2 page compositions

These compositions share the foundation while preserving each page's actual data and next action.

| Screen | Composition and real behavior |
| --- | --- |
| Today | Compact selected-day status; one strongest Mission surface; planned task rows; due/earlier work; disclosed changed/completed plans; habits immediately after the mission on mobile and beside it on wide layouts, followed by inbox and actual bronze XP. New accounts, existing empty days, working days and completed days are distinct. |
| Life Areas | Responsive cards sized by available card width, original per-area SVG motifs and icons, conceptual descriptions and grouped task/goal/habit links. Counts come from one owner-scoped aggregate endpoint. Missing counts remain a dash. Editing name and activation opens a secondary dialog; Customize layout handles order separately; colored banner fields and repeated indices are removed. |
| Tasks/Inbox | Open completion/title rows with named area marks, neutral high-priority flags and blue Focus links. Routine commitment metadata is omitted on Today; cancel-plan is disclosed in a keyboard-accessible row menu. Search, status and area controls wrap. Filter reset, true empty states, archival and reopening remain available. |
| Quick Add | One shared dialog. Title alone can go to Inbox. The contextual date is visible and editable; choosing the day creates a real commitment. Inbox submission always stays undated. Optional detail/size/priority fields are disclosed. Failed input is retained. |
| Goals | Open editorial rows show state, area, target and latest recorded update. Active/paused badges are neutral; actual completion uses forest. Numeric progress uses the actual baseline, direction and unit. Text may exceed 100% or regress; only the graphical meter is clamped. Qualitative goals use notes. Details put recording and history before configuration. |
| Habits | Addressable For today and Your routines views separate daily logging/week rhythm from the editable library. A bounded owner-scoped week query supplies seven actual schedule/log states. Completed, corrected, planned, rest, flexible and future are distinct. WeeklyCount never invents mandatory weekdays. Mobile uses a visible symbol legend and full accessible per-day text. Schedule history and reversals remain available. |
| Focus | One quiet open layout, disclosed selected task context, readable server-based elapsed timer and explicit pause/resume/finish controls. Task completion and session-only completion are separate. Stop/cancel remain secondary; no points are invented from time. |
| Progress | An open bronze XP summary, existing level, rank, net XP and next threshold, original emblems for all six existing ranks, labelled lifetime totals and recent activity. Rules and the immutable ledger are disclosed rather than dominating the page. |
| Activity | Events grouped by the account's local calendar date, meaningful type labels/icons, timestamps, filters and pagination. Historical summaries are retained; non-English interfaces disclose them explicitly as original English text. |
| Rewards | Cards distinguish locked, ready and claimed states, with level requirement, actual remaining levels, claim timestamp and archive access. Eligible rewards sort first within the returned page; locked rewards show requirements without a disabled Claim button. No spending, shop or payment behavior. |
| Settings | Account, language/time, appearance and sessions/security. Open sections with addressable internal navigation; mobile presents a section chooser and a back control; separate UI language, regional format and searchable IANA time zone; retained unsaved regional draft; honest appearance saving/retry status. No fabricated account-edit or device-list capabilities. |
| Login | Bounded form, original desktop illustration and shared identity, public language/theme choices, autofill, paste, password visibility, Remember Me, localized validation and account-neutral failures. |

Area artwork and rank emblems are original local SVG code with decorative accessibility semantics and visible names alongside. The four subtle area accent families affect artwork and named area marks; primary buttons and semantic states remain shared. No external product assets, hotlinks or new image data fields are used.

## Shared controls and states

`Button` provides ruby primary, neutral bordered secondary, ruby text quiet/tertiary, neutral ghost, filled destructive, quiet destructive and forest success variants. Hover/pressed states change semantic colors; pending and disabled states retain readable labels without fading the whole control. `StatusBadge` separates neutral, success, information and earned roles; `AreaLabel` provides one consistent category treatment. `Input` and `Select` retain visible labels, hints, associated errors and appropriate native controls. `PageHeader`, `EmptyState`, `QueryFeedback` and `ActionFeedback` provide consistent hierarchy and feedback. The existing native `Dialog` controls actual modal behavior, initial focus, Tab containment, Escape and focus restoration. Quick Capture becomes a bottom sheet on mobile; ordinary confirmation dialogs remain centered.

Sign out and sign out everywhere are separate named red danger actions using the same confirmation. The shell's smaller sign-out control sits below account/settings, physically separated from work actions. Initial focus is on staying signed in. Pending operations cannot be dismissed; a synchronous submission guard also prevents two rapid clicks before React renders the pending state. Cancel/Escape send no request. A transport failure checks session status before treating logout as complete; failure retains the dialog and retry, and private query state is cleared only after success or confirmed 401. The existing one-minute security-stamp revocation explanation is preserved.

Errors are localized from stable codes/HTTP categories, never by matching English server prose. Raw diagnostics are not shown. Forms retain failed values. Reads distinguish loading, error and real empty results. Actual XP feedback is one inline status from the server response; retries retain the existing ClientActionId rules. Timers are not live-announced every second.

## Language, themes and density

The existing language module and context are extended with a reviewed four-column catalog. English, Norwegian Bokmål, Swedish and Danish cover interface labels, help, forms, validation, errors, menus, statuses and accessible names. Native language names are used in selectors. Document language, authenticated page titles and the Login title follow UI language. Intl handles regional dates/numbers, weekday names and applicable plurals. Complete message templates replace assembled translated sentence fragments.

Own task/goal/habit titles, notes and renamed areas are preserved. Standard area names are localized through the stable area key only while the stored name equals its documented default. Immutable activity summaries are never rewritten in the database. English fallback remains available for unknown keys/locales.

`UiLanguage`, `Theme` and `Density` are additive owner settings. The preference migration derives the initial language from the existing Locale, retaining that Locale and historical time zones. PATCH changes only supplied fields. Authenticated settings are authoritative after sign-in. A synchronous prepaint script and an allowlisted local display memory provide public appearance without storing private data or credentials. Storage failures do not break rendering. System theme listens for operating-system changes.

Appearance previews adapt the approved Atelier mini-rail/page/Mission illustration using the shared Joint and fixed palette aliases. Light and dark previews stay truthful regardless of the active theme; System combines light rail and dark page. They are decorative inside native radio labels. Real mutation, immediate preview, pending disablement, failed values, same-payload retry, owner cache and successful preview clearing stay in AppearanceSettings/LanguageProvider.

Normal and compact densities share font sizes and semantics. `--row-padding` (12/8 px) and `--section-gap` (32/24 px) reduce spacing. Shared controls retain the 44 px minimum in both densities, including fine-pointer/hybrid devices. This is the project's touch target; it is not a claim that WCAG requires 44 px for every inline link. Display memory remains an allowlist of theme/density/UI language only; settings/preview are scoped to the current owner and server settings take authority after authentication. No account ID, session or private content was added to browser storage.

## Resource inventory

| Resource | Origin / format / use | Rights / delivery |
| --- | --- | --- |
| `client/src/shared/ui/BrandMark.jsx` | Original locked Joint flat SVG, viewBox 32 x 32, default 32 px; shell/Login 20 px with uppercase lockup | Project source, no runtime dependency; exact geometry approved from native-size proof |
| `client/src/shared/ui/Icon.jsx` | Existing semantic API adapted to Phosphor Regular, filled 256-unit paths, currentColor, default20 px, areas fallback | Pinned source hashes in PHOSPHOR_SOURCE.md; MIT at /licenses/PHOSPHOR-MIT.txt; no runtime fetching/dependency |
| `@fontsource/inter` 5.3.0 | Existing local Latin/Latin Extended 400/500/600 WOFF2 plus existing WOFF fallbacks; six WOFF2 files total 179,672 bytes | SIL OFL 1.1, full 4,477-byte license in `client/public/licenses/INTER-OFL.txt`; weights/subsets unchanged |
| P1 compass/area PNG masters | Maintained in `client/design-reference/assets`, exact sizes and provenance in its ASSETS.md | Not imported into the production shell; P3/P4 need the separately specified final resources |

## Verification and references

P2's requirement/status record is in `EXPERIENCE_EVOLUTION_PLAN.md` and `IMPLEMENTATION_STATUS.md`. Run `powershell -NoProfile -ExecutionPolicy Bypass -File tests/browser/run-isolated.ps1 -SignatureShell` after the documented Release API/frontend builds; append `-BrowserEngine firefox` for Firefox. This uses the actual built application with isolated PostgreSQL, not the P1 entry. The existing runner without flags covers Phase 1–3/auth/restarts. Its test ports must be free; it never stops an unknown process.

Pass a unique `-ArtifactRoot artifacts/nordic-foundation/<run>` to preserve prior evidence; signature and redesign captures are separated by engine. `-Headed -BrowserEngine firefox` allows native scrollbar inspection. Historical graphite captures remain reference evidence. Current verification results are recorded in IMPLEMENTATION_STATUS. Viewport emulation is not physical-device testing or full WCAG certification. P3 model, renderer and GPU performance are outside this alignment.

The design uses principles observed in the supplied official product presentations: Linear's quieter navigation, Things' action rows, Craft's framed entry points, Sunsama's concentrated focus, Raycast's bounded action search and Discord's settings hierarchy. Superlist, Cosmos and Lovable references informed the distinction between work surfaces and expressive content. No layouts or assets were copied, and no logged-in use of these external products is claimed.

Accessibility behavior is guided by [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [WAI dialog guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) and [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). Formatting follows [Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl); performance reports distinguish local measurements from [Web Vitals field data](https://web.dev/articles/vitals).

### Life Areas layout editing

Customize layout is a secondary PageHeader action. Editing replaces navigation links and metadata editing with drag handles and earlier/later buttons. A shared toolbar explains the draft and offers Save layout/Cancel; errors retain the draft and movement is announced. Controls use existing theme, focus, touch-target and reduced-motion rules. Card hover transforms are suppressed while editing. Personal keeps its wide presentation from shared metadata, and can occupy any complete desktop row boundary (0/3/6/9 regular cards). Ordinary cards can be reordered without changing that boundary; tablet/mobile keep the same sequence in the existing responsive grid. The default order and image crops remain unchanged.

### Life Areas filters and whole-card movement

The Filter disclosure uses shared selects for saved/alphabetical/count order, active state and content presence. Count semantics match existing card totals; missing counts never imply empty. View choices live in the URL and do not persist an order. Automatic sorting presents Personal as a standard card; saved layout retains its wide presentation. Entering Customize layout clears view filters and restores all areas. In edit mode the entire non-interactive card surface initiates dragging; touch requires a hold and quick swipes scroll. Move buttons remain independent keyboard/touch alternatives.
