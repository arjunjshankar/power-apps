import type { ComponentType } from "react";
import type { RecordDTO, WorkflowDefinition } from "@/lib/workflows/types";
import type { User } from "@/lib/auth/personas";
import { FeatureFlagDetail } from "./feature-flag-detail";

export interface CustomDetailProps {
  wf: WorkflowDefinition;
  record: RecordDTO;
  user: User;
}

// Registry of Level 3 custom detail components. A workflow opts in by setting
// customDetailComponent to one of these keys in its definition.
export const CUSTOM_DETAIL_COMPONENTS: Record<string, ComponentType<CustomDetailProps>> = {
  FeatureFlagDetail,
};
