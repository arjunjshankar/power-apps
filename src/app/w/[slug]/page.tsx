import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { canSeeWorkflow } from "@/lib/auth/permissions";
import { getWorkflow, isCodeWorkflow } from "@/lib/workflows/registry";
import { computeDashboardCards, listRecords } from "@/lib/workflows/queries";
import { QueueTable } from "@/components/workflow/queue-table";
import { DashboardCards } from "@/components/workflow/dashboard-cards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// The generic workflow queue page: dashboard cards, saved views, and the
// shared queue table. Every workflow — code-defined or studio-created —
// renders through this single page.
export default async function WorkflowQueuePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { view?: string };
}) {
  const user = getCurrentUser();
  const wf = await getWorkflow(params.slug);
  if (!wf || !canSeeWorkflow(user, wf)) notFound();

  const activeViewKey = searchParams.view ?? wf.views[0]?.key;
  const activeView = wf.views.find((v) => v.key === activeViewKey);
  const [records, cards] = await Promise.all([
    listRecords(wf, activeView, user),
    computeDashboardCards(wf),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{wf.name}</h1>
            {!isCodeWorkflow(wf.slug) && <Badge color="purple">Studio workflow</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">{wf.description}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/w/${wf.slug}/new`}>
            <Plus className="h-4 w-4" /> New {wf.recordNoun}
          </Link>
        </Button>
      </div>

      <DashboardCards cards={cards} />

      {wf.views.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b border-slate-200">
          {wf.views.map((v) => (
            <Link
              key={v.key}
              href={`/w/${wf.slug}?view=${v.key}`}
              className={cn(
                "border-b-2 px-3 py-2 text-sm transition-colors",
                v.key === activeViewKey
                  ? "border-blue-600 font-medium text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              )}
            >
              {v.label}
            </Link>
          ))}
        </div>
      )}

      <QueueTable wf={wf} records={records} />
    </div>
  );
}
