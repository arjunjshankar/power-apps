import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { CODE_WORKFLOWS } from "@/workflows";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Workflow Studio home: Level 1 configuration for authorized operators.
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
          <h1 className="text-2xl font-semibold text-slate-900">Workflow Studio</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create and publish new business workflows without writing code.
          </p>
        </div>
        <Button asChild>
          <Link href="/studio/new">
            <Plus className="h-4 w-4" /> New workflow
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Studio workflows</CardTitle>
          <CardDescription>
            Configured here, stored in the database, and served by the same runtime as
            code-defined workflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {studioWorkflows.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              No studio workflows yet. Create one to see it appear in the navigation.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {studioWorkflows.map((w) => {
                const def = JSON.parse(w.definition) as { name: string; description: string };
                return (
                  <li key={w.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{def.name}</p>
                      <p className="text-sm text-slate-500">{def.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge color={w.published ? "green" : "yellow"}>
                        {w.published ? "Published" : "Draft"}
                      </Badge>
                      {w.published && (
                        <Link href={`/w/${w.slug}`} className="text-sm text-blue-600 hover:underline">
                          Open
                        </Link>
                      )}
                      <Link
                        href={`/studio/${w.slug}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Edit
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Code-defined workflows</CardTitle>
          <CardDescription>
            Declared in <code className="text-xs">src/workflows/</code> (Level 2/3): versioned in
            git, reviewed like any code, and able to attach custom components and integrations.
            Ask Devin or an engineer to modify these.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-slate-100">
            {CODE_WORKFLOWS.map((wf) => (
              <li key={wf.slug} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{wf.name}</p>
                  <p className="text-sm text-slate-500">{wf.description}</p>
                </div>
                <Badge color="blue">Code</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
