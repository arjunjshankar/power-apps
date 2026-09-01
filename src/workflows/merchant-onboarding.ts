import { defineWorkflow } from "@/lib/workflows/types";

// Merchant Onboarding — proof-of-concept workflow #4. Built entirely from the
// declarative definition (Level 2): no new queue, form, action, permission or
// audit code was written for this workflow. See docs/DEVIN_BUILD_LOG.md for
// the reuse inventory.

export const merchantOnboarding = defineWorkflow({
  slug: "merchant-onboarding",
  name: "Merchant Onboarding",
  description: "Review and approve new merchant applications.",
  icon: "Store",
  recordNoun: "application",
  visibleToRoles: ["analyst", "supervisor", "ops_admin", "eng_admin"],
  titleField: "businessName",
  fields: [
    { key: "businessName", label: "Business Name", type: "text", required: true },
    {
      key: "businessType",
      label: "Business Type",
      type: "select",
      options: ["E-commerce", "SaaS", "Marketplace", "Retail POS", "Professional Services"],
      required: true,
    },
    { key: "country", label: "Country", type: "select", options: ["US", "UK", "EU", "CA", "AU"], required: true },
    { key: "expectedMonthlyVolume", label: "Expected Monthly Volume", type: "money", required: true, currencyField: "volumeCurrency" },
    { key: "volumeCurrency", label: "Currency", type: "select", options: ["USD"], required: true },
    { key: "riskTier", label: "Risk Tier", type: "select", options: ["Tier 1 (Low)", "Tier 2 (Medium)", "Tier 3 (High)"], required: true },
    { key: "contactEmail", label: "Contact Email", type: "text", required: true },
    { key: "appliedAt", label: "Applied", type: "date", required: true },
    { key: "documentsComplete", label: "Documents Complete", type: "boolean" },
    { key: "notes", label: "Notes", type: "longText", editable: true },
  ],
  statuses: [
    { key: "submitted", label: "Submitted", color: "gray" },
    { key: "under_review", label: "Under Review", color: "blue" },
    { key: "docs_requested", label: "Docs Requested", color: "yellow" },
    { key: "approved", label: "Approved", color: "green", terminal: true },
    { key: "declined", label: "Declined", color: "red", terminal: true },
  ],
  initialStatus: "submitted",
  actions: [
    {
      key: "assign_to_me",
      label: "Assign to Me",
      fromStatuses: ["submitted", "docs_requested"],
      toStatus: "under_review",
      roles: ["analyst", "supervisor"],
      assignToActor: true,
    },
    {
      key: "request_documents",
      label: "Request Documents",
      fromStatuses: ["under_review"],
      toStatus: "docs_requested",
      roles: ["analyst", "supervisor"],
      requiredInputs: [{ key: "documents", label: "Documents needed", type: "longText" }],
      integration: "notification-service",
    },
    {
      key: "approve",
      label: "Approve Merchant",
      fromStatuses: ["under_review"],
      toStatus: "approved",
      roles: ["analyst", "supervisor"],
      confirm: true,
      confirmMessage: "Approve this merchant for live payment processing?",
      variant: "primary",
      guards: [
        {
          type: "amountThreshold",
          field: "expectedMonthlyVolume",
          threshold: 500000,
          requiredRoles: ["supervisor"],
          message: "Merchants with expected volume ≥ $500k/month require supervisor approval.",
        },
      ],
      integration: "notification-service",
    },
    {
      key: "decline",
      label: "Decline",
      fromStatuses: ["under_review", "docs_requested"],
      toStatus: "declined",
      roles: ["analyst", "supervisor"],
      confirm: true,
      requiredInputs: [{ key: "reason", label: "Decline reason", type: "longText" }],
      variant: "destructive",
    },
  ],
  views: [
    { key: "all", label: "All Applications", filter: {} },
    { key: "unassigned", label: "Unassigned", filter: { unassigned: true, statuses: ["submitted"] } },
    { key: "mine", label: "Assigned to Me", filter: { assignedToMe: true } },
    { key: "high_risk", label: "Tier 3 (High Risk)", filter: { fieldEquals: { riskTier: "Tier 3 (High)" } } },
    { key: "completed", label: "Completed", filter: { statuses: ["approved", "declined"] } },
  ],
  tableColumns: ["businessName", "businessType", "country", "expectedMonthlyVolume", "riskTier", "appliedAt"],
  dashboardCards: [
    { type: "recordCount", label: "Open Applications", statuses: ["submitted", "under_review", "docs_requested"] },
    { type: "statusCount", label: "Approved", statuses: ["approved"] },
  ],
});
