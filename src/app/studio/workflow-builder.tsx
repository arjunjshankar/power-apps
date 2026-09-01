"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { Role, WorkflowDefinition } from "@/lib/workflows/types";
import { ROLE_LABELS } from "@/lib/workflows/types";
import { saveStudioWorkflow } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

// The Workflow Studio builder (Level 1). Intentionally focused: it exposes
// the high-value configuration surface (fields, statuses, actions, roles)
// and produces a definition validated by the exact same schema as
// code-defined workflows.

interface BuilderField {
  label: string;
  type: string;
  required: boolean;
  editable: boolean;
  options: string; // comma separated for select types
}

interface BuilderStatus {
  label: string;
  color: string;
  terminal: boolean;
}

interface BuilderAction {
  label: string;
  fromStatus: string; // status label ("(any)" = any non-terminal)
  toStatus: string; // status label
  roles: Role[];
  confirm: boolean;
  requireReason: boolean;
}

const FIELD_TYPES = [
  "text",
  "longText",
  "number",
  "money",
  "percentage",
  "boolean",
  "date",
  "select",
  "multiSelect",
];
const STATUS_COLORS = ["gray", "blue", "yellow", "orange", "red", "green", "purple"];
const ALL_ROLES: Role[] = ["analyst", "supervisor", "ops_admin", "eng_admin"];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function keyify(s: string) {
  const parts = s.trim().split(/[^a-zA-Z0-9]+/).filter(Boolean);
  return parts
    .map((p, i) => (i === 0 ? p.charAt(0).toLowerCase() + p.slice(1) : p.charAt(0).toUpperCase() + p.slice(1)))
    .join("");
}

export function WorkflowBuilder({ existing }: { existing?: WorkflowDefinition }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [recordNoun, setRecordNoun] = useState(existing?.recordNoun ?? "record");
  const [visibleToRoles, setVisibleToRoles] = useState<Role[]>(
    existing?.visibleToRoles ?? ["analyst", "supervisor", "ops_admin", "eng_admin"]
  );
  const [fields, setFields] = useState<BuilderField[]>(
    existing?.fields.map((f) => ({
      label: f.label,
      type: f.type,
      required: f.required,
      editable: f.editable,
      options: (f.options ?? []).join(", "),
    })) ?? [{ label: "Name", type: "text", required: true, editable: false, options: "" }]
  );
  const [statuses, setStatuses] = useState<BuilderStatus[]>(
    existing?.statuses.map((s) => ({ label: s.label, color: s.color, terminal: s.terminal })) ?? [
      { label: "Pending", color: "gray", terminal: false },
      { label: "In Review", color: "blue", terminal: false },
      { label: "Approved", color: "green", terminal: true },
      { label: "Rejected", color: "red", terminal: true },
    ]
  );
  const [actions, setActions] = useState<BuilderAction[]>(
    existing?.actions.map((a) => {
      const findLabel = (key?: string) =>
        existing.statuses.find((s) => s.key === key)?.label ?? "";
      return {
        label: a.label,
        fromStatus: a.fromStatuses.length === 1 ? findLabel(a.fromStatuses[0]) : "(any)",
        toStatus: findLabel(a.toStatus),
        roles: a.roles,
        confirm: a.confirm,
        requireReason: a.requiredInputs.length > 0,
      };
    }) ?? [
      {
        label: "Approve",
        fromStatus: "(any)",
        toStatus: "Approved",
        roles: ["analyst", "supervisor"],
        confirm: true,
        requireReason: false,
      },
    ]
  );

  function buildDefinition(): WorkflowDefinition {
    const slug = existing?.slug ?? slugify(name);
    const statusDefs = statuses.map((s) => ({
      key: keyify(s.label),
      label: s.label,
      color: s.color,
      terminal: s.terminal,
    }));
    const fieldDefs = fields.map((f) => ({
      key: keyify(f.label),
      label: f.label,
      type: f.type,
      required: f.required,
      editable: f.editable,
      ...(f.type === "select" || f.type === "multiSelect"
        ? { options: f.options.split(",").map((o) => o.trim()).filter(Boolean) }
        : {}),
    }));
    const nonTerminal = statusDefs.filter((s) => !s.terminal).map((s) => s.key);
    const actionDefs = actions.map((a) => ({
      key: keyify(a.label),
      label: a.label,
      fromStatuses:
        a.fromStatus === "(any)" ? nonTerminal : [keyify(a.fromStatus)],
      toStatus: a.toStatus ? keyify(a.toStatus) : undefined,
      roles: a.roles,
      confirm: a.confirm,
      requiredInputs: a.requireReason
        ? [{ key: "reason", label: "Reason", type: "longText" as const }]
        : [],
    }));
    const titleField = fieldDefs[0]?.key ?? "name";
    return {
      slug,
      name,
      description,
      icon: "ClipboardList",
      recordNoun,
      visibleToRoles,
      fields: fieldDefs,
      statuses: statusDefs,
      initialStatus: statusDefs[0]?.key ?? "pending",
      actions: actionDefs,
      views: [
        { key: "all", label: "All", filter: {} },
        ...statusDefs
          .filter((s) => !s.terminal)
          .map((s) => ({ key: s.key, label: s.label, filter: { statuses: [s.key] } })),
      ],
      tableColumns: fieldDefs.slice(0, 5).map((f) => f.key),
      titleField,
      dashboardCards: [],
      showDashboard: false,
    } as unknown as WorkflowDefinition;
  }

  function save(publish: boolean) {
    if (!name.trim()) return toast.error("Workflow name is required.");
    if (fields.some((f) => !f.label.trim())) return toast.error("Every field needs a label.");
    if (statuses.some((s) => !s.label.trim())) return toast.error("Every status needs a label.");
    startTransition(async () => {
      const def = buildDefinition();
      const result = await saveStudioWorkflow(JSON.stringify(def), publish);
      if (result.ok) {
        toast.success(publish ? "Workflow published" : "Draft saved");
        router.push(publish ? `/w/${def.slug}` : "/studio");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const roleToggle = (roles: Role[], role: Role, set: (r: Role[]) => void) => (
    <label key={role} className="flex items-center gap-1.5 text-sm">
      <input
        type="checkbox"
        checked={roles.includes(role)}
        onChange={(e) =>
          set(e.target.checked ? [...roles, role] : roles.filter((r) => r !== role))
        }
        className="h-3.5 w-3.5 rounded border-slate-300"
      />
      {ROLE_LABELS[role]}
    </label>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Workflow name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chargeback Review" disabled={Boolean(existing)} />
            </div>
            <div className="space-y-1.5">
              <Label>Record noun</Label>
              <Input value={recordNoun} onChange={(e) => setRecordNoun(e.target.value)} placeholder="e.g. case" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Visible to roles</Label>
            <div className="flex gap-4">
              {ALL_ROLES.map((r) => roleToggle(visibleToRoles, r, setVisibleToRoles))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fields</CardTitle>
          <CardDescription>The data captured on each {recordNoun || "record"}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((f, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 p-2">
              <Input
                className="w-44"
                placeholder="Label"
                value={f.label}
                onChange={(e) => setFields((s) => s.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              />
              <Select
                className="w-32"
                value={f.type}
                onChange={(e) => setFields((s) => s.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
              {(f.type === "select" || f.type === "multiSelect") && (
                <Input
                  className="w-56"
                  placeholder="Options (comma separated)"
                  value={f.options}
                  onChange={(e) => setFields((s) => s.map((x, j) => (j === i ? { ...x, options: e.target.value } : x)))}
                />
              )}
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={(e) => setFields((s) => s.map((x, j) => (j === i ? { ...x, required: e.target.checked } : x)))}
                  className="h-3.5 w-3.5"
                />
                Required
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={f.editable}
                  onChange={(e) => setFields((s) => s.map((x, j) => (j === i ? { ...x, editable: e.target.checked } : x)))}
                  className="h-3.5 w-3.5"
                />
                Editable
              </label>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto text-slate-400 hover:text-red-600"
                onClick={() => setFields((s) => s.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFields((s) => [...s, { label: "", type: "text", required: false, editable: false, options: "" }])}
          >
            <Plus className="h-4 w-4" /> Add field
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statuses</CardTitle>
          <CardDescription>The first status is the initial state for new records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {statuses.map((s, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-slate-200 p-2">
              <Input
                className="w-44"
                placeholder="Label"
                value={s.label}
                onChange={(e) => setStatuses((st) => st.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              />
              <Select
                className="w-28"
                value={s.color}
                onChange={(e) => setStatuses((st) => st.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))}
              >
                {STATUS_COLORS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={s.terminal}
                  onChange={(e) => setStatuses((st) => st.map((x, j) => (j === i ? { ...x, terminal: e.target.checked } : x)))}
                  className="h-3.5 w-3.5"
                />
                Terminal
              </label>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto text-slate-400 hover:text-red-600"
                onClick={() => setStatuses((st) => st.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatuses((s) => [...s, { label: "", color: "gray", terminal: false }])}
          >
            <Plus className="h-4 w-4" /> Add status
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Who can do what, from which status, to which status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {actions.map((a, i) => (
            <div key={i} className="space-y-2 rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  className="w-44"
                  placeholder="Action label"
                  value={a.label}
                  onChange={(e) => setActions((s) => s.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                />
                <span className="text-xs text-slate-500">from</span>
                <Select
                  className="w-36"
                  value={a.fromStatus}
                  onChange={(e) => setActions((s) => s.map((x, j) => (j === i ? { ...x, fromStatus: e.target.value } : x)))}
                >
                  <option>(any)</option>
                  {statuses.filter((st) => !st.terminal).map((st) => (
                    <option key={st.label}>{st.label}</option>
                  ))}
                </Select>
                <span className="text-xs text-slate-500">to</span>
                <Select
                  className="w-36"
                  value={a.toStatus}
                  onChange={(e) => setActions((s) => s.map((x, j) => (j === i ? { ...x, toStatus: e.target.value } : x)))}
                >
                  <option value="">(no change)</option>
                  {statuses.map((st) => (
                    <option key={st.label}>{st.label}</option>
                  ))}
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto text-slate-400 hover:text-red-600"
                  onClick={() => setActions((s) => s.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {ALL_ROLES.map((r) =>
                  roleToggle(a.roles, r, (roles) =>
                    setActions((s) => s.map((x, j) => (j === i ? { ...x, roles } : x)))
                  )
                )}
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={a.confirm}
                    onChange={(e) => setActions((s) => s.map((x, j) => (j === i ? { ...x, confirm: e.target.checked } : x)))}
                    className="h-3.5 w-3.5"
                  />
                  Requires confirmation
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={a.requireReason}
                    onChange={(e) => setActions((s) => s.map((x, j) => (j === i ? { ...x, requireReason: e.target.checked } : x)))}
                    className="h-3.5 w-3.5"
                  />
                  Requires reason
                </label>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setActions((s) => [
                ...s,
                { label: "", fromStatus: "(any)", toStatus: "", roles: ["analyst", "supervisor"], confirm: false, requireReason: false },
              ])
            }
          >
            <Plus className="h-4 w-4" /> Add action
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={pending} onClick={() => save(false)}>
          Save draft
        </Button>
        <Button variant="primary" disabled={pending} onClick={() => save(true)}>
          {pending ? "Publishing..." : "Publish workflow"}
        </Button>
      </div>
    </div>
  );
}
