import type { WorkflowDefinition } from "@/lib/workflows/types";
import { kycReview } from "./kyc-review";
import { refunds } from "./refunds";
import { featureFlags } from "./feature-flags";
import { merchantOnboarding } from "./merchant-onboarding";

// Code-defined workflows. To add one: create a file exporting defineWorkflow(...)
// and add it here. Studio-created workflows register themselves via the
// database instead (see src/lib/workflows/registry.ts).
export const CODE_WORKFLOWS: WorkflowDefinition[] = [
  kycReview,
  refunds,
  featureFlags,
  merchantOnboarding,
];
