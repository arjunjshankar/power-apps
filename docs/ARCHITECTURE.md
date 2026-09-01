# Architecture

## Shape

A **modular monolith**: one Next.js 14 (App Router) TypeScript application with
clear internal boundaries. No microservices, no message queues, no external
infrastructure — a deliberate choice for maintainability and one-command local
execution.

```
User (demo persona / production: OIDC session)
  ↓
Operations Platform UI (Next.js App Router, server components + small client islands)
  ↓
Workflow Runtime (src/lib/workflows)
  ├── Workflow Definitions   (src/workflows/*.ts + DB-stored studio definitions)
  ├── Registry               (registry.ts — merges code + published studio workflows)
  ├── Views / Queues         (QueueTable + view filters from definitions)
  ├── Forms                  (DynamicForm generated from field definitions)
  ├── Actions / Transitions  (engine.ts executeAction — single state-change path)
  ├── Permissions            (permissions.ts — server-side checks + guards)
  ├── Audit Logging          (audit.ts — every meaningful state change)
  └── Dashboard Components   (dashboard cards from definitions)
  ↓
Domain / Integration Layer (src/lib/integrations)
  ├── KYC Adapter (mock)
  ├── Refund Adapter (mock)
  ├── Feature Flag Adapter (mock)
  ├── Notification Adapter (mock)
  └── Future integrations implement the same IntegrationAdapter interface
  ↓
Persistence (Prisma → SQLite locally; PostgreSQL-ready)
```

## The common pattern

KYC review, refunds, and feature-flag administration share one shape:

records exist → an employee finds and reviews them → performs an authorized
action → business rules gate the action → state and/or an external system is
updated → the operation is audited.

Everything in the runtime is a generalization of that pattern, and nothing
more. This is intentionally **not** a BPM engine or a visual programming
language.

## Key design decisions

### One definition schema, two sources
`WorkflowDefinition` (Zod schema in `types.ts`) describes fields, statuses,
actions, guards, views, table columns, and dashboard cards. Code-defined
workflows (`src/workflows/*.ts`) are parsed by `defineWorkflow()` at module
load; Workflow Studio definitions are stored as JSON in the `StudioWorkflow`
table and parsed with the same schema when loaded. The rest of the application
is agnostic to where a definition came from.

### Generic routes, not per-workflow pages
`/w/[slug]` (queue), `/w/[slug]/r/[id]` (detail), and `/w/[slug]/new` render
every workflow from its definition. Adding a workflow adds **zero** pages.
A workflow can opt into a custom detail component (`customDetailComponent`)
without giving up the shared queue, permissions, or audit.

### Single server-side state-change path
`executeAction` in `engine.ts` is the only way a record transitions state. It
enforces role permission, status availability, business guards (e.g. the
configurable refund threshold, high-risk KYC supervisor rule), required
inputs, invokes the configured integration adapter, persists, and writes the
audit event. UI button visibility is a convenience, never the security
boundary.

### Records as typed JSON, definitions as schema
`WorkflowRecord.data` is a JSON payload validated against a Zod schema
generated from the workflow's field definitions. This gives dynamic data
models (a Power Apps essential) without one table per workflow, while keeping
validation explicit. A production system with heavy relational needs can
promote hot workflows to real tables behind the same DTOs.

### Authentication behind an interface
`getCurrentUser()` (`src/lib/auth/session.ts`) is the only place identity is
resolved (demo: persona cookie). Swapping in Entra ID/Okta/OIDC changes this
one seam, not application logic.

### Configuration in the database
Business-tunable values (e.g. `refund.approvalThreshold`) live in
`PlatformSetting` and are editable from the Administration page — rules
reference setting keys instead of hard-coded numbers.

### SQLite now, PostgreSQL later
Prisma is the only persistence interface. Local demo uses embedded SQLite
(zero setup); moving to PostgreSQL is a datasource change plus migration run.

## Extensibility levels

| Level | Who | Mechanism |
|---|---|---|
| 1. Business configuration | Ops/eng admins | Workflow Studio (DB-stored definitions, publish/unpublish) |
| 2. Declarative configuration | Engineers / Devin | `defineWorkflow()` files in `src/workflows/` |
| 3. Full code | Engineers / Devin | Custom detail components, guards, integration adapters, anything |
