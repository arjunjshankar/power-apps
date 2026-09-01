import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { workflowDefinitionSchema } from "@/lib/workflows/types";
import { WorkflowBuilder } from "../workflow-builder";

export default async function EditStudioWorkflowPage({
  params,
}: {
  params: { slug: string };
}) {
  const user = getCurrentUser();
  if (user.role !== "ops_admin" && user.role !== "eng_admin") notFound();

  const row = await prisma.studioWorkflow.findUnique({ where: { slug: params.slug } });
  if (!row) notFound();
  const def = workflowDefinitionSchema.parse(JSON.parse(row.definition));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit workflow: {def.name}</h1>
        <p className="mt-1 text-sm text-slate-500">Changes take effect when re-published.</p>
      </div>
      <WorkflowBuilder existing={def} />
    </div>
  );
}
