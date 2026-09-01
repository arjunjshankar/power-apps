# Power Apps Replacement Mapping

What this POC reproduces from a low-code internal-tool platform, what it
intentionally does not, and how future workflows map onto the architecture.

## Capabilities reproduced

| Power Apps capability | Platform equivalent |
|---|---|
| Canvas/model-driven app per business process | Workflow definition (declarative file or Studio) rendered by generic routes |
| Data tables / galleries | `QueueTable` — search, sort, saved views, status/assignee columns |
| Forms | `DynamicForm` generated from field definitions |
| Business rules / conditional logic | Action guards (role, status, threshold) evaluated server-side |
| Approvals & stage gates | Status transitions with role-restricted actions, confirmations, required inputs |
| Role-based sharing | `visibleToRoles` + per-action `roles`, enforced server-side |
| Audit / activity | `AuditEvent` — record-level history and global audit view |
| Dashboards | Definition-driven dashboard cards (counts, sums) |
| Maker portal (citizen development) | Workflow Studio — create fields/statuses/actions/roles, publish, use immediately |
| Environment variables / settings | `PlatformSetting` (e.g. refund approval threshold) editable in Administration |
| Connectors | `IntegrationAdapter` interface with mock KYC/refund/flag/notification adapters |

## Intentionally not reproduced

- **A general visual programming language / formula bar.** Unique logic is
  ordinary TypeScript — that is the point of owning the platform.
- **Hundreds of prebuilt connectors.** Integrations are explicit, typed
  adapters added per need (by an engineer or Devin).
- **Pixel-level canvas designer.** The platform ships one coherent, accessible
  enterprise UI; layout is not a per-app concern.
- **Dataverse.** Records are validated JSON over Prisma; hot workflows can be
  promoted to dedicated tables when justified.
- **Power Automate-style background flows.** Out of scope for the POC; the
  action/integration seam is where they would attach.

## How the five demo workflows map

| Workflow | What it exercised | Marginal cost |
|---|---|---|
| KYC Review | Built the runtime: queue, detail, transitions, RBAC, guards, audit, assignment | High (foundation) |
| Refunds | Reused everything; added dashboard cards + a configurable money threshold guard | Low |
| Feature Flags | Reused shell/RBAC/audit/registry; added one custom detail component | Low + one component |
| Merchant Onboarding | Pure declarative definition, zero new components | Very low (~150 lines + seeds) |
| Payment Exceptions | Created via Workflow Studio configuration only | Near zero (no code) |

## Mapping the next 10 workflows

- Queue/review/approve processes (chargebacks, disputes, vendor reviews,
  access requests, compliance attestations): **Studio or a declarative file.**
- Admin panels over internal state (limits, pricing tables, routing rules):
  declarative definition + possibly a custom detail component.
- Anything needing a real external system: same definition + a real
  `IntegrationAdapter` implementation.
