# LIFEMAXING Agent Instructions

Before making changes to this repository, read the relevant project documentation.

The project documentation is the source of truth for product requirements, architecture, database design, engineering rules, visual design and implementation planning.

## Required documentation

Read these files before major implementation work:

1. `docs/PROJECT_SPEC.md`
2. `docs/ROADMAP.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DATABASE.md`
5. `docs/DESIGN_SYSTEM.md`
6. `docs/ENGINEERING_RULES.md`
7. `docs/IMPLEMENTATION_PLAN.md`
8. `docs/FUTURE_ARCHITECTURE.md`
9. `docs/RISKS_AND_DECISIONS.md`
10. `docs/IMPLEMENTATION_STATUS.md`

## Core engineering rules

Use JavaScript and JSX for the frontend.

Do not introduce TypeScript.

Use React according to the architecture documentation.

Use ASP.NET Core and C# for the backend.

Use PostgreSQL and Entity Framework Core according to the database architecture.

Keep the architecture understandable and maintainable.

Do not overengineer.

Prefer simple and explicit code over clever abstractions.

Use feature based organization where specified by the architecture.

Do not introduce microservices unless the project documentation is explicitly changed.

Do not introduce unnecessary dependencies.

Inspect existing code before modifying or replacing it.

Do not duplicate business logic unnecessarily.

## Frontend and design

Follow `docs/DESIGN_SYSTEM.md`.

The interface should be modern, clean, premium and consistent.

Use shared components and shared design tokens.

Do not create arbitrary button styles, colors, spacing, radii or typography for individual pages when an existing shared pattern can be used.

Consistency across the application is more important than making every page visually unique.

Functionality and usability come before decorative complexity.

Visual polish can improve gradually over time.

## Implementation workflow

Follow `docs/IMPLEMENTATION_PLAN.md`.

Work phase by phase.

Do not attempt to implement all of V1 and V2 at once.

Before starting a new phase:

1. Read `docs/IMPLEMENTATION_STATUS.md`.
2. Inspect the current repository.
3. Confirm that previous functionality still builds.

After meaningful implementation work:

1. Build the frontend.
2. Build the backend.
3. Run relevant tests.
4. Fix discovered errors.
5. Update `docs/IMPLEMENTATION_STATUS.md`.

Do not consider a feature complete simply because files or UI components exist.

Features that require persistence must work through the real backend and database.

## Git

Do not commit changes.

Do not push changes.

Do not modify Git remotes.

The repository owner handles commits and pushes unless explicitly instructed otherwise.