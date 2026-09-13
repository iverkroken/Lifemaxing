# LIFEMAXING design system

This document describes the implemented Phase 1–3 interface following the full September 2026 redesign. It supersedes the earlier Prompt B/C reference-page restrictions and partial-language descriptions. The visual direction is a personal workspace: near-neutral canvas, precise working lists, emerald actions and original geometric artwork. Today supports execution; Progress supports review. No additional roadmap phase is implied.

## Foundations

`client/src/shared/styles/tokens.css` is the source of truth. Components use semantic CSS custom properties through CSS Modules. No new styling framework, UI package, icon dependency or global state library was introduced.

| Role | CSS token suffix (`--color-`) | Light | Dark |
| --- | --- | --- | --- |
| Canvas | canvas | #F7F8FA | #171C1A |
| Work surface | surface | #FFFFFF | #202723 |
| Supporting surface | surface-muted | #EFF1F3 | #29332E |
| Raised surface | raised | #FFFFFF | #29332E |
| Primary text | text | #202A27 | #EBF0ED |
| Supporting text | text-muted | #58645F | #ACBAB2 |
| Separator | border | #DCE2DE | #3E4A43 |
| Input boundary | control-border | #87958E | #798C80 |
| Primary action | accent | #176B4B | #85D8AB |
| Text on primary | on-accent | #FFFFFF | #112C1D |
| Selected surface | accent-soft | #E3F0E8 | #2A4435 |
| Mission surface | mission | #F0F7F1 | #25372C |
| Danger | danger | #A33745 | #F29DA9 |

Status, focus, scrim, rank and the four area accent families also have theme-specific tokens. Separators need not identify a control; editable fields use the stronger `control-border`. Buttons use explicit `on-accent` and `on-danger` colors, rather than reusing the canvas color. The small theme previews have dedicated fixed preview tokens because they illustrate the alternative theme.

The local, licensed Inter family supplies Latin and Latin Extended glyphs at weights 400, 500 and 600; the system stack is the fallback. Work text is 16 px, secondary text 14 px, compact metadata 12 px, page titles 36 px and section titles 20 px at the normal root size. The mission and timer use larger type sparingly. Dates, quantities and progress use regional formatting and tabular numerals where appropriate. No additional font family is required.

Spacing uses the shared 4 px scale: 4, 8, 12, 16, 24, 32, 48, 64 and 96 px. Inputs use 8 px corners, buttons 12 px, cards/dialogs 16 px and pills a full radius. Background levels and borders provide grouping; the modal is the main shadowed surface. Animation uses the 160 ms token and is disabled for reduced motion.

## Layout and navigation

Desktop navigation begins at 1200 CSS px with a 232 px rail and 32 px content inset. Content has a maximum workspace width, while long text and forms remain bounded. The rail scrolls on short screens or with enlarged text. Below 1200 px, the header and bottom navigation provide the same destinations through Today, Tasks, Capture, Goals and More. Inbox remains visible in the header. Bottom clearance and safe-area padding keep final controls reachable.

Today is home. Tasks and Inbox are sibling views. Progress, Activity and Rewards retain direct addresses and share internal navigation. Focus has a direct entry and a truthful running/paused return state. During Focus, the workspace navigation is hidden and a clear return to Today remains available. Settings and sign-out controls sit apart from frequent work actions.

Ctrl/Cmd+K and a visible control open the command dialog. It searches implemented actions and destinations only. It shares task/habit/goal creation and navigation with the normal controls, supports keyboard selection, Escape, focus return and an explicit no-result state. Text fields, composition and existing dialogs retain their own keyboard behavior.

Task list filters and pagination live in the URL. Clicking a task row on desktop retains the list beside a non-modal detail panel. Direct navigation, refresh and small screens render the complete detail route. Both views use the same form and API mutations. Closing the panel restores the originating task focus and list context; history navigation retains recorded scroll positions in memory. The side panel does not trap Tab or mark the background inert.

## Roles of the screens

| Screen | Composition and real behavior |
| --- | --- |
| Today | Compact selected-day status; one strongest Mission surface; planned task rows; due/earlier work; disclosed changed/completed plans; supporting habits, inbox and actual XP. New accounts, existing empty days, working days and completed days are distinct. |
| Life Areas | Responsive cards sized by available card width, original per-area SVG motifs and icons, conceptual descriptions and grouped task/goal/habit links. Counts come from one owner-scoped aggregate endpoint. Missing counts remain a dash. Editing name, order and activation is secondary. |
| Tasks/Inbox | Scannable completion/title rows, relevant metadata and visible actions. Search, status and area controls wrap. Filter reset, true empty states, archival and reopening remain available. |
| Quick Add | One shared dialog. Title alone can go to Inbox. The contextual date is visible and editable; choosing the day creates a real commitment. Inbox submission always stays undated. Optional detail/size/priority fields are disclosed. Failed input is retained. |
| Goals | Cards show state, area, target and latest recorded update. Numeric progress uses the actual baseline, direction and unit. Text may exceed 100% or regress; only the graphical meter is clamped. Qualitative goals use notes. Details put recording and history before configuration. |
| Habits | Daily logging precedes the library. A bounded owner-scoped week query supplies seven actual schedule/log states. Completed, corrected, planned, rest, flexible and future are distinct. WeeklyCount never invents mandatory weekdays. Mobile uses a visible symbol legend and full accessible per-day text. Schedule history and reversals remain available. |
| Focus | One concentrated work surface, selected task context, readable server-based elapsed timer and explicit pause/resume/finish controls. Task completion and session-only completion are separate. Stop/cancel remain secondary; no points are invented from time. |
| Progress | Existing level, rank, net XP and next threshold, original emblems for all six existing ranks, labelled lifetime totals and recent activity. Rules and the immutable ledger are disclosed rather than dominating the page. |
| Activity | Events grouped by the account's local calendar date, meaningful type labels/icons, timestamps, filters and pagination. Historical summaries are retained; non-English interfaces disclose them explicitly as original English text. |
| Rewards | Cards distinguish locked, ready and claimed states, with level requirement, actual remaining levels, claim timestamp and archive access. No spending, shop or payment behavior. |
| Settings | Account, language/time, appearance and sessions/security. Addressable internal navigation; separate UI language, regional format and searchable IANA time zone; retained unsaved regional draft; honest appearance saving/retry status. No fabricated account-edit or device-list capabilities. |
| Login | Bounded form, original desktop illustration and shared identity, public language/theme choices, autofill, paste, password visibility, Remember Me, localized validation and account-neutral failures. |

Area artwork and rank emblems are original local SVG code with decorative accessibility semantics and visible names alongside. The four subtle area accent families affect artwork/icon backgrounds; primary buttons and semantic states remain shared. No external product assets, hotlinks or new image data fields are used.

## Shared controls and states

`Button` retains primary/secondary/quiet/danger variants, explicit pending/disabled state and stable labels. `Input` and `Select` retain visible labels, hints, associated errors and appropriate native controls. `PageHeader`, `EmptyState`, `QueryFeedback` and `ActionFeedback` provide consistent hierarchy and feedback. The existing native `Dialog` controls actual modal behavior, initial focus, Tab containment, Escape and focus restoration.

Sign out and sign out everywhere are separate named danger actions using the same confirmation. Initial focus is on staying signed in. Pending operations cannot be dismissed. A transport failure checks session status before treating logout as complete; private query state is cleared only after success or confirmed 401. The existing one-minute security-stamp revocation explanation is preserved.

Errors are localized from stable codes/HTTP categories, never by matching English server prose. Raw diagnostics are not shown. Forms retain failed values. Reads distinguish loading, error and real empty results. Actual XP feedback is one inline status from the server response; retries retain the existing ClientActionId rules. Timers are not live-announced every second.

## Language, themes and density

The existing language module and context are extended with a reviewed four-column catalog. English, Norwegian Bokmål, Swedish and Danish cover interface labels, help, forms, validation, errors, menus, statuses and accessible names. Native language names are used in selectors. Document language, authenticated page titles and the Login title follow UI language. Intl handles regional dates/numbers, weekday names and applicable plurals. Complete message templates replace assembled translated sentence fragments.

Own task/goal/habit titles, notes and renamed areas are preserved. Standard area names are localized through the stable area key only while the stored name equals its documented default. Immutable activity summaries are never rewritten in the database. English fallback remains available for unknown keys/locales.

`UiLanguage`, `Theme` and `Density` are additive owner settings. The preference migration derives the initial language from the existing Locale, retaining that Locale and historical time zones. PATCH changes only supplied fields. Authenticated settings are authoritative after sign-in. A synchronous prepaint script and an allowlisted local display memory provide public appearance without storing private data or credentials. Storage failures do not break rendering. System theme listens for operating-system changes.

Normal and compact densities share font sizes and semantics. `--row-padding` and `--section-gap` reduce excess spacing. Fine-pointer compact controls may be 36 px high; touch controls retain the 44 px project target. Actual AA target-size assessment uses the 24 px minimum and applicable spacing/inline exceptions, rather than claiming 44 px as AA's general minimum.

## Verification and references

The working requirement matrix and actual test results are in `UX_REDESIGN_PLAN.md` and `IMPLEMENTATION_STATUS.md`. Ignored `artifacts/full-redesign` contains production timing, contrast-role measurements, screenshots and local comparison material from disposable fictional PostgreSQL accounts. Viewport emulation is not physical-device testing, and automated checks are not accessibility certification or the owner's final design approval.

The design uses principles observed in the supplied official product presentations: Linear's quieter navigation, Things' action rows, Craft's framed entry points, Sunsama's concentrated focus, Raycast's bounded action search and Discord's settings hierarchy. Superlist, Cosmos and Lovable references informed the distinction between work surfaces and expressive content. No layouts or assets were copied, and no logged-in use of these external products is claimed.

Accessibility behavior is guided by [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [WAI dialog guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) and [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). Formatting follows [Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl); performance reports distinguish local measurements from [Web Vitals field data](https://web.dev/articles/vitals).
