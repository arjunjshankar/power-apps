# Devin Build Log

Factual journal of the implementation work performed by Devin in a single
session to produce this POC. No productivity statistics are estimated or
implied — the leverage is meant to be observable in what each milestone reused.

## Milestone 1 — Foundation

- Scaffolded Next.js 14 (App Router) + TypeScript + Tailwind.
- Prisma + SQLite with four models: `WorkflowRecord`, `StudioWorkflow`,
  `AuditEvent`, `PlatformSetting`.
- Base UI primitives (button, badge, card, input, dialog on Radix), app shell,
  side navigation, persona switcher.

## Milestone 2 — Workflow runtime

- `WorkflowDefinition` Zod schema: fields (11 types), statuses, actions
  (roles, from/to statuses, guards, required inputs, confirmation,
  integration), views, table columns, dashboard cards.
- Registry merging code-defined workflows with published Studio workflows.
- Engine (`executeAction`) as the single server-side state-change path:
  role/status/guard checks → required inputs → integration adapter → persist →
  audit event.
- Record-data validation generated from field definitions.
- Mock integration adapters: kyc-provider, refund-provider,
  feature-flag-provider, notification-service.
- Generic pages: `/w/[slug]` queue, `/w/[slug]/r/[id]` detail, `/w/[slug]/new`.

## Milestone 3 — KYC Review (first workflow)

- Declarative definition: 9 fields, 6 statuses, 5 actions, 7 saved views.
- High-risk safeguard: approving/rejecting cases with risk score ≥ 70 requires
  a supervisor (guard, enforced server-side).
- This milestone consumed the runtime built in Milestone 2; no KYC-specific
  pages or table code exist.

## Milestone 4 — Refunds

- Reused: queue, detail, forms, actions, RBAC, audit, views — no new components.
- Added: dashboard cards (pending count, approved amount, pending amount,
  escalated) and the **configurable** `refund.approvalThreshold` platform
  setting used by the supervisor-approval guard.

## Milestone 5 — Feature Flags

- Reused: shell, registry, RBAC, audit, queue.
- Added one custom detail component (`FeatureFlagDetail`) — the Level 3
  full-code escape hatch: enable/disable, rollout slider, environment
  distinction, explicit confirmation for production changes.

## Milestone 6 — Workflow Studio + additional workflows

- Studio builder UI: fields, statuses, actions, role visibility, columns,
  publish/unpublish; definitions validated with the same schema and stored in
  the database.
- **Merchant Onboarding**: pure declarative definition (~150 lines), zero new
  components, volume-based supervisor guard.
- **Payment Exceptions**: created as a published Studio definition (seeded),
  demonstrating no-code workflow creation end to end.

## Milestone 7 — Cost view, audit, admin

- Global audit history with workflow filtering.
- Administration page: refund threshold setting editor + demo user directory.
- TCO calculator with the $250K/yr license baseline and editable, clearly
  hypothetical scenarios (see TCO_MODEL.md).

## Milestone 8 — Tests, seeds, docs

- 23 Vitest unit tests: engine transitions, audit generation, permission and
  threshold guards, definition/record validation.
- 6 Playwright e2e tests: analyst KYC review; analyst blocked from high-risk
  approval + supervisor approves; below-threshold refund approval;
  unauthorized feature-flag access (404); production flag safeguards;
  studio-created workflow renders and transitions.
- Seed: 44 records across 5 workflows, believable audit trail, 4 personas.
- Documentation set (this directory + README + AGENTS.md).

## Reuse summary

| Workflow | New runtime code required |
|---|---|
| KYC Review | The runtime itself (foundation) |
| Refunds | 1 definition file + 1 setting |
| Feature Flags | 1 definition file + 1 custom component |
| Merchant Onboarding | 1 definition file |
| Payment Exceptions | 0 files — Studio configuration only |
