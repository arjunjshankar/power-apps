import { Badge } from "@/components/ui/badge";
import type { WorkflowDefinition } from "@/lib/workflows/types";

export function StatusBadge({
  wf,
  status,
}: {
  wf: WorkflowDefinition;
  status: string;
}) {
  const def = wf.statuses.find((s) => s.key === status);
  return <Badge color={def?.color ?? "gray"}>{def?.label ?? status}</Badge>;
}
