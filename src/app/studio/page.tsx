import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { CODE_WORKFLOWS } from "@/workflows";
import { workflowDefinitionSchema } from "@/lib/workflows/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkflowRowActions } from "./workflow-row-actions";

// Workflow Builder home: every workflow on the platform, whether defined in
// code (system) or configured here (builder), plus create/duplicate/edit/
// archive management for builder-defined workflows.
export default async function StudioPage() {
  const user = getCurrentUser();
  if (user.role !== "ops_admin" && user.role !== "eng_admin") notFound();

  const studioWorkflows = await prisma.studioWorkflow.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Workflow Builder</h1>
          <p className="mt-1 text-sm text-slate-500">
            A guided way to assemble new business workflows from the platform&apos;s reusable
            primitives — queues, forms, states, permissions, rules, and audit — without code.
          </p>
        </div>
        <Button asChild>
          <Link href="/studio/new">
            <Plus className="h-4 w-4" /> Create workflow
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Builder-defined workflows</CardTitle>
          <CardDescription>
            Configured here, stored in the database, and served by the same runtime as
            code-defined workflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {studioWorkflows.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              No builder workflows yet. Create one to see it appear in the navigation.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {studioWorkflows.map((w) => {
                const def = workflowDefinitionSchema.parse(JSON.parse(w.definition));
                return (
                  <li key={w.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{def.name}</p>
                        <Badge color="purple">Builder</Badge>
                        {def.category && <Badge color="gray">{def.category}</Badge>}
                        {w.archived ? (
                          <Badge color="gray">Archived</Badge>
                        ) : (
                          <Badge color={w.published ? "green" : "yellow"}>
                            {w.published ? "Published" : "Draft"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{def.description}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Record: {def.recordNoun} · {def.fields.length} fields ·{" "}
                        {def.statuses.length} states · {def.actions.length} actions · Updated{" "}
                        {w.updatedAt.toLocaleDateString()}
                      </p>
                    </div>
                    <WorkflowRowActions slug={w.slug} published={w.published} archived={w.archived} />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System workflows (code-defined)</CardTitle>
          <CardDescription>
            Declared in <code className="text-xs">src/workflows/</code>: versioned in git,
            reviewed like any code, and able to attach custom components and integrations.
            Ask Devin or an engineer to modify these — they cannot be edited or archived here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-slate-100">
            {CODE_WORKFLOWS.map((wf) => (
              <li key={wf.slug} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{wf.name}</p>
                    <Badge color="blue">System</Badge>
                  </div>
                  <p className="text-sm text-slate-500">{wf.description}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Record: {wf.recordNoun} · {wf.fields.length} fields · {wf.statuses.length}{" "}
                    states · {wf.actions.length} actions
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/w/${wf.slug}`}>Open</Link>
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
