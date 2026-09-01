import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { canSeeWorkflow } from "@/lib/auth/permissions";
import { getAllWorkflows } from "@/lib/workflows/registry";
import { computeDashboardCards } from "@/lib/workflows/queries";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkflowIcon } from "@/components/shell/icon";
import { formatDistanceToNow } from "date-fns";

export default async function OverviewPage() {
  const user = getCurrentUser();
  const workflows = (await getAllWorkflows()).filter((wf) => canSeeWorkflow(user, wf));

  const [cardsByWorkflow, recentAudit, recordCounts] = await Promise.all([
    Promise.all(workflows.map((wf) => computeDashboardCards(wf))),
    prisma.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    Promise.all(
      workflows.map((wf) => prisma.workflowRecord.count({ where: { workflow: wf.slug } }))
    ),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Operations Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          One platform, {workflows.length} workflows — shared queues, permissions, forms, and audit.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {workflows.map((wf, i) => (
          <Link key={wf.slug} href={`/w/${wf.slug}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="flex-row items-start gap-3 space-y-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100">
                  <WorkflowIcon name={wf.icon} className="h-4.5 w-4.5 text-slate-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="flex items-center gap-1.5">
                    {wf.name}
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  </CardTitle>
                  <CardDescription>{wf.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <span className="text-slate-500">
                    <span className="font-semibold text-slate-900">{recordCounts[i]}</span> records
                  </span>
                  {cardsByWorkflow[i].slice(0, 2).map((c) => (
                    <span key={c.label} className="text-slate-500">
                      <span className="font-semibold text-slate-900">{c.value}</span> {c.label.toLowerCase()}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Latest audit events across all workflows.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-slate-100 text-sm">
            {recentAudit.map((e) => (
              <li key={e.id} className="flex items-baseline justify-between gap-4 py-2">
                <span>
                  <span className="font-medium">{e.actorName}</span>{" "}
                  <span className="text-slate-600">{e.action.toLowerCase()}</span>{" "}
                  <span className="text-slate-400">in {e.workflow}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {formatDistanceToNow(e.createdAt, { addSuffix: true })}
                </span>
              </li>
            ))}
            {recentAudit.length === 0 && (
              <li className="py-4 text-center text-slate-400">No activity yet.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
