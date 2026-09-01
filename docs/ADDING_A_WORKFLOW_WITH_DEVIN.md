# Adding a Workflow with Devin

After the platform exists, new internal tools are described as business
requirements and implemented by Devin against the conventions in
[AGENTS.md](../AGENTS.md). These prompt shapes are what a team would actually
send.

## Prompt: a standard review workflow

> Add a chargeback review workflow to the Operations Platform. Reuse the
> existing queue, workflow, permission, audit, form, and record-detail
> primitives — declarative definition in `src/workflows/`, no new pages.
> Fields: case ID, payment ID, customer, amount, currency, network reason
> code, received date, respond-by date, evidence notes (editable). Statuses:
> New → In Review → Accepted / Disputed / Won / Lost. Analysts may assign,
> review, and accept; supervisors may additionally dispute. Disputing a
> chargeback at or above the configurable `chargeback.disputeThreshold`
> setting requires a supervisor. Add seeded demo data, unit tests for the
> threshold guard, and a Playwright test for the dispute flow.

## Prompt: a workflow with a custom UI

> Add a "Payout Limits" admin workflow. Reuse the platform's RBAC, audit, and
> registry, but give it a custom detail component (like FeatureFlagDetail)
> showing current limit vs. proposed limit with a slider. Only engineering
> admins may change production limits, with explicit confirmation. Audit every
> change with before/after values.

## Prompt: a real integration

> Replace the mock refund-provider adapter with a real Stripe Refunds API
> client. Keep the IntegrationAdapter interface. API key comes from the
> `STRIPE_API_KEY` environment variable — never in source. Add error handling
> so a failed refund call blocks the state transition and surfaces the error,
> and record the Stripe refund ID in the audit event metadata.

## Prompt: platform evolution

> Add CSV export to the shared QueueTable so every workflow gets it at once.
> Respect the current view's filters and the user's visible columns. Audit
> exports (actor, workflow, row count).

## Why this works

- `AGENTS.md` gives Devin the commands, conventions, and file map.
- The definition schema is typed and Zod-validated — malformed workflow
  configs fail at load, not in front of an operator.
- Tests (`npm test`, `npm run test:e2e`) let Devin verify its own work.
- Server-side enforcement means a new workflow can't accidentally bypass
  permissions or auditing: it inherits them by construction.
