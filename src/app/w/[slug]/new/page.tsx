import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { canSeeWorkflow } from "@/lib/auth/permissions";
import { getWorkflow } from "@/lib/workflows/registry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewRecordForm } from "./new-record-form";

export default async function NewRecordPage({ params }: { params: { slug: string } }) {
  const user = getCurrentUser();
  const wf = await getWorkflow(params.slug);
  if (!wf || !canSeeWorkflow(user, wf)) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New {wf.recordNoun}</h1>
        <p className="mt-1 text-sm text-slate-500">{wf.name}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            This form is generated from the workflow&apos;s field definitions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewRecordForm wf={wf} />
        </CardContent>
      </Card>
    </div>
  );
}
