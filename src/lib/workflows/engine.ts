import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { checkAction } from "@/lib/auth/permissions";
import { getIntegration } from "@/lib/integrations";
import type { User } from "@/lib/auth/personas";
import type { WorkflowDefinition, RecordDTO } from "./types";
import { validatePartialRecordData } from "./validate";

export class ActionError extends Error {}

export async function getSettings(): Promise<Record<string, unknown>> {
  const rows = await prisma.platformSetting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
}

export function toDTO(row: {
  id: string;
  workflow: string;
  status: string;
  assigneeId: string | null;
  data: string;
  createdAt: Date;
  updatedAt: Date;
}): RecordDTO {
  return {
    id: row.id,
    workflow: row.workflow,
    status: row.status,
    assigneeId: row.assigneeId,
    data: JSON.parse(row.data),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Execute a workflow action against a record. This is THE single entry point
// for state transitions: role checks, status checks, business guards,
// integrations and audit logging all happen here, server-side.
export async function executeAction(opts: {
  wf: WorkflowDefinition;
  recordId: string;
  actionKey: string;
  actor: User;
  inputs?: Record<string, string>;
}): Promise<RecordDTO> {
  const { wf, recordId, actionKey, actor, inputs = {} } = opts;

  const action = wf.actions.find((a) => a.key === actionKey);
  if (!action) throw new ActionError(`Unknown action "${actionKey}"`);

  const row = await prisma.workflowRecord.findUnique({ where: { id: recordId } });
  if (!row || row.workflow !== wf.slug)
    throw new ActionError("Record not found");

  const data = JSON.parse(row.data) as Record<string, unknown>;
  const settings = await getSettings();

  const check = checkAction(action, actor, row.status, { data, settings });
  if (!check.allowed) throw new ActionError(check.reason ?? "Not allowed");

  for (const input of action.requiredInputs) {
    if (!inputs[input.key]?.toString().trim())
      throw new ActionError(`"${input.label}" is required.`);
  }

  const newStatus = action.toStatus ?? row.status;
  const newAssignee = action.assignToActor
    ? actor.id
    : action.clearAssignee
      ? null
      : row.assigneeId;

  // Persist action inputs (e.g. rejection reason) into the record's data
  // under a namespaced key so they show up in the detail view/history.
  const mergedData = { ...data };
  for (const input of action.requiredInputs) {
    mergedData[`${action.key}_${input.key}`] = inputs[input.key];
  }

  let integrationDetail: string | undefined;
  if (action.integration) {
    const adapter = getIntegration(action.integration);
    if (adapter) {
      const result = await adapter.execute({
        recordId,
        workflow: wf.slug,
        action: action.key,
        data: mergedData,
      });
      integrationDetail = result.detail;
      if (!result.ok) throw new ActionError(`Integration failed: ${result.detail}`);
    }
  }

  const updated = await prisma.workflowRecord.update({
    where: { id: recordId },
    data: {
      status: newStatus,
      assigneeId: newAssignee,
      data: JSON.stringify(mergedData),
    },
  });

  await recordAuditEvent({
    actor,
    workflow: wf.slug,
    recordId,
    action: action.label,
    fromState: row.status,
    toState: newStatus,
    metadata: {
      ...(Object.keys(inputs).length ? { inputs } : {}),
      ...(integrationDetail ? { integration: integrationDetail } : {}),
    },
  });

  return toDTO(updated);
}

// Edit permitted fields on a record (validated + audited).
export async function updateRecordFields(opts: {
  wf: WorkflowDefinition;
  recordId: string;
  actor: User;
  updates: Record<string, unknown>;
}): Promise<RecordDTO> {
  const { wf, recordId, actor, updates } = opts;
  const editableKeys = new Set(wf.fields.filter((f) => f.editable).map((f) => f.key));
  for (const key of Object.keys(updates)) {
    if (!editableKeys.has(key)) throw new ActionError(`Field "${key}" is not editable.`);
  }
  const validated = validatePartialRecordData(wf, updates);

  const row = await prisma.workflowRecord.findUnique({ where: { id: recordId } });
  if (!row || row.workflow !== wf.slug) throw new ActionError("Record not found");

  const data = { ...(JSON.parse(row.data) as Record<string, unknown>), ...validated };
  const updated = await prisma.workflowRecord.update({
    where: { id: recordId },
    data: { data: JSON.stringify(data) },
  });

  await recordAuditEvent({
    actor,
    workflow: wf.slug,
    recordId,
    action: "Edited fields",
    metadata: { updates: validated },
  });

  return toDTO(updated);
}

// Create a new record (used by studio workflows and form submissions).
export async function createRecord(opts: {
  wf: WorkflowDefinition;
  actor: User;
  data: Record<string, unknown>;
}): Promise<RecordDTO> {
  const { wf, actor, data } = opts;
  const withDefaults = { ...data };
  for (const field of wf.fields) {
    if (field.defaultValue !== undefined && withDefaults[field.key] === undefined) {
      withDefaults[field.key] = field.defaultValue;
    }
  }
  const validated = validatePartialRecordData(wf, withDefaults);
  const row = await prisma.workflowRecord.create({
    data: {
      workflow: wf.slug,
      status: wf.initialStatus,
      data: JSON.stringify(validated),
    },
  });
  await recordAuditEvent({
    actor,
    workflow: wf.slug,
    recordId: row.id,
    action: "Created record",
    toState: wf.initialStatus,
  });
  return toDTO(row);
}
