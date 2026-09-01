import { formatDistanceToNow } from "date-fns";
import type { AuditEvent } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, type Role } from "@/lib/workflows/types";

// Record-level audit history timeline (shared across all workflows).
export function RecordHistory({ events }: { events: AuditEvent[] }) {
  if (events.length === 0)
    return <p className="py-6 text-center text-sm text-slate-400">No history yet.</p>;

  return (
    <ol className="space-y-4">
      {events.map((e) => {
        const metadata = e.metadata ? (JSON.parse(e.metadata) as Record<string, unknown>) : null;
        return (
          <li key={e.id} className="relative border-l-2 border-slate-200 pl-4">
            <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-slate-400" />
            <div className="flex flex-wrap items-center gap-x-2 text-sm">
              <span className="font-medium text-slate-900">{e.actorName}</span>
              <span className="text-xs text-slate-400">
                {ROLE_LABELS[e.actorRole as Role] ?? e.actorRole}
              </span>
              <span className="text-slate-600">{e.action}</span>
              {e.fromState && e.toState && e.fromState !== e.toState && (
                <span className="text-xs text-slate-500">
                  {e.fromState} → {e.toState}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {formatDistanceToNow(e.createdAt, { addSuffix: true })}
            </p>
            {metadata?.inputs != null && (
              <div className="mt-1 rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                {Object.entries(metadata.inputs as Record<string, string>).map(([k, v]) => (
                  <p key={k}>
                    <span className="font-medium">{k}:</span> {v}
                  </p>
                ))}
              </div>
            )}
            {typeof metadata?.integration === "string" && (
              <Badge color="blue" className="mt-1">
                {metadata.integration}
              </Badge>
            )}
          </li>
        );
      })}
    </ol>
  );
}
