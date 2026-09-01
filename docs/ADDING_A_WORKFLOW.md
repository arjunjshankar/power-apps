# Adding a Workflow

Three routes, in increasing order of power. All three produce the same thing —
a `WorkflowDefinition` validated by `workflowDefinitionSchema` and executed by
the shared runtime — so a workflow can start in Route A and graduate to B or C
without rework.

## Route A — Workflow Builder (no code)

For standard queue/review/approve processes. As an Operations or Engineering
Admin, open **Workflow Builder** → **Create workflow** and walk the guided
wizard:

1. **Basics** — name, description, record noun (singular/plural), icon,
   optional category, and which roles can see the workflow.
2. **Fields** — the record schema. Supported types: `text`, `longText`,
   `number`, `money`, `percentage`, `boolean`, `date`, `select`,
   `multiSelect`. Per field: required, editable, default value, show in
   queue, show in detail, and options for select types.
3. **States** — ordered statuses with design-system colors; the first status
   is the initial state; terminal states end the lifecycle.
4. **Actions & rules** — per action: label, from-status(es), to-status,
   allowed roles, confirmation (with message), required reason input, and
   **business rules**. Rules are simple typed comparisons over a field:
   `equals`, `notEquals`, `greaterThan`, `lessThan`, `contains`, `isEmpty`,
   `isNotEmpty`. A matching rule either restricts the action to specific
   roles (e.g. *amount > 5000 requires Supervisor*) or blocks it entirely
   (no roles selected). Rules are evaluated server-side in `checkAction` —
   this is deliberately **not** an expression language or rules engine.
5. **Queue & views** — table columns, default sort, searchable fields, and
   predefined views (All, Unassigned, Assigned to Me, per-status).
6. **Preview & publish** — a sample-data preview of the queue, role-sensitive
   action availability (evaluated with the real permission checker), the
   **Platform capabilities used** panel (derived from the configuration), and
   a generated **Extend with Devin** prompt. Save as draft or publish.

Published workflows are stored as JSON in the `StudioWorkflow` table,
validated against `workflowDefinitionSchema` on save and on load, and merged
into the runtime registry (`src/lib/workflows/registry.ts`) alongside
code-defined workflows. They immediately get the shared navigation, queue,
forms, detail view, RBAC, transitions, and audit — no new pages or code.

The landing page also supports **duplicate** (creates a draft copy),
**archive/restore** (archived workflows disappear from the runtime without
being deleted), and editing of builder-defined workflows. Code-defined
(System) workflows are listed read-only and cannot be modified here.

**Chargeback Review** (`prisma/seed-data/chargeback-review.ts`) and Payment
Exceptions were created this way — every part of them is expressible through
the wizard.

### Versioning

Each builder workflow has a stable slug, draft/published flag, archived flag,
and `updatedAt` timestamp. Full version history is intentionally out of scope
for the POC; the single-row-per-slug model can be extended to an append-only
versions table later without changing the runtime.

## Route B — Declarative definition (TypeScript)

For workflows that need version control, code review, business guards, or
integrations.

1. Create `src/workflows/<slug>.ts`:

```ts
import { defineWorkflow } from "@/lib/workflows/types";

export const chargebacks = defineWorkflow({
  slug: "chargebacks",
  name: "Chargeback Review",
  visibleToRoles: ["analyst", "supervisor"],
  titleField: "caseId",
  fields: [
    { key: "caseId", label: "Case", type: "text", required: true },
    { key: "amount", label: "Amount", type: "money", required: true },
    // ...
  ],
  statuses: [
    { key: "new", label: "New", color: "gray" },
    { key: "accepted", label: "Accepted", color: "green", terminal: true },
    { key: "disputed", label: "Disputed", color: "orange" },
  ],
  initialStatus: "new",
  actions: [
    {
      key: "dispute",
      label: "Dispute",
      fromStatuses: ["new"],
      toStatus: "disputed",
      roles: ["analyst", "supervisor"],
      requiredInputs: [{ key: "reason", label: "Dispute reason", type: "longText" }],
      guards: [
        {
          type: "amountThreshold",
          field: "amount",
          thresholdSettingKey: "chargeback.disputeThreshold",
          requiredRoles: ["supervisor"],
          message: "Large chargebacks require a supervisor.",
        },
        // or a builder-style comparison rule:
        {
          type: "rule",
          field: "riskLevel",
          operator: "equals",
          value: "High",
          requiredRoles: ["supervisor"],
          message: "High-risk cases require a supervisor.",
        },
      ],
    },
  ],
  tableColumns: ["caseId", "amount"],
});
```

2. Register it in `src/workflows/index.ts`.
3. Seed demo rows in `prisma/seed.ts`; run `npm run db:reset`.
4. Add unit tests for guards and one e2e flow.

`defineWorkflow` validates the definition against `workflowDefinitionSchema`
at load time — a malformed definition fails immediately, not at click time.

## Route C — Custom behavior (full code)

The escape hatch when configuration is not enough — the "Extend with Devin"
panel in the builder generates a ready-to-use prompt for this.

- **Custom detail UI:** build a component in
  `src/components/workflow/custom/`, register it in `custom/index.tsx`, set
  `customDetailComponent: "YourComponent"` on the definition. The Feature
  Flags panel (`feature-flag-detail.tsx`) is the reference example.
- **New guard type:** extend `actionGuardSchema` in `types.ts`, implement in
  `checkAction` (`permissions.ts`), unit-test it.
- **Real integration:** implement `IntegrationAdapter`
  (`src/lib/integrations/`), reference it from an action's `integration` key.

## What still requires code (by design)

Custom panels and visualizations, cross-record logic, computed fields,
external integrations, new field/guard/dashboard types, scheduled jobs, and
anything resembling scripting. Keeping these in ordinary TypeScript — rather
than growing the builder into a general low-code platform — is the point:
the builder covers the common 80% and code (via Devin or an engineer) covers
the rest on the same runtime.
