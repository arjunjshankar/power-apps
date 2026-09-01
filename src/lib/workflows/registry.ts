import { prisma } from "@/lib/db";
import {
  workflowDefinitionSchema,
  type WorkflowDefinition,
} from "./types";
import { CODE_WORKFLOWS } from "@/workflows";

// The workflow registry merges two sources:
//  1. Code-defined workflows (src/workflows/*) — versioned in git, reviewed
//     like any other code, may attach custom components/behavior (Level 2/3).
//  2. Studio workflows — created by authorized operators in Workflow Studio
//     and stored in the database using the same schema (Level 1).
// Everything downstream (queues, forms, actions, audit) is source-agnostic.

export async function getAllWorkflows(): Promise<WorkflowDefinition[]> {
  const studio = await prisma.studioWorkflow.findMany({
    where: { published: true },
    orderBy: { createdAt: "asc" },
  });
  const studioDefs = studio.map((s) =>
    workflowDefinitionSchema.parse(JSON.parse(s.definition))
  );
  // Code workflows win on slug collision.
  const codeSlugs = new Set(CODE_WORKFLOWS.map((w) => w.slug));
  return [...CODE_WORKFLOWS, ...studioDefs.filter((d) => !codeSlugs.has(d.slug))];
}

export async function getWorkflow(
  slug: string
): Promise<WorkflowDefinition | undefined> {
  const all = await getAllWorkflows();
  return all.find((w) => w.slug === slug);
}

export function isCodeWorkflow(slug: string): boolean {
  return CODE_WORKFLOWS.some((w) => w.slug === slug);
}
