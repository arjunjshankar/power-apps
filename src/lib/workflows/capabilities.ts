import type { WorkflowDefinition, WorkflowDefinitionInput } from "./types";
import { ROLE_LABELS, workflowDefinitionSchema } from "./types";

// Derives, from an actual workflow definition, which shared platform
// capabilities the workflow consumes. Rendered in Workflow Builder so reuse
// is visible rather than asserted.

export interface PlatformCapability {
  name: string;
  detail: string;
}

export function platformCapabilities(
  input: WorkflowDefinition | WorkflowDefinitionInput
): PlatformCapability[] {
  const def = workflowDefinitionSchema.parse(input);
  const caps: PlatformCapability[] = [
    {
      name: "Shared queue & table",
      detail: `${def.tableColumns.length} configured columns, search and sorting via the platform QueueTable`,
    },
    {
      name: "Record detail pages",
      detail: "Generic /w/[slug]/r/[id] detail view with metadata grid and history",
    },
    {
      name: "Dynamic forms",
      detail: `${def.fields.length} field definitions rendered by the shared form engine`,
    },
    {
      name: "Workflow engine",
      detail: `${def.statuses.length} statuses, ${def.actions.length} actions — one server-side state-change path`,
    },
    {
      name: "Role-based access control",
      detail: `Visible to ${def.visibleToRoles.map((r) => ROLE_LABELS[r]).join(", ")}; per-action role checks enforced server-side`,
    },
    {
      name: "Audit logging",
      detail: "Every state-changing action writes an immutable audit event",
    },
  ];
  if (def.actions.some((a) => a.confirm)) {
    caps.push({
      name: "Confirmation dialogs",
      detail: `${def.actions.filter((a) => a.confirm).length} action(s) require explicit confirmation`,
    });
  }
  if (def.actions.some((a) => a.guards.length > 0)) {
    caps.push({
      name: "Business rules",
      detail: `${def.actions.reduce((n, a) => n + a.guards.length, 0)} guard rule(s) evaluated in the shared permission checker`,
    });
  }
  if (def.views.length > 0) {
    caps.push({
      name: "Predefined views",
      detail: `${def.views.length} saved queue views (${def.views.map((v) => v.label).join(", ")})`,
    });
  }
  if (def.dashboardCards.length > 0) {
    caps.push({
      name: "Dashboard cards",
      detail: `${def.dashboardCards.length} metric card(s) computed by the shared dashboard engine`,
    });
  }
  return caps;
}

// A ready-to-use Devin prompt for extending the configured workflow with
// full-code behavior — the handoff from configuration to engineering.
export function generateDevinPrompt(
  input: WorkflowDefinition | WorkflowDefinitionInput
): string {
  const def = workflowDefinitionSchema.parse(input);
  return [
    `Extend the "${def.name}" workflow (slug: ${def.slug}) in the Operations Platform.`,
    `Reuse the existing workflow runtime, RBAC, audit logging, queue, and record-detail components — do not build parallel infrastructure.`,
    `The workflow currently has fields [${def.fields.map((f) => f.key).join(", ")}], statuses [${def.statuses.map((s) => s.key).join(", ")}], and actions [${def.actions.map((a) => a.key).join(", ")}].`,
    `Example extensions: add a custom detail panel (register it in src/components/workflow/custom/ and set customDetailComponent), add an integration adapter in src/lib/integrations/ and reference it from an action, or add a new guard type in src/lib/workflows/types.ts + src/lib/auth/permissions.ts.`,
    `Add unit tests for any new guard or engine logic and a Playwright test for new user-facing behavior. Preserve the existing workflow configuration.`,
  ].join(" ");
}
