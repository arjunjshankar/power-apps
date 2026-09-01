import { z } from "zod";
import type { FieldDefinition, WorkflowDefinition } from "./types";

// Build a zod validator for a record's data payload from field definitions.
// This is how user-controlled data is validated before persistence.
export function buildRecordSchema(fields: FieldDefinition[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    let s: z.ZodTypeAny;
    switch (f.type) {
      case "number":
      case "money":
      case "percentage":
        s = z.coerce.number();
        break;
      case "boolean":
        s = z.coerce.boolean();
        break;
      case "date":
      case "datetime":
        s = z.string().min(1);
        break;
      case "select":
        s = f.options?.length ? z.enum(f.options as [string, ...string[]]) : z.string();
        break;
      case "multiSelect":
        s = z.array(z.string());
        break;
      default:
        s = z.string();
    }
    shape[f.key] = f.required ? s : s.optional().nullable();
  }
  return z.object(shape).passthrough();
}

export function validateRecordData(
  wf: WorkflowDefinition,
  data: Record<string, unknown>
) {
  return buildRecordSchema(wf.fields).parse(data);
}

// Validate only the fields present (partial edit).
export function validatePartialRecordData(
  wf: WorkflowDefinition,
  data: Record<string, unknown>
) {
  return buildRecordSchema(wf.fields).partial().parse(data);
}
