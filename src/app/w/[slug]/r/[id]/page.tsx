import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { canSeeWorkflow, roleAllowed } from "@/lib/auth/permissions";
import { getWorkflow } from "@/lib/workflows/registry";
import { getRecord } from "@/lib/workflows/queries";
import { prisma } from "@/lib/db";
import { getPersona } from "@/lib/auth/personas";
import { StatusBadge } from "@/components/workflow/status-badge";
import { FieldValue } from "@/components/workflow/field-value";
import { ActionButtons } from "@/components/workflow/action-buttons";
import { RecordHistory } from "@/components/workflow/record-history";
import { CUSTOM_DETAIL_COMPONENTS } from "@/components/workflow/custom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditFieldsForm } from "./edit-fields-form";

// The generic record detail page shared by every workflow: metadata grid,
// available actions, editable fields, audit history, and an optional
// Level 3 custom component.
export default async function RecordDetailPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  const user = getCurrentUser();
  const wf = await getWorkflow(params.slug);
  if (!wf || !canSeeWorkflow(user, wf)) notFound();

  const record = await getRecord(wf, params.id);
  if (!record) notFound();

  const events = await prisma.auditEvent.findMany({
    where: { recordId: record.id },
    orderBy: { createdAt: "desc" },
  });

  const title = String(record.data[wf.titleField] ?? record.id);
  const statusDef = wf.statuses.find((s) => s.key === record.status);

  // Role + state pre-filter for UX; guards are enforced server-side on execute.
  const availableActions = wf.actions.filter(
    (a) =>
      roleAllowed(a.roles, user) &&
      !statusDef?.terminal &&
      (a.fromStatuses.length === 0 || a.fromStatuses.includes(record.status))
  );

  const editableFields = wf.fields.filter((f) => f.editable);
  const CustomDetail = wf.customDetailComponent
    ? CUSTOM_DETAIL_COMPONENTS[wf.customDetailComponent]
    : undefined;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href={`/w/${wf.slug}`} className="hover:text-slate-900">
          {wf.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-900">{title}</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            <StatusBadge wf={wf} status={record.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {record.assigneeId
              ? `Assigned to ${getPersona(record.assigneeId).name}`
              : "Unassigned"}{" "}
            · Created {new Date(record.createdAt).toLocaleDateString()}
          </p>
        </div>
        <ActionButtons wf={wf} recordId={record.id} actions={availableActions} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                {wf.fields
                  .filter((f) => !f.editable)
                  .map((f) => (
                    <div key={f.key} className={f.type === "longText" ? "col-span-2" : ""}>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {f.label}
                      </dt>
                      <dd className="mt-0.5 text-slate-900">
                        <FieldValue field={f} value={record.data[f.key]} data={record.data} />
                      </dd>
                    </div>
                  ))}
              </dl>
            </CardContent>
          </Card>

          {CustomDetail && <CustomDetail wf={wf} record={record} user={user} />}

          {editableFields.length > 0 && !CustomDetail && (
            <Card>
              <CardHeader>
                <CardTitle>Editable fields</CardTitle>
              </CardHeader>
              <CardContent>
                <EditFieldsForm wf={wf} record={record} fields={editableFields} />
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            <RecordHistory events={events} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
