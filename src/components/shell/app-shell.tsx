import { Building2 } from "lucide-react";
import type { User } from "@/lib/auth/personas";
import type { WorkflowDefinition } from "@/lib/workflows/types";
import { ROLE_LABELS } from "@/lib/workflows/types";
import { PersonaSwitcher } from "./persona-switcher";
import { NavLink } from "./nav-link";

export function AppShell({
  user,
  workflows,
  children,
}: {
  user: User;
  workflows: WorkflowDefinition[];
  children: React.ReactNode;
}) {
  const isAdmin = user.role === "ops_admin" || user.role === "eng_admin";

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 flex w-64 flex-col bg-slate-900 text-slate-300">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
            <Building2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">AcmePay Ops</p>
            <p className="text-[11px] text-slate-500">Internal Operations Platform</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
          <div>
            <NavLink href="/" icon="LayoutDashboard" label="Overview" exact />
          </div>
          <div>
            <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Workflows
            </p>
            {workflows.map((wf) => (
              <NavLink key={wf.slug} href={`/w/${wf.slug}`} icon={wf.icon} label={wf.name} />
            ))}
          </div>
          <div>
            <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Platform
            </p>
            {isAdmin && <NavLink href="/studio" icon="Wrench" label="Workflow Builder" />}
            <NavLink href="/audit" icon="ScrollText" label="Audit History" />
            {isAdmin && <NavLink href="/admin" icon="Settings" label="Administration" />}
            <NavLink href="/tco" icon="Calculator" label="Cost Model" />
          </div>
        </nav>

        <div className="border-t border-slate-800 px-5 py-3">
          <p className="text-sm font-medium text-white">{user.name}</p>
          <p className="text-xs text-slate-400">{ROLE_LABELS[user.role]}</p>
        </div>
        <PersonaSwitcher current={user} />
      </aside>

      <main className="ml-64 flex-1 bg-slate-50">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
