"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentUser, PERSONA_COOKIE } from "@/lib/auth/session";
import { getPersona } from "@/lib/auth/personas";
import { canSeeWorkflow } from "@/lib/auth/permissions";
import { getWorkflow } from "@/lib/workflows/registry";
import {
  ActionError,
  createRecord,
  executeAction,
  updateRecordFields,
} from "@/lib/workflows/engine";
import { recordAuditEvent } from "@/lib/audit";
import { workflowDefinitionSchema } from "@/lib/workflows/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(e: unknown): ActionResult {
  if (e instanceof ActionError) return { ok: false, error: e.message };
  console.error(e);
  return { ok: false, error: "Something went wrong." };
}

export async function switchPersona(personaId: string) {
  const persona = getPersona(personaId);
  cookies().set(PERSONA_COOKIE, persona.id, { path: "/" });
  revalidatePath("/", "layout");
}

export async function runWorkflowAction(
  slug: string,
  recordId: string,
  actionKey: string,
  inputs: Record<string, string>
): Promise<ActionResult> {
  try {
    const wf = await getWorkflow(slug);
    const actor = getCurrentUser();
    if (!wf || !canSeeWorkflow(actor, wf)) throw new ActionError("Workflow not found");
    await executeAction({ wf, recordId, actionKey, actor, inputs });
    revalidatePath(`/w/${slug}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function saveRecordFields(
  slug: string,
  recordId: string,
  updates: Record<string, unknown>
): Promise<ActionResult> {
  try {
    const wf = await getWorkflow(slug);
    const actor = getCurrentUser();
    if (!wf || !canSeeWorkflow(actor, wf)) throw new ActionError("Workflow not found");
    await updateRecordFields({ wf, recordId, actor, updates });
    revalidatePath(`/w/${slug}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function createWorkflowRecord(
  slug: string,
  data: Record<string, unknown>
): Promise<ActionResult & { recordId?: string }> {
  try {
    const wf = await getWorkflow(slug);
    const actor = getCurrentUser();
    if (!wf || !canSeeWorkflow(actor, wf)) throw new ActionError("Workflow not found");
    const rec = await createRecord({ wf, actor, data });
    revalidatePath(`/w/${slug}`);
    return { ok: true, recordId: rec.id };
  } catch (e) {
    return fail(e);
  }
}

// --- Workflow Studio (Level 1 configuration) --------------------------------

const STUDIO_ROLES = ["ops_admin", "eng_admin"];

export async function saveStudioWorkflow(
  definitionJson: string,
  publish: boolean
): Promise<ActionResult> {
  try {
    const actor = getCurrentUser();
    if (!STUDIO_ROLES.includes(actor.role))
      throw new ActionError("Only admins can manage Workflow Studio.");
    const parsed = workflowDefinitionSchema.safeParse(JSON.parse(definitionJson));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ActionError(`Invalid definition: ${issue.path.join(".")} — ${issue.message}`);
    }
    const def = parsed.data;
    const existing = await prisma.studioWorkflow.findUnique({ where: { slug: def.slug } });
    if (existing) {
      await prisma.studioWorkflow.update({
        where: { slug: def.slug },
        data: { definition: JSON.stringify(def), published: publish },
      });
    } else {
      await prisma.studioWorkflow.create({
        data: { slug: def.slug, definition: JSON.stringify(def), published: publish },
      });
    }
    await recordAuditEvent({
      actor,
      workflow: def.slug,
      action: publish ? "Published workflow definition" : "Saved workflow draft",
      metadata: { name: def.name, fields: def.fields.length, statuses: def.statuses.length },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function duplicateStudioWorkflow(slug: string): Promise<ActionResult & { slug?: string }> {
  try {
    const actor = getCurrentUser();
    if (!STUDIO_ROLES.includes(actor.role))
      throw new ActionError("Only admins can manage Workflow Studio.");
    const source = await prisma.studioWorkflow.findUnique({ where: { slug } });
    if (!source) throw new ActionError("Workflow not found.");
    const def = workflowDefinitionSchema.parse(JSON.parse(source.definition));
    let copySlug = `${def.slug}-copy`;
    let n = 2;
    while (await prisma.studioWorkflow.findUnique({ where: { slug: copySlug } })) {
      copySlug = `${def.slug}-copy-${n++}`;
    }
    const copy = { ...def, slug: copySlug, name: `${def.name} (copy)` };
    await prisma.studioWorkflow.create({
      data: { slug: copySlug, definition: JSON.stringify(copy), published: false },
    });
    await recordAuditEvent({
      actor,
      workflow: copySlug,
      action: "Duplicated workflow definition",
      metadata: { source: slug },
    });
    revalidatePath("/studio");
    return { ok: true, slug: copySlug };
  } catch (e) {
    return fail(e);
  }
}

export async function setStudioWorkflowArchived(
  slug: string,
  archived: boolean
): Promise<ActionResult> {
  try {
    const actor = getCurrentUser();
    if (!STUDIO_ROLES.includes(actor.role))
      throw new ActionError("Only admins can manage Workflow Studio.");
    await prisma.studioWorkflow.update({ where: { slug }, data: { archived } });
    await recordAuditEvent({
      actor,
      workflow: slug,
      action: archived ? "Archived workflow" : "Restored workflow",
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteStudioWorkflow(slug: string): Promise<ActionResult> {
  try {
    const actor = getCurrentUser();
    if (!STUDIO_ROLES.includes(actor.role))
      throw new ActionError("Only admins can manage Workflow Studio.");
    await prisma.studioWorkflow.delete({ where: { slug } });
    await recordAuditEvent({ actor, workflow: slug, action: "Deleted studio workflow" });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// --- Platform settings -------------------------------------------------------

export async function updatePlatformSetting(
  key: string,
  value: unknown
): Promise<ActionResult> {
  try {
    const actor = getCurrentUser();
    if (!STUDIO_ROLES.includes(actor.role))
      throw new ActionError("Only admins can change platform settings.");
    await prisma.platformSetting.upsert({
      where: { key },
      create: { key, value: JSON.stringify(value) },
      update: { value: JSON.stringify(value) },
    });
    await recordAuditEvent({
      actor,
      workflow: "platform",
      action: `Updated setting ${key}`,
      metadata: { value },
    });
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
