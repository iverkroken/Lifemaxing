# Focus refinement implementation record

## Follow-up: artwork and viewport correction ? 23 September 2026

The current Focus asset is now `Background upgrade.png` (1672?941), unchanged. This supersedes the Odessey assignment in the historical refinement record below. Existing centered cover geometry and the horizontal overlay are retained; Today and the global header are unchanged.

The live development server initially served an older cached Focus stylesheet (788px document at a 768px viewport). Current on-disk short-height rules fit in a fresh frontend process. The correction invalidates that stale transform and adds an explicit desktop height budget with intrinsic overflow for accessibility. Progress is a compact horizontal strip with completed/goal minutes and a small ring; long city and lap lists remain keyboard-scrollable internally. Success feedback shares the footer.

Validation: 132 frontend + 3 launcher tests, lint, production build, six browser layout scenarios in Chromium and Firefox, and one additional Chromium task-completion-feedback scenario pass. API-fixture browser checks preserve the real frontend/shell while avoiding backend or database changes. Tests include wheel/header behavior, both desktop sizes, long lists, selected items and all focus/break states, mobile, short windows and enlarged text. Asset/Today/shared-renderer hashes are unchanged. No dependencies, migrations, commits or pushes.


Approved plan: upgraded full-screen Focus artwork, World Clock map/defaults, seven gentle synthesized completion profiles, and compact daily progress with an editable account goal. Existing modes, timers, accounting and item selection remain authoritative.

## Decisions and implementation

- Verified `client/public/images/Odessey upgrade.png`, 1672×941. Its bytes, Today JSX/CSS and shared HeroArtwork JSX/CSS match SHA-256 baselines. Focus uses minimum centered viewport cover; the two requested desktop ratios crop less than one CSS pixel vertically. The left overlay is horizontal only, preserving blue texture elsewhere. The old asset was removed by the user and is not restored.
- Reused shared container/header spacing, semantic palette, CSS Modules, Phosphor icons, native Dialog, controls, localization, React Hook Form/Zod, TanStack Query and authenticated/CSRF-protected productivity APIs. Compact goal progress sits above the footer. Short desktop viewports put timer and controls side by side; return-to-focus moves into header actions when another mode is open.
- World Clock keeps IANA/Intl times and saved order. An idempotent, owner-serialized initialization operation seeds London/New York/Tokyo/Sydney once only when the saved list is empty; subsequent intentional empty lists stay empty. Local time is separately pinned. SVG pins derive from bundled public-domain Natural Earth/IANA geographic metadata, with documented named-city aliases. Unknown/non-geographic positions are never fabricated. The map is about 86 KB uncompressed and makes no runtime network requests.
- Seven local Web Audio profiles use motifs, overtones, soft envelopes and controlled repetition. Legacy selections map to corresponding new sounds without rewriting historical preferences. Master/phase controls, preview, volume and independent Timer behavior remain. No new package dependency, generated artwork or downloaded audio is introduced.
- Daily progress shows yesterday's minutes, goal, streak and today's confirmed minutes. The goal defaults to 120 minutes and accepts 15–1440 in 15-minute increments. A targeted goal endpoint cannot overwrite sound preferences. The progress ring caps visually at 100%; text retains actual totals. The summary refreshes every 30 seconds while visible, as well as after focus actions.
- The confirmed streak rule is at least 60 recorded seconds per account-local day, including multiple short intervals. An unfinished today keeps yesterday's streak. History reads use bounded 32-day windows and continue only while the streak remains unbroken. Confirmed spans split at timezone-aware boundaries; cancelled work, breaks and uncertain time do not count. Legacy sessions retain their existing start-day accounting.

## Persistence

`20260922213031_FocusHubRefinement` adds `DailyGoalMinutes` (default 120, bounded/multiple-of-15 constraint) and `WorldClockInitialized` to existing preferences. No history tables or entity references change. Existing general preference saves deliberately do not write these two fields.

The upgrade was tested on disposable PostgreSQL, including existing sound/volume/custom configuration and saved city preservation. The normal Development database upgrade was then applied after a private, access-restricted, validated backup. Aggregate row fingerprints and counts match for all 30 pre-existing tables, excluding only the two new columns and migration history. No reset, deletion or reseeding occurred.

## Verification ledger

- Artwork, map presence, goal editing, initialization and audio tests were observed failing before implementation, then passing. Summary DST tests failed on missing fields and passed after the implementation.
- Frontend suite: 132 tests in 37 files, plus 3 launcher tests passed. Backend suite: 130 tests passed; the extended historical migration-preservation check also passed separately. Lint, production build, locked restore, Release build (zero warnings/errors), EF model agreement and both working/index diff checks pass. JavaScript has no separate configured type-check command.
- Seven browser scenarios pass: the complete hub flow and real focus/break deadlines in both Chromium and Firefox (four), plus the connected Today/entity/responsive suite and actual API restart persistence in Chromium (three). The restart scenario is intentionally skipped before restart, then explicitly runs and passes afterward. Axe scans report zero violations. All four modes, idle and during active focus, fit 1920×1080 and 1366×768 without document scrolling. Tablet/mobile checks also pass. Desktop, laptop and mobile screenshots were visually inspected; artwork remains sharp and visible with no vertical fade.
- Browser fit assertions exposed laptop overflow after adding progress, Smart review and World Clock. Responsive timer/control grouping and map height fixed the failures without hiding content or disabling document overflow. Testing other modes during an active run caught the additional return-link height; moving that control into header actions fixed it.
- Verification repairs: JSDOM goal-dialog tests now use the existing native-dialog test shim; the audio mock preserves real sound metadata; the deadline test scopes its Focus navigation link because real habit fixtures also expose Focus links.
- A fresh read-only reviewer found no critical or important issues and independently verified preserved source/asset hashes. Its suggested >32-day streak test was added and passes in the full backend suite.
- Ruling: continue in the user's existing workspace and preserve prior staging; no branch/worktree/commit operation is authorized. Record this task directly here instead of skill scripts that presume a committed plan/branch.
- Runtime diagnosis: the full backend run was still progressing and finished successfully in 4m52s. A debugger attach raced with completion and yielded no stack evidence; no runtime changes or breakpoint changes resulted.

## Git review

New Focus source/tests, map data/provenance/generator, upgraded Focus asset, migration and this record are tracked by explicit paths. Prior staging and unrelated edits are preserved. The user-added `client/public/images/Background upgrade.png` (1672×941) was identified as outside this task and remains unchanged and untracked. Screenshots, logs, traces, build output and private backup material remain outside Git. No commit, push or branch change occurred.

## Limits

Browser/OS audio policies still require interaction; suspended/closed pages cannot guarantee exact-time alarms. Notifications and wake lock remain progressive enhancements. Audible playback scheduling is browser-tested, but comfort on physical headphones/speakers requires human listening. Geographic pins represent timezone exemplars when the exact named location is unavailable, never device geolocation.
