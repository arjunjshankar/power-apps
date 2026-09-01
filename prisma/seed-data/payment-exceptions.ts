import { defineWorkflow } from "../../src/lib/workflows/types";

// Payment Exceptions — proof-of-concept workflow #5. Seeded as a PUBLISHED
// Workflow Studio workflow (stored in the database, not in code) to
// demonstrate that a non-technical operator can stand up a complete
// queue-driven workflow through configuration alone. It can be opened and
// edited live in Workflow Studio during a demo.

export const paymentExceptionsDefinition = defineWorkflow({
  slug: "payment-exceptions",
  name: "Payment Exceptions",
  description: "Investigate and resolve flagged payment exceptions.",
  icon: "AlertTriangle",
  recordNoun: "exception",
  visibleToRoles: ["analyst", "supervisor", "ops_admin", "eng_admin"],
  titleField: "transactionId",
  fields: [
    { key: "transactionId", label: "Transaction ID", type: "text", required: true },
    {
      key: "exceptionType",
      label: "Exception Type",
      type: "select",
      options: [
        "Settlement mismatch",
        "Duplicate capture",
        "Currency conversion error",
        "Timeout — unknown state",
        "Chargeback received",
      ],
      required: true,
    },
    { key: "amount", label: "Amount", type: "money", required: true },
    {
      key: "processor",
      label: "Processor",
      type: "select",
      options: ["Stripe", "Adyen", "Checkout.com"],
      required: true,
    },
    { key: "detectedAt", label: "Detected", type: "date", required: true },
    { key: "details", label: "Details", type: "longText", editable: true },
  ],
  statuses: [
    { key: "new", label: "New", color: "gray" },
    { key: "investigating", label: "Investigating", color: "blue" },
    { key: "resolved", label: "Resolved", color: "green", terminal: true },
    { key: "writtenOff", label: "Written Off", color: "red", terminal: true },
  ],
  initialStatus: "new",
  actions: [
    {
      key: "startInvestigation",
      label: "Start Investigation",
      fromStatuses: ["new"],
      toStatus: "investigating",
      roles: ["analyst", "supervisor"],
      assignToActor: true,
    },
    {
      key: "resolve",
      label: "Resolve",
      fromStatuses: ["investigating"],
      toStatus: "resolved",
      roles: ["analyst", "supervisor"],
      confirm: true,
      confirmMessage: "Mark this exception as resolved?",
      requiredInputs: [{ key: "resolution", label: "Resolution summary", type: "longText" }],
      variant: "primary",
    },
    {
      key: "writeOff",
      label: "Write Off",
      fromStatuses: ["investigating"],
      toStatus: "writtenOff",
      roles: ["supervisor"],
      confirm: true,
      confirmMessage: "Write off this exception? This is a financially consequential action.",
      requiredInputs: [{ key: "reason", label: "Write-off justification", type: "longText" }],
      variant: "destructive",
    },
  ],
  views: [
    { key: "all", label: "All", filter: {} },
    { key: "new", label: "New", filter: { statuses: ["new"] } },
    { key: "investigating", label: "Investigating", filter: { statuses: ["investigating"] } },
    { key: "completed", label: "Completed", filter: { statuses: ["resolved", "writtenOff"] } },
  ],
  tableColumns: ["transactionId", "exceptionType", "amount", "processor", "detectedAt"],
  dashboardCards: [
    { type: "recordCount", label: "Open Exceptions", statuses: ["new", "investigating"] },
    { type: "moneySum", label: "Open Amount", field: "amount", statuses: ["new", "investigating"] },
  ],
});
