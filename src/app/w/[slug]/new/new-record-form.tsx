"use client";

import { useRouter } from "next/navigation";
import type { WorkflowDefinition } from "@/lib/workflows/types";
import { createWorkflowRecord } from "@/app/actions";
import { DynamicForm } from "@/components/workflow/dynamic-form";

export function NewRecordForm({ wf }: { wf: WorkflowDefinition }) {
  const router = useRouter();
  return (
    <DynamicForm
      fields={wf.fields}
      submitLabel={`Create ${wf.recordNoun}`}
      onSubmit={async (values) => {
        const result = await createWorkflowRecord(wf.slug, values);
        if (result.ok && result.recordId) {
          router.push(`/w/${wf.slug}/r/${result.recordId}`);
        }
        return result;
      }}
    />
  );
}
