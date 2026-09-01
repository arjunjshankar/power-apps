import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/workflows/engine";
import { PERSONAS } from "@/lib/auth/personas";
import { ROLE_LABELS } from "@/lib/workflows/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThresholdForm } from "./threshold-form";

// Administration: platform settings (e.g. the refund approval threshold that
// the Refunds workflow's guard reads) and the demo user directory.
export default async function AdminPage() {
  const user = getCurrentUser();
  if (user.role !== "ops_admin" && user.role !== "eng_admin") notFound();

  const settings = await getSettings();
  const threshold = Number(settings["refund.approvalThreshold"] ?? 1000);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Administration</h1>
        <p className="mt-1 text-sm text-slate-500">Platform settings and access.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Refund approval threshold</CardTitle>
          <CardDescription>
            Refunds at or above this amount require supervisor approval. This is business
            configuration — no code change needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThresholdForm current={threshold} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users &amp; roles</CardTitle>
          <CardDescription>
            Demo personas. Production would source these from your identity provider
            (Entra ID, Okta, or any OIDC/SAML provider) behind the same auth interface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Email</th>
                <th className="py-2 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {PERSONAS.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 font-medium">{p.name}</td>
                  <td className="py-2.5 text-slate-500">{p.email}</td>
                  <td className="py-2.5">
                    <Badge color="blue">{ROLE_LABELS[p.role]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
