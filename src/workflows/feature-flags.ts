import { defineWorkflow } from "@/lib/workflows/types";

// Feature Flags — demonstrates the platform supporting an admin-panel style
// workflow (not a queue/approval process) while reusing RBAC, audit,
// confirmation and integration primitives. It attaches a Level 3 custom
// detail component ("FeatureFlagDetail") for the flag-specific controls.

export const featureFlags = defineWorkflow({
  slug: "feature-flags",
  name: "Feature Flags",
  description: "Manage feature flags across environments.",
  icon: "ToggleLeft",
  recordNoun: "flag",
  visibleToRoles: ["ops_admin", "eng_admin", "supervisor"],
  titleField: "flagKey",
  customDetailComponent: "FeatureFlagDetail",
  fields: [
    { key: "flagKey", label: "Flag Key", type: "text", required: true },
    { key: "description", label: "Description", type: "longText", editable: true },
    { key: "owner", label: "Owner", type: "text", required: true },
    {
      key: "environment",
      label: "Environment",
      type: "select",
      options: ["development", "staging", "production"],
      required: true,
    },
    { key: "enabled", label: "Enabled", type: "boolean", required: true, editable: true },
    { key: "rolloutPercentage", label: "Rollout %", type: "percentage", required: true, editable: true },
    {
      key: "targetSegment",
      label: "Target Segment",
      type: "select",
      options: ["All users", "Internal users", "Beta cohort", "Enterprise accounts", "New signups"],
      editable: true,
    },
    { key: "createdAt2", label: "Created", type: "date" },
  ],
  statuses: [
    { key: "active", label: "Active", color: "green" },
    { key: "archived", label: "Archived", color: "gray", terminal: true },
  ],
  initialStatus: "active",
  actions: [
    {
      key: "archive",
      label: "Archive Flag",
      fromStatuses: ["active"],
      toStatus: "archived",
      roles: ["eng_admin"],
      confirm: true,
      confirmMessage: "Archive this flag? It will stop being evaluated.",
      variant: "destructive",
      integration: "feature-flag-provider",
    },
  ],
  views: [
    { key: "all", label: "All Flags", filter: {} },
    { key: "production", label: "Production", filter: { fieldEquals: { environment: "production" } } },
    { key: "staging", label: "Staging", filter: { fieldEquals: { environment: "staging" } } },
    { key: "development", label: "Development", filter: { fieldEquals: { environment: "development" } } },
  ],
  tableColumns: ["flagKey", "environment", "enabled", "rolloutPercentage", "owner", "targetSegment"],
  dashboardCards: [
    { type: "recordCount", label: "Active Flags", statuses: ["active"] },
  ],
});
