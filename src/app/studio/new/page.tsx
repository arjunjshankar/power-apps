import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { WorkflowBuilder } from "../workflow-builder";

export default function NewStudioWorkflowPage() {
  const user = getCurrentUser();
  if (user.role !== "ops_admin" && user.role !== "eng_admin") notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New workflow</h1>
        <p className="mt-1 text-sm text-slate-500">
          Define fields, statuses, and actions — then publish. The new workflow immediately uses
          the platform&apos;s shared queue, forms, permissions, and audit infrastructure.
        </p>
      </div>
      <WorkflowBuilder />
    </div>
  );
}
