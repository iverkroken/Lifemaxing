# LIFEMAXING Agent Instructions

AGENTS_POLICY_VERSION: 2026.09.13.1

## Project

LIFEMAXING is a long term personal operating system for planning, execution, progress tracking and structured life data.

The immediate development target is V1 and V2.

Future versions include integrations, automation, analytics, AI assistance and a long term Life Archive.

The current priority is reliable working software with a clean foundation.

Do not optimize prematurely for future versions.

Do not implement future roadmap functionality unless explicitly requested.


## Source of truth

Before implementation work, read:

`docs/IMPLEMENTATION_STATUS.md`

Then read the documentation relevant to the current task.

Core documentation:

1. `docs/PROJECT_SPEC.md`
2. `docs/ROADMAP.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DATABASE.md`
5. `docs/DESIGN_SYSTEM.md`
6. `docs/ENGINEERING_RULES.md`
7. `docs/IMPLEMENTATION_PLAN.md`
8. `docs/FUTURE_ARCHITECTURE.md`
9. `docs/RISKS_AND_DECISIONS.md`

For the first implementation phase, read the complete project documentation before creating application architecture.

Do not repeatedly read every document for small isolated changes when the relevant source is clear.


## Repository structure

The intended high level structure is:

`client/`
React frontend

`server/`
ASP.NET Core backend

`tests/`
Automated tests

`docs/`
Product, architecture and implementation documentation

`AGENTS.md`
Repository wide agent rules

The architecture may evolve according to `docs/ARCHITECTURE.md`.

Do not create new top level directories without a clear reason.


## Engineering principles

Keep code understandable.

Prefer explicit code over clever code.

Prefer professional simplicity.

Do not overengineer.

Do not create abstractions without a real need.

Do not create wrappers that add no meaningful behavior.

Do not duplicate business logic.

Keep responsibilities clear.

Use descriptive names.

Keep functions and components reasonably focused.

Follow existing patterns before inventing new ones.

When several valid solutions exist, prefer the one that is easiest for one developer to understand and maintain over several years.


## Frontend

Use React.

Use JavaScript and JSX.

Never introduce TypeScript.

Use the libraries and architecture defined in `docs/ARCHITECTURE.md`.

Prefer feature based organization.

Use TanStack Query for API backed server state where specified.

Use React local state for local interface state.

Do not introduce Redux or another global state library without a demonstrated need.

Use React Hook Form and Zod where defined by the architecture.

Do not scatter API requests throughout components.

Use the shared API client layer.


## Backend

Use ASP.NET Core and C#.

Use PostgreSQL.

Use Entity Framework Core and Npgsql.

Follow the modular monolith architecture defined in the documentation.

Do not introduce microservices.

Do not introduce repository abstractions merely to wrap Entity Framework Core.

Use services when real business logic exists.

Do not expose EF Core entities directly as public API contracts.

Use request and response DTOs.

Use asynchronous database operations where appropriate.

Validate entity ownership on the server.

Never trust a UserId supplied by the frontend.


## Database

Follow `docs/DATABASE.md`.

Use EF Core migrations for schema changes.

Preserve historical information where the architecture requires it.

Do not silently delete historical records to simplify implementation.

Use relational structures by default.

Use JSONB only where the database documentation identifies a genuine need.

Add indexes intentionally rather than automatically indexing everything.

Do not create production data or migrations that depend on private personal information.


## Design system

Follow `docs/DESIGN_SYSTEM.md`.

The interface should feel modern, premium, calm and consistent.

The visual direction combines:

Scandinavian control center

Premium editorial interface

Personal operating system

Warm personal archive

Consistency is more important than making every page unique.

Reuse shared components and design tokens.

Use the same component system for buttons, inputs, cards, navigation, badges, tables, charts, dialogs and common layouts.

Do not create arbitrary local colors.

Do not create arbitrary spacing values.

Do not create arbitrary border radii.

Do not create new button styles when an existing variant is appropriate.

Do not make individual Life Areas look like unrelated applications.

Life Areas may have subtle visual identity through approved accent tokens while keeping the shared layout and component language.

Avoid excessive gradients.

Avoid excessive glass effects.

Avoid visual noise.

Avoid childish gamification.

Use subtle animation.

Respect reduced motion preferences.

Functionality and usability come before decorative complexity.

The interface can receive additional visual polish after the core functionality is reliable.


## Product behavior

LIFEMAXING is execution focused.

The core loop is:

Plan

Do

Complete

Record

Reward

Analyze

Improve

When there is a conflict between displaying more information and making the next useful action clear, prefer the next useful action.

Today is primarily an execution page.

Overview is primarily an analytical page.

Do not turn every page into a dashboard.


## Security and privacy

This repository is public.

Never commit or expose secrets.

Never commit passwords.

Never commit API keys.

Never commit access tokens.

Never commit private database credentials.

Never commit authentication secrets.

Never commit private keys.

Never commit production connection strings containing credentials.

Treat `.env` files and local secret stores as sensitive.

Use `.env.example` or equivalent examples with placeholder values only.

Use ASP.NET Core User Secrets or environment variables for local secrets where appropriate.

Never use the repository owner's real financial, health, travel, address or other private personal information as seed data, fixtures or examples.

Development seed data must be fictional and generic.

Do not print secrets to logs or terminal output.

Do not weaken authentication, authorization, CSRF protection or validation simply to make development easier.


## Git

Without explicit permission, do not commit, amend, push, merge, create or switch branches, modify Git remotes, reset, or rewrite repository history.

You may inspect Git status and diffs to understand current changes.

Before finishing a task, review all changed and unversioned files.

Add reviewed new project files to Git tracking using explicit paths. This includes source code, components, styles, maintained tests, migrations, necessary scripts, documentation, configuration without secrets, required resources, and license files. `git add` for these files is permitted and expected.

Keep secrets, local environment files containing secrets, User Secrets, temporary screenshots, test results, coverage, build output, caches, logs, IDE state, node_modules, bin, and obj outside Git.

Update `.gitignore` when recurring generated files require it. An ignore rule does not resolve a secret that is already tracked; report it without exposing its value.

Inspect unknown files before considering deletion. Do not stage unrelated existing changes. Preserve existing staging outside the task. Do not use `git add .` indiscriminately.

End the Git review with `git status`. Confirm that necessary new project files are tracked, local/generated files and secrets have not been added, and no project files remain unexplained as unversioned.


## Implementation workflow

Follow `docs/IMPLEMENTATION_PLAN.md`.

Work on one implementation phase at a time.

Do not automatically continue into the next phase.

Before every implementation task:

1. Read the entire current `AGENTS.md` again, including applicable subordinate agent instructions. Instructions remembered from an earlier task do not replace reading the current file.
2. Verify `AGENTS_POLICY_VERSION` from the file. Stop if the policy version cannot be verified.
3. Read `docs/IMPLEMENTATION_STATUS.md`, then the relevant architecture and product documentation.
4. Inspect the existing implementation and relevant repository files before making assumptions or replacing anything.
5. Check Git status before making changes.

During implementation:

1. Make the smallest coherent set of changes needed for the current goal.
2. Keep frontend, backend and persistence connected where the feature requires them.
3. Do not substitute hardcoded frontend data for real persistence when the specification requires database backed behavior.
4. Add or update appropriate tests.
5. Fix failures caused by your changes.

After implementation:

1. Build the affected projects.
2. Run relevant tests.
3. Run relevant linting.
4. Verify database migrations when schema changes occurred.
5. Inspect failures and resolve issues caused by the change.
6. Update `docs/IMPLEMENTATION_STATUS.md`.
7. Stop after the requested phase or task is complete.

## Required final report

Use the following structure for implementation tasks:

### Completed

Two to five short bullets describing work actually completed.

### Verification

Tests, builds, and checks actually run, with their results. Do not claim tests, manual verification, or instruction reading that did not take place.

### Git

Important new files added to tracking, relevant files kept outside Git, any unexpected unversioned files, and confirmation that no commit or push occurred without permission.

### Remaining

Only real limitations, failed checks, or necessary manual verification. Omit this section if nothing remains.

End the report with `Instructions checked: AGENTS.md` followed by the policy version verified from the file actually read. For this version, the final line is:

Instructions checked: AGENTS.md 2026.09.13.1


## Development commands

Use repository root unless another working directory is specified.

Database:

`docker compose up -d`

Backend:

`dotnet restore`

`dotnet build`

`dotnet test`

Frontend:

`npm ci`

`npm run lint`

`npm run test -- --run`

`npm run build`

Phase 0 uses an npm workspace, so the frontend commands above run from the repository root.

Start the normal local stack with `npm run dev`; it ensures PostgreSQL is healthy and runs the API watch process and Vite in one terminal. Use `npm run dev:db`, `npm run dev:api` or `npm run dev:client` when a component must run separately.

Use `dotnet restore --locked-mode` for reproducible restores. The SDK selected by `global.json` must be installed; see README.md for the per-user Windows SDK path and database secret setup.

With the three services running, `npm run test:smoke` runs the focused browser checks. Install its browser once with `npx playwright install chromium`.


## Definition of done

A feature is not complete merely because files or interface components exist.

For relevant features, completion means:

1. The implementation follows the project architecture.
2. The frontend works with the real backend.
3. Required persistence works through PostgreSQL.
4. Data survives application restart where persistence is required.
5. Validation exists at the appropriate boundary.
6. Loading, empty and error states exist where relevant.
7. Existing functionality has not been knowingly broken.
8. Relevant tests pass.
9. Relevant builds pass.
10. Documentation and implementation status reflect meaningful architectural or project state changes.

Do not declare success when important verification could not be performed.

If a required check cannot be run, state exactly what could not be verified and why.


## Architectural changes

Do not silently change major architecture decisions.

Examples include changing:

Frontend framework

Programming language

Database technology

Authentication strategy

State management strategy

Deployment architecture

Core domain model

Major library choices

If an existing architectural decision creates a real implementation problem, explain the problem and propose the smallest reasonable change before replacing the documented approach.


## Documentation maintenance

Keep `docs/IMPLEMENTATION_STATUS.md` current after meaningful implementation work.

Update deeper architecture documents only when the architecture actually changes.

Do not rewrite documentation merely to mirror implementation details that do not affect the documented design.

When code and documentation materially disagree, do not ignore the conflict.

Determine whether the implementation is wrong or the documentation has become outdated, then resolve the inconsistency explicitly.
