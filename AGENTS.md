# AGENTS.md — Instructions for Devin and other engineering agents

## What this is

An internal operations platform (Next.js 14 App Router modular monolith) with a
shared workflow runtime. Business workflows (KYC review, refunds, feature
flags, merchant onboarding, payment exceptions, ...) are either declarative
TypeScript definitions or database-stored Workflow Studio definitions, both
validated against the same Zod schema and executed by the same runtime.

## Commands

```bash
npm install                       # installs deps; postinstall runs `prisma generate`
npm run dev                       # dev server; auto-creates + seeds SQLite DB on first run
npm run build                     # production build (also runs ESLint + type checks)
npm test                          # unit tests (Vitest)
npm run test:e2e                  # Playwright e2e (npx playwright install chromium once)
npm run lint                      # ESLint
npm run typecheck                 # tsc --noEmit
npm run db:reset                  # force-reset + reseed the demo database
npm run db:seed                   # reseed only
```

## Directory map

```
prisma/
  schema.prisma            # WorkflowRecord, StudioWorkflow, AuditEvent, PlatformSetting
  seed.ts                  # synthetic demo data for all workflows
  seed-data/               # studio workflow definitions seeded into the DB
src/
  lib/
    workflows/
      types.ts             # Zod schemas: WorkflowDefinition, fields, statuses, actions, guards
      registry.ts          # merges code workflows + published studio workflows
      engine.ts            # executeAction/createRecord/updateRecordFields — THE state-change path
      validate.ts          # record-data validation generated from field definitions
    auth/
      personas.ts          # demo users; User interface
      session.ts           # getCurrentUser() — swap for OIDC/SAML in production
      permissions.ts       # canSeeWorkflow, checkAction (server-side authorization)
    integrations/          # IntegrationAdapter interface + mock adapters
    audit.ts               # recordAuditEvent
    db.ts                  # Prisma client singleton
  workflows/               # declarative workflow definitions (one file each) + index.ts
  components/
    ui/                    # button, badge, card, input, dialog primitives
    shell/                 # app shell, nav, persona switcher
    workflow/              # QueueTable, ActionButtons, DynamicForm, RecordHistory, dashboards
      custom/              # full-code detail components (Level 3), registered in index.tsx
  app/
    w/[slug]/              # generic queue / record detail / new-record pages for ALL workflows
    studio/                # Workflow Builder (guided wizard: create/edit/duplicate/archive/publish)
    audit/  admin/  tco/   # global audit view, administration, TCO calculator
    actions.ts             # server actions — all writes go through here
tests/
  unit/                    # Vitest: engine, permissions, validation (uses prisma/test.db)
  e2e/                     # Playwright: role-sensitive flows across workflows
```

## Conventions and engineering rules

- **All state changes go through `executeAction` in `src/lib/workflows/engine.ts`.**
  It performs role checks, status checks, business guards, integration calls,
  and audit logging server-side. Never mutate `WorkflowRecord` from UI code.
- **Authorization is server-side.** UI hiding is UX only. Any new server action
  must check the actor's role (see `src/app/actions.ts`).
- **Every meaningful state change writes an audit event** via `recordAuditEvent`.
- **User-controlled data is validated** with schemas generated from field
  definitions (`validate.ts`) or `workflowDefinitionSchema` (studio input).
- **No secrets in source.** The only env var is `DATABASE_URL` (local SQLite).
- Strong typing throughout; no `any`. Workflow definitions must pass
  `workflowDefinitionSchema` (enforced by `defineWorkflow`).
- Keep the runtime small and explicit. Prefer adding a well-named capability to
  the schema over special-casing a workflow inside shared components.

## How to add a workflow (declarative)

1. Create `src/workflows/<slug>.ts` exporting `defineWorkflow({ ... })` with
   fields, statuses, actions (roles, fromStatuses, toStatus, guards,
   requiredInputs, confirm, integration), views, tableColumns, dashboardCards.
2. Register it in `src/workflows/index.ts` (`CODE_WORKFLOWS`).
3. Add seed rows in `prisma/seed.ts`, run `npm run db:reset`.
4. Add unit tests for any guard logic and an e2e happy path.

No new pages are needed — `/w/[slug]` routes render every registered workflow.
See `src/workflows/merchant-onboarding.ts` for a pure-declarative example.

## How to add custom behavior (full code)

- **Custom detail UI:** create a component in `src/components/workflow/custom/`,
  register it in `custom/index.tsx`, and set `customDetailComponent` on the
  workflow definition. See `FeatureFlagDetail`.
- **Custom business rule:** add a guard type in `types.ts` and implement it in
  `permissions.ts` (`checkAction`). Keep guards data-driven where possible.

## Workflow Builder (no-code path)

`/studio` is a guided multi-step wizard (Basics → Fields → States → Actions &
rules → Queue & views → Preview & publish) that produces the same
`WorkflowDefinition` JSON, stored in the `StudioWorkflow` table (draft /
published / archived). The registry merges published, non-archived builder
workflows with `CODE_WORKFLOWS`. Builder "business rules" are `rule` guards —
typed field comparisons (`equals`, `notEquals`, `greaterThan`, `lessThan`,
`contains`, `isEmpty`, `isNotEmpty`) enforced server-side in `checkAction`;
empty `requiredRoles` blocks the action, non-empty restricts it to those
roles. Do NOT grow this into an expression language — new rule needs beyond
comparisons should become new guard types in code.
`src/lib/workflows/capabilities.ts` derives the "Platform capabilities used"
panel and the generated "Extend with Devin" prompt from a definition.
Chargeback Review (`prisma/seed-data/chargeback-review.ts`) is the reference
builder-defined workflow.

## How to add an integration

1. Implement `IntegrationAdapter` in `src/lib/integrations/` (key, description,
   `execute()`), and register it in the `INTEGRATIONS` map.
2. Reference it from an action via `integration: "<key>"`. The engine invokes it
   before persisting the transition and records its result in the audit event.
3. For production, replace the mock `execute` body with a real API client; keep
   credentials in environment variables.

## Testing expectations

- Guard/permission logic → unit tests in `tests/unit/`.
- New user-facing flow → one Playwright test in `tests/e2e/`.
- Run `npm run lint && npm run typecheck && npm test` before finishing any task.
