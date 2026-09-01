"use client";

import type { FieldDefinition, RecordDTO, WorkflowDefinition } from "@/lib/workflows/types";
import { saveRecordFields } from "@/app/actions";
import { DynamicForm } from "@/components/workflow/dynamic-form";

export function EditFieldsForm({
  wf,
  record,
  fields,
}: {
  wf: WorkflowDefinition;
  record: RecordDTO;
  fields: FieldDefinition[];
}) {
  return (
    <DynamicForm
      fields={fields}
      initialValues={record.data}
      submitLabel="Save changes"
      onSubmit={(values) => saveRecordFields(wf.slug, record.id, values)}
    />
  );
}
