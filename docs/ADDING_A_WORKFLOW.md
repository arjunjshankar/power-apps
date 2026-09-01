# Adding a Workflow

Three routes, in increasing order of power.

## Route A — Workflow Studio (no code)

For standard queue/review/approve processes. As an Operations or Engineering
Admin:

1. Open **Workflow Studio** → **New Workflow**.
2. Set name, slug, description, record noun, role visibility.
3. Add fields (text, number, money, date, select, multi-select, boolean, ...).
4. Add statuses (with colors, mark terminal ones) and choose the initial status.
5. Add actions: label, allowed roles, from-statuses, target status, optional
   confirmation and required reason input.
6. Choose table columns, then **Publish**.

The workflow immediately appears in navigation and uses the shared queue,
forms, detail view, permissions, and audit. Payment Exceptions was created
this way (seeded in `prisma/seed-data/payment-exceptions.ts`).

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

- **Custom detail UI:** build a component in
  `src/components/workflow/custom/`, register it in `custom/index.tsx`, set
  `customDetailComponent: "YourComponent"` on the definition. The Feature
  Flags panel (`feature-flag-detail.tsx`) is the reference example.
- **New guard type:** extend `actionGuardSchema` in `types.ts`, implement in
  `checkAction` (`permissions.ts`), unit-test it.
- **Real integration:** implement `IntegrationAdapter`
  (`src/lib/integrations/`), reference it from an action's `integration` key.
