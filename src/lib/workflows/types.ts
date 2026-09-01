import { z } from "zod";

// ---------------------------------------------------------------------------
// Workflow definition schema
// ---------------------------------------------------------------------------
// A WorkflowDefinition is the declarative description of an internal workflow:
// its fields, statuses, actions/transitions, views, permissions and dashboard.
// Code-defined workflows (src/workflows/*) and Workflow Studio-created
// workflows share this exact schema, so a studio workflow is a first-class
// citizen of the platform.

export const roleSchema = z.enum([
  "analyst",
  "supervisor",
  "ops_admin",
  "eng_admin",
]);
export type Role = z.infer<typeof roleSchema>;

export const ROLE_LABELS: Record<Role, string> = {
  analyst: "Analyst",
  supervisor: "Supervisor",
  ops_admin: "Operations Admin",
  eng_admin: "Engineering Admin",
};

export const fieldTypeSchema = z.enum([
  "text",
  "longText",
  "number",
  "money",
  "percentage",
  "boolean",
  "date",
  "datetime",
  "select",
  "multiSelect",
  "user",
]);
export type FieldType = z.infer<typeof fieldTypeSchema>;

export const fieldDefinitionSchema = z.object({
  key: z.string().min(1).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  label: z.string().min(1),
  type: fieldTypeSchema,
  required: z.boolean().default(false),
  editable: z.boolean().default(false),
  options: z.array(z.string()).optional(), // for select / multiSelect
  currencyField: z.string().optional(), // for money: key of sibling currency field
  helpText: z.string().optional(),
  // Whether the field appears on the record detail page (queue visibility is
  // controlled separately via tableColumns).
  showInDetail: z.boolean().default(true),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
});
export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>;

export const statusDefinitionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  color: z
    .enum(["gray", "blue", "yellow", "orange", "red", "green", "purple"])
    .default("gray"),
  terminal: z.boolean().default(false),
});
export type StatusDefinition = z.infer<typeof statusDefinitionSchema>;

// Guards add business-specific safeguards on top of the generic action
// machinery (e.g. "refunds over $X require a supervisor").

// If the numeric field `field` is >= `threshold` (or thresholdSettingKey's
// value), the action additionally requires one of `requiredRoles`.
export const amountThresholdGuardSchema = z.object({
  type: z.literal("amountThreshold"),
  field: z.string(),
  threshold: z.number().optional(),
  thresholdSettingKey: z.string().optional(),
  requiredRoles: z.array(roleSchema),
  message: z.string(),
});

export const ruleOperatorSchema = z.enum([
  "equals",
  "notEquals",
  "greaterThan",
  "lessThan",
  "contains",
  "isEmpty",
  "isNotEmpty",
]);
export type RuleOperator = z.infer<typeof ruleOperatorSchema>;

// A simple comparison-based business rule. When the condition matches, the
// action either requires one of `requiredRoles` (when non-empty) or is
// blocked entirely for everyone (when empty). Deliberately not an expression
// language: one field, one operator, one value.
export const ruleGuardSchema = z.object({
  type: z.literal("rule"),
  field: z.string(),
  operator: ruleOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  requiredRoles: z.array(roleSchema).default([]),
  message: z.string(),
});
export type RuleGuard = z.infer<typeof ruleGuardSchema>;

export const actionGuardSchema = z.discriminatedUnion("type", [
  amountThresholdGuardSchema,
  ruleGuardSchema,
]);
export type ActionGuard = z.infer<typeof actionGuardSchema>;

export const actionDefinitionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  // States the action is available from; empty array = any non-terminal state.
  fromStatuses: z.array(z.string()),
  toStatus: z.string().optional(), // omitted => no state change (e.g. assign)
  roles: z.array(roleSchema).min(1),
  confirm: z.boolean().default(false),
  confirmMessage: z.string().optional(),
  // Fields the user must fill in when executing the action (e.g. a rejection reason).
  requiredInputs: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        type: z.enum(["text", "longText", "number"]).default("text"),
      })
    )
    .default([]),
  // Set assignee to the current actor (Assign to Me).
  assignToActor: z.boolean().default(false),
  clearAssignee: z.boolean().default(false),
  variant: z.enum(["default", "primary", "destructive"]).default("default"),
  guards: z.array(actionGuardSchema).default([]),
  // Key of a registered integration to invoke (see src/lib/integrations).
  integration: z.string().optional(),
});
export type ActionDefinition = z.infer<typeof actionDefinitionSchema>;

export const viewDefinitionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  // Simple declarative filters evaluated server-side.
  filter: z
    .object({
      statuses: z.array(z.string()).optional(),
      assignedToMe: z.boolean().optional(),
      unassigned: z.boolean().optional(),
      fieldEquals: z.record(z.string(), z.string()).optional(),
    })
    .default({}),
});
export type ViewDefinition = z.infer<typeof viewDefinitionSchema>;

export const dashboardCardSchema = z.object({
  type: z.enum(["statusCount", "moneySum", "recordCount"]),
  label: z.string(),
  statuses: z.array(z.string()).optional(),
  field: z.string().optional(), // for moneySum
});
export type DashboardCard = z.infer<typeof dashboardCardSchema>;

export const workflowDefinitionSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().default(""),
  icon: z.string().default("ClipboardList"), // lucide icon name
  recordNoun: z.string().default("record"),
  recordNounPlural: z.string().optional(), // defaults to recordNoun + "s"
  category: z.string().optional(),
  // Roles allowed to see the workflow at all.
  visibleToRoles: z.array(roleSchema).min(1),
  fields: z.array(fieldDefinitionSchema).min(1),
  statuses: z.array(statusDefinitionSchema).min(1),
  initialStatus: z.string(),
  actions: z.array(actionDefinitionSchema),
  views: z.array(viewDefinitionSchema).default([]),
  // Field keys shown as table columns, in order.
  tableColumns: z.array(z.string()).min(1),
  defaultSort: z
    .object({
      field: z.string(),
      direction: z.enum(["asc", "desc"]).default("asc"),
    })
    .optional(),
  // Field keys included in queue search; empty = search all fields.
  searchableFields: z.array(z.string()).default([]),
  titleField: z.string(), // field used as the record's display title
  dashboardCards: z.array(dashboardCardSchema).default([]),
  showDashboard: z.boolean().default(false),
  // Level 3 escape hatch: name of a registered custom detail component
  // (see src/workflows/custom-components.tsx).
  customDetailComponent: z.string().optional(),
});
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;

// Convenience input type (before zod defaults are applied).
export type WorkflowDefinitionInput = z.input<typeof workflowDefinitionSchema>;

export function defineWorkflow(input: WorkflowDefinitionInput): WorkflowDefinition {
  return workflowDefinitionSchema.parse(input);
}

// ---------------------------------------------------------------------------
// Runtime record shape
// ---------------------------------------------------------------------------
export interface RecordDTO {
  id: string;
  workflow: string;
  status: string;
  assigneeId: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
