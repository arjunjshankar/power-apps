import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getAllWorkflows } from "@/lib/workflows/registry";
import { ROLE_LABELS, type Role } from "@/lib/workflows/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Global administrative audit view across all workflows.
export default async function AuditPage({
  searchParams,
}: {
  searchParams: { workflow?: string };
}) {
  getCurrentUser(); // all roles may view audit history in the POC
  const workflows = await getAllWorkflows();
  const filter = searchParams.workflow;

  const events = await prisma.auditEvent.findMany({
    where: filter ? { workflow: filter } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Audit History</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every state-changing operation on the platform, across all workflows.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        <Link
          href="/audit"
          className={cn(
            "border-b-2 px-3 py-2 text-sm",
            !filter ? "border-blue-600 font-medium text-blue-700" : "border-transparent text-slate-500 hover:text-slate-900"
          )}
        >
          All
        </Link>
        {workflows.map((wf) => (
          <Link
            key={wf.slug}
            href={`/audit?workflow=${wf.slug}`}
            className={cn(
              "border-b-2 px-3 py-2 text-sm",
              filter === wf.slug
                ? "border-blue-600 font-medium text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            {wf.name}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-2.5 font-medium">Time</th>
                <th className="px-4 py-2.5 font-medium">Actor</th>
                <th className="px-4 py-2.5 font-medium">Workflow</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Transition</th>
                <th className="px-4 py-2.5 font-medium">Record</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">
                    {e.createdAt.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{e.actorName}</span>{" "}
                    <span className="text-xs text-slate-400">
                      {ROLE_LABELS[e.actorRole as Role] ?? e.actorRole}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge>{e.workflow}</Badge>
                  </td>
                  <td className="px-4 py-2.5">{e.action}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {e.fromState && e.toState && e.fromState !== e.toState
                      ? `${e.fromState} → ${e.toState}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {e.recordId ? (
                      <Link
                        href={`/w/${e.workflow}/r/${e.recordId}`}
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No audit events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
