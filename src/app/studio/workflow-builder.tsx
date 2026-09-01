"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, Plus, Trash2 } from "lucide-react";
import type {
  Role,
  RuleOperator,
  WorkflowDefinition,
  WorkflowDefinitionInput,
} from "@/lib/workflows/types";
import { ROLE_LABELS, workflowDefinitionSchema } from "@/lib/workflows/types";
import { checkAction } from "@/lib/auth/permissions";
import { PERSONAS } from "@/lib/auth/personas";
import {
  generateDevinPrompt,
  platformCapabilities,
} from "@/lib/workflows/capabilities";
import { saveStudioWorkflow } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// The Workflow Builder (Level 1): a guided, multi-step construction
// experience. Each step configures one slice of the shared platform
// (fields, queue, states, actions/rules, permissions) and the result is a
// definition validated by the exact same schema as code-defined workflows.

interface BuilderField {
  label: string;
  type: string;
  required: boolean;
  editable: boolean;
  inTable: boolean;
  showInDetail: boolean;
  options: string; // comma separated for select types
  defaultValue: string;
}

interface BuilderStatus {
  label: string;
  color: string;
  terminal: boolean;
}

interface BuilderRule {
  field: string; // field label
  operator: RuleOperator;
  value: string;
  requiredRoles: Role[]; // empty = block action entirely
}

interface BuilderAction {
  label: string;
  fromStatus: string; // status label ("(any)" = any non-terminal)
  toStatus: string; // status label
  roles: Role[];
  confirm: boolean;
  confirmMessage: string;
  requireReason: boolean;
  rules: BuilderRule[];
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
const ICONS = [
  "ClipboardList",
  "CreditCard",
  "ShieldAlert",
  "Landmark",
  "Scale",
  "FileWarning",
  "Users",
  "Receipt",
];
const RULE_OPERATORS: { value: RuleOperator; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "notEquals", label: "does not equal" },
  { value: "greaterThan", label: "is greater than" },
  { value: "lessThan", label: "is less than" },
  { value: "contains", label: "contains" },
  { value: "isEmpty", label: "is empty" },
  { value: "isNotEmpty", label: "is not empty" },
];

const STEPS = [
  { key: "basics", label: "Basics" },
  { key: "fields", label: "Fields" },
  { key: "states", label: "States" },
  { key: "actions", label: "Actions & rules" },
  { key: "queue", label: "Queue & views" },
  { key: "preview", label: "Preview & publish" },
];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function keyify(s: string) {
  const parts = s.trim().split(/[^a-zA-Z0-9]+/).filter(Boolean);
  return parts
    .map((p, i) => (i === 0 ? p.charAt(0).toLowerCase() + p.slice(1) : p.charAt(0).toUpperCase() + p.slice(1)))
    .join("");
}

function sampleValue(f: BuilderField, i: number): unknown {
  const opts = f.options.split(",").map((o) => o.trim()).filter(Boolean);
  switch (f.type) {
    case "number":
      return 10 + i * 7;
    case "money":
      return [420, 12500, 88][i % 3];
    case "percentage":
      return [25, 50, 100][i % 3];
    case "boolean":
      return i % 2 === 0;
    case "date":
    case "datetime":
      return new Date().toISOString().slice(0, 10);
    case "select":
      return opts[i % Math.max(opts.length, 1)] ?? "Option A";
    case "multiSelect":
      return opts.length ? [opts[i % opts.length]] : ["Option A"];
    case "longText":
      return "Example notes captured for this record.";
    default:
      return `Sample ${f.label} ${i + 1}`;
  }
}

export function WorkflowBuilder({ existing }: { existing?: WorkflowDefinition }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [recordNoun, setRecordNoun] = useState(existing?.recordNoun ?? "record");
  const [recordNounPlural, setRecordNounPlural] = useState(existing?.recordNounPlural ?? "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [icon, setIcon] = useState(existing?.icon ?? "ClipboardList");
  const [visibleToRoles, setVisibleToRoles] = useState<Role[]>(
    existing?.visibleToRoles ?? ["analyst", "supervisor", "ops_admin", "eng_admin"]
  );
  const [fields, setFields] = useState<BuilderField[]>(
    existing?.fields.map((f) => ({
      label: f.label,
      type: f.type,
      required: f.required,
      editable: f.editable,
      inTable: existing.tableColumns.includes(f.key),
      showInDetail: f.showInDetail,
      options: (f.options ?? []).join(", "),
      defaultValue: f.defaultValue !== undefined ? String(f.defaultValue) : "",
    })) ?? [
      { label: "Name", type: "text", required: true, editable: false, inTable: true, showInDetail: true, options: "", defaultValue: "" },
    ]
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
      const findFieldLabel = (key: string) =>
        existing.fields.find((f) => f.key === key)?.label ?? key;
      return {
        label: a.label,
        fromStatus: a.fromStatuses.length === 1 ? findLabel(a.fromStatuses[0]) : "(any)",
        toStatus: findLabel(a.toStatus),
        roles: a.roles,
        confirm: a.confirm,
        confirmMessage: a.confirmMessage ?? "",
        requireReason: a.requiredInputs.length > 0,
        rules: a.guards
          .filter((g): g is Extract<typeof g, { type: "rule" }> => g.type === "rule")
          .map((g) => ({
            field: findFieldLabel(g.field),
            operator: g.operator,
            value: g.value !== undefined ? String(g.value) : "",
            requiredRoles: g.requiredRoles,
          })),
      };
    }) ?? [
      {
        label: "Approve",
        fromStatus: "(any)",
        toStatus: "Approved",
        roles: ["analyst", "supervisor"],
        confirm: true,
        confirmMessage: "",
        requireReason: false,
        rules: [],
      },
    ]
  );
  const [defaultSortField, setDefaultSortField] = useState(
    existing?.defaultSort?.field
      ? existing.fields.find((f) => f.key === existing.defaultSort?.field)?.label ?? ""
      : ""
  );
  const [defaultSortDir, setDefaultSortDir] = useState<"asc" | "desc">(
    existing?.defaultSort?.direction ?? "asc"
  );
  const [searchableLabels, setSearchableLabels] = useState<string[]>(
    existing
      ? existing.searchableFields
          .map((k) => existing.fields.find((f) => f.key === k)?.label)
          .filter((l): l is string => Boolean(l))
      : []
  );
  const [viewUnassigned, setViewUnassigned] = useState(
    existing ? existing.views.some((v) => v.filter.unassigned) : true
  );
  const [viewAssignedToMe, setViewAssignedToMe] = useState(
    existing ? existing.views.some((v) => v.filter.assignedToMe) : true
  );
  const [viewPerStatus, setViewPerStatus] = useState(
    existing ? existing.views.some((v) => (v.filter.statuses ?? []).length > 0) : true
  );
  const [previewRole, setPreviewRole] = useState<Role>("analyst");

  function buildDefinition(): WorkflowDefinitionInput {
    const slug = existing?.slug ?? slugify(name);
    const statusDefs = statuses.map((s) => ({
      key: keyify(s.label),
      label: s.label,
      color: s.color as "gray",
      terminal: s.terminal,
    }));
    const fieldByLabel = (label: string) =>
      keyify(fields.find((f) => f.label === label)?.label ?? label);
    const parseRuleValue = (f: BuilderField | undefined, v: string): string | number =>
      f && ["number", "money", "percentage"].includes(f.type) && v.trim() !== ""
        ? Number(v)
        : v;
    const fieldDefs = fields.map((f) => ({
      key: keyify(f.label),
      label: f.label,
      type: f.type as "text",
      required: f.required,
      editable: f.editable,
      showInDetail: f.showInDetail,
      ...(f.type === "select" || f.type === "multiSelect"
        ? { options: f.options.split(",").map((o) => o.trim()).filter(Boolean) }
        : {}),
      ...(f.defaultValue.trim() !== ""
        ? {
            defaultValue: ["number", "money", "percentage"].includes(f.type)
              ? Number(f.defaultValue)
              : f.type === "boolean"
                ? f.defaultValue.trim().toLowerCase() === "true"
                : f.defaultValue,
          }
        : {}),
    }));
    const nonTerminal = statusDefs.filter((s) => !s.terminal).map((s) => s.key);
    const actionDefs = actions.map((a) => ({
      key: keyify(a.label),
      label: a.label,
      fromStatuses: a.fromStatus === "(any)" ? nonTerminal : [keyify(a.fromStatus)],
      toStatus: a.toStatus ? keyify(a.toStatus) : undefined,
      roles: a.roles,
      confirm: a.confirm,
      ...(a.confirm && a.confirmMessage.trim() ? { confirmMessage: a.confirmMessage } : {}),
      requiredInputs: a.requireReason
        ? [{ key: "reason", label: "Reason", type: "longText" as const }]
        : [],
      guards: a.rules
        .filter((r) => r.field)
        .map((r) => ({
          type: "rule" as const,
          field: fieldByLabel(r.field),
          operator: r.operator,
          ...(["isEmpty", "isNotEmpty"].includes(r.operator)
            ? {}
            : { value: parseRuleValue(fields.find((f) => f.label === r.field), r.value) }),
          requiredRoles: r.requiredRoles,
          message:
            r.requiredRoles.length > 0
              ? `${a.label} requires ${r.requiredRoles.map((role) => ROLE_LABELS[role]).join(" or ")} when ${r.field} ${RULE_OPERATORS.find((o) => o.value === r.operator)?.label} ${r.value}`.trim()
              : `${a.label} is not allowed when ${r.field} ${RULE_OPERATORS.find((o) => o.value === r.operator)?.label} ${r.value}`.trim(),
        })),
    }));
    const titleField = fieldDefs[0]?.key ?? "name";
    const tableColumns = fields.filter((f) => f.inTable).map((f) => keyify(f.label));
    const views = [
      { key: "all", label: "All", filter: {} },
      ...(viewUnassigned ? [{ key: "unassigned", label: "Unassigned", filter: { unassigned: true } }] : []),
      ...(viewAssignedToMe ? [{ key: "mine", label: "Assigned to Me", filter: { assignedToMe: true } }] : []),
      ...(viewPerStatus
        ? statusDefs
            .filter((s) => !s.terminal)
            .map((s) => ({ key: s.key, label: s.label, filter: { statuses: [s.key] } }))
        : []),
    ];
    return {
      slug,
      name,
      description,
      icon,
      recordNoun,
      ...(recordNounPlural.trim() ? { recordNounPlural } : {}),
      ...(category.trim() ? { category } : {}),
      visibleToRoles,
      fields: fieldDefs,
      statuses: statusDefs,
      initialStatus: statusDefs[0]?.key ?? "pending",
      actions: actionDefs,
      views,
      tableColumns: tableColumns.length > 0 ? tableColumns : fieldDefs.slice(0, 5).map((f) => f.key),
      ...(defaultSortField
        ? { defaultSort: { field: fieldByLabel(defaultSortField), direction: defaultSortDir } }
        : {}),
      searchableFields: searchableLabels.map(fieldByLabel),
      titleField,
      dashboardCards: existing?.dashboardCards ?? [],
      showDashboard: existing?.showDashboard ?? false,
    };
  }

  function validateStep(current: number): string | null {
    if (current === 0 && !name.trim()) return "Workflow name is required.";
    if (current === 0 && visibleToRoles.length === 0) return "Select at least one role.";
    if (current === 1 && fields.some((f) => !f.label.trim())) return "Every field needs a label.";
    if (current === 2 && statuses.some((s) => !s.label.trim())) return "Every status needs a label.";
    if (current === 3 && actions.some((a) => !a.label.trim())) return "Every action needs a label.";
    if (current === 3 && actions.some((a) => a.roles.length === 0))
      return "Every action needs at least one allowed role.";
    return null;
  }

  function goTo(next: number) {
    if (next > step) {
      for (let s = step; s < next; s++) {
        const err = validateStep(s);
        if (err) return void toast.error(err);
      }
    }
    setStep(next);
  }

  const parsedPreview = useMemo(() => {
    try {
      return workflowDefinitionSchema.parse(buildDefinition());
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function save(publish: boolean) {
    const err = STEPS.map((_, i) => validateStep(i)).find(Boolean);
    if (err) return void toast.error(err);
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

  const previewUser = PERSONAS.find((p) => p.role === previewRole) ?? PERSONAS[0];
  const previewSampleData = useMemo(() => {
    return [0, 1, 2].map((i) =>
      Object.fromEntries(fields.filter((f) => f.label.trim()).map((f) => [keyify(f.label), sampleValue(f, i)]))
    );
  }, [fields]);

  return (
    <div className="space-y-6">
      {/* Step navigation */}
      <ol className="flex flex-wrap items-center gap-1">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex items-center gap-1">
            <button
              onClick={() => goTo(i)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
                i === step
                  ? "bg-blue-600 font-medium text-white"
                  : i < step
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "text-slate-500 hover:bg-slate-100"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                  i === step ? "bg-white/20" : i < step ? "bg-blue-100" : "bg-slate-200"
                )}
              >
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && <span className="text-slate-300">—</span>}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
            <CardDescription>
              Name the workflow and choose which roles can see it. Role checks are enforced
              server-side by the platform&apos;s shared RBAC.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Workflow name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chargeback Review" disabled={Boolean(existing)} />
              </div>
              <div className="space-y-1.5">
                <Label>Category (optional)</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Disputes" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Record noun (singular)</Label>
                <Input value={recordNoun} onChange={(e) => setRecordNoun(e.target.value)} placeholder="e.g. chargeback" />
              </div>
              <div className="space-y-1.5">
                <Label>Record noun (plural)</Label>
                <Input value={recordNounPlural} onChange={(e) => setRecordNounPlural(e.target.value)} placeholder={`defaults to "${recordNoun || "record"}s"`} />
              </div>
              <div className="space-y-1.5">
                <Label>Icon</Label>
                <Select value={icon} onChange={(e) => setIcon(e.target.value)}>
                  {ICONS.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this workflow is for." />
            </div>
            <div className="space-y-1.5">
              <Label>Visible to roles</Label>
              <div className="flex gap-4">
                {ALL_ROLES.map((r) => roleToggle(visibleToRoles, r, setVisibleToRoles))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Fields</CardTitle>
            <CardDescription>
              The data captured on each {recordNoun || "record"}. Rendered everywhere by the
              platform&apos;s dynamic forms and field components.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((f, i) => (
              <div key={i} className="space-y-2 rounded-md border border-slate-200 p-2">
                <div className="flex flex-wrap items-center gap-2">
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
                  <Input
                    className="w-36"
                    placeholder="Default value"
                    value={f.defaultValue}
                    onChange={(e) => setFields((s) => s.map((x, j) => (j === i ? { ...x, defaultValue: e.target.value } : x)))}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto text-slate-400 hover:text-red-600"
                    onClick={() => setFields((s) => s.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-4 px-1">
                  {(
                    [
                      ["required", "Required"],
                      ["editable", "Editable"],
                      ["inTable", "Show in queue"],
                      ["showInDetail", "Show in detail"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={f[key]}
                        onChange={(e) =>
                          setFields((s) => s.map((x, j) => (j === i ? { ...x, [key]: e.target.checked } : x)))
                        }
                        className="h-3.5 w-3.5"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFields((s) => [
                  ...s,
                  { label: "", type: "text", required: false, editable: false, inTable: true, showInDetail: true, options: "", defaultValue: "" },
                ])
              }
            >
              <Plus className="h-4 w-4" /> Add field
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>States</CardTitle>
            <CardDescription>
              The lifecycle a {recordNoun || "record"} moves through. The first status is the
              initial state for new records; terminal states end the lifecycle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {statuses.map((s, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border border-slate-200 p-2">
                <span className="w-10 text-center text-xs text-slate-400">{i === 0 ? "start" : i + 1}</span>
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
                <Badge color={s.color as "gray"}>{s.label || "…"}</Badge>
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={s.terminal}
                    onChange={(e) => setStatuses((st) => st.map((x, j) => (j === i ? { ...x, terminal: e.target.checked } : x)))}
                    className="h-3.5 w-3.5"
                  />
                  Terminal
                </label>
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={i === 0}
                    onClick={() =>
                      setStatuses((st) => {
                        const next = [...st];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        return next;
                      })
                    }
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={i === statuses.length - 1}
                    onClick={() =>
                      setStatuses((st) => {
                        const next = [...st];
                        [next[i + 1], next[i]] = [next[i], next[i + 1]];
                        return next;
                      })
                    }
                  >
                    ↓
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-red-600"
                    onClick={() => setStatuses((st) => st.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Actions & business rules</CardTitle>
            <CardDescription>
              Who can do what, from which status, to which status — plus simple rules like
              &ldquo;amounts over 10,000 require a Supervisor&rdquo;. Every action is audited
              automatically.
            </CardDescription>
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
                {a.confirm && (
                  <Input
                    placeholder="Confirmation message (optional)"
                    value={a.confirmMessage}
                    onChange={(e) => setActions((s) => s.map((x, j) => (j === i ? { ...x, confirmMessage: e.target.value } : x)))}
                  />
                )}
                <div className="space-y-2 rounded-md bg-slate-50 p-2">
                  <p className="text-xs font-medium text-slate-500">Business rules</p>
                  {a.rules.map((r, k) => (
                    <div key={k} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-xs text-slate-500">when</span>
                      <Select
                        className="h-8 w-40"
                        value={r.field}
                        onChange={(e) =>
                          setActions((s) => s.map((x, j) => (j === i ? { ...x, rules: x.rules.map((y, l) => (l === k ? { ...y, field: e.target.value } : y)) } : x)))
                        }
                      >
                        <option value="">(choose field)</option>
                        {fields.filter((f) => f.label.trim()).map((f) => (
                          <option key={f.label}>{f.label}</option>
                        ))}
                      </Select>
                      <Select
                        className="h-8 w-40"
                        value={r.operator}
                        onChange={(e) =>
                          setActions((s) => s.map((x, j) => (j === i ? { ...x, rules: x.rules.map((y, l) => (l === k ? { ...y, operator: e.target.value as RuleOperator } : y)) } : x)))
                        }
                      >
                        {RULE_OPERATORS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                      {!["isEmpty", "isNotEmpty"].includes(r.operator) && (
                        <Input
                          className="h-8 w-32"
                          placeholder="Value"
                          value={r.value}
                          onChange={(e) =>
                            setActions((s) => s.map((x, j) => (j === i ? { ...x, rules: x.rules.map((y, l) => (l === k ? { ...y, value: e.target.value } : y)) } : x)))
                          }
                        />
                      )}
                      <span className="text-xs text-slate-500">require</span>
                      {ALL_ROLES.map((role) =>
                        roleToggle(r.requiredRoles, role, (requiredRoles) =>
                          setActions((s) => s.map((x, j) => (j === i ? { ...x, rules: x.rules.map((y, l) => (l === k ? { ...y, requiredRoles } : y)) } : x)))
                        )
                      )}
                      <span className="text-[11px] text-slate-400">(none = block action)</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-red-600"
                        onClick={() =>
                          setActions((s) => s.map((x, j) => (j === i ? { ...x, rules: x.rules.filter((_, l) => l !== k) } : x)))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setActions((s) =>
                        s.map((x, j) =>
                          j === i
                            ? { ...x, rules: [...x.rules, { field: "", operator: "greaterThan", value: "", requiredRoles: ["supervisor"] }] }
                            : x
                        )
                      )
                    }
                  >
                    <Plus className="h-3.5 w-3.5" /> Add rule
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setActions((s) => [
                  ...s,
                  { label: "", fromStatus: "(any)", toStatus: "", roles: ["analyst", "supervisor"], confirm: false, confirmMessage: "", requireReason: false, rules: [] },
                ])
              }
            >
              <Plus className="h-4 w-4" /> Add action
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Queue & views</CardTitle>
            <CardDescription>
              How users find and triage {recordNounPlural || `${recordNoun || "record"}s`} —
              rendered by the same shared queue used by every other workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label>Table columns</Label>
              <p className="text-xs text-slate-500">
                Toggle &ldquo;Show in queue&rdquo; on the Fields step. Current columns:{" "}
                {fields.filter((f) => f.inTable && f.label.trim()).map((f) => f.label).join(", ") || "(none — first 5 fields will be used)"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Default sort</Label>
                <div className="flex gap-2">
                  <Select value={defaultSortField} onChange={(e) => setDefaultSortField(e.target.value)}>
                    <option value="">(none)</option>
                    {fields.filter((f) => f.label.trim()).map((f) => (
                      <option key={f.label}>{f.label}</option>
                    ))}
                  </Select>
                  <Select
                    className="w-36"
                    value={defaultSortDir}
                    onChange={(e) => setDefaultSortDir(e.target.value as "asc" | "desc")}
                  >
                    <option value="asc">ascending</option>
                    <option value="desc">descending</option>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Searchable fields</Label>
                <div className="flex flex-wrap gap-3 pt-1.5">
                  {fields.filter((f) => f.label.trim()).map((f) => (
                    <label key={f.label} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={searchableLabels.includes(f.label)}
                        onChange={(e) =>
                          setSearchableLabels((s) =>
                            e.target.checked ? [...s, f.label] : s.filter((l) => l !== f.label)
                          )
                        }
                        className="h-3.5 w-3.5"
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-400">None selected = search all fields.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Predefined views</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked disabled className="h-3.5 w-3.5" /> All
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={viewUnassigned} onChange={(e) => setViewUnassigned(e.target.checked)} className="h-3.5 w-3.5" />
                  Unassigned
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={viewAssignedToMe} onChange={(e) => setViewAssignedToMe(e.target.checked)} className="h-3.5 w-3.5" />
                  Assigned to Me
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={viewPerStatus} onChange={(e) => setViewPerStatus(e.target.checked)} className="h-3.5 w-3.5" />
                  One view per non-terminal status
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                A preview of the configured workflow using example data — no publishing or
                seeding required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                      {fields.filter((f) => f.inTable && f.label.trim()).map((f) => (
                        <th key={f.label} className="px-4 py-2 font-medium">{f.label}</th>
                      ))}
                      <th className="px-4 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewSampleData.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        {fields.filter((f) => f.inTable && f.label.trim()).map((f) => (
                          <td key={f.label} className="px-4 py-2.5">
                            {String(row[keyify(f.label)] ?? "")}
                          </td>
                        ))}
                        <td className="px-4 py-2.5">
                          <Badge color={(statuses[i % statuses.length]?.color ?? "gray") as "gray"}>
                            {statuses[i % statuses.length]?.label ?? ""}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Label className="text-xs uppercase tracking-wide text-slate-500">
                  Actions available to
                </Label>
                <Select
                  className="h-8 w-44"
                  value={previewRole}
                  onChange={(e) => setPreviewRole(e.target.value as Role)}
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
                <div className="flex flex-wrap gap-2">
                  {parsedPreview ? (
                    parsedPreview.actions.map((a) => {
                      const check = checkAction(a, previewUser, parsedPreview.initialStatus, {
                        data: previewSampleData[0] ?? {},
                        settings: {},
                      });
                      return (
                        <Badge key={a.key} color={check.allowed ? "green" : "gray"}>
                          {a.label}
                          {!check.allowed && " (unavailable)"}
                        </Badge>
                      );
                    })
                  ) : (
                    <span className="text-sm text-slate-400">
                      Complete the earlier steps to preview actions.
                    </span>
                  )}
                </div>
                <p className="w-full text-xs text-slate-400">
                  Evaluated with the same server-side permission checker used at runtime, against
                  the first sample record in its initial state.
                </p>
              </div>
            </CardContent>
          </Card>

          {parsedPreview && (
            <Card>
              <CardHeader>
                <CardTitle>Platform capabilities used</CardTitle>
                <CardDescription>
                  Derived from this configuration — none of these were rebuilt for this workflow.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {platformCapabilities(parsedPreview).map((c) => (
                    <li key={c.name} className="rounded-md border border-slate-200 p-2.5">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                        <Check className="h-3.5 w-3.5 text-green-600" /> {c.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{c.detail}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {parsedPreview && (
            <Card>
              <CardHeader>
                <CardTitle>Extend with Devin</CardTitle>
                <CardDescription>
                  Configuration covers the common 80%. For unique behavior — custom panels,
                  integrations, new rule types — hand this prompt to Devin or an engineer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea readOnly className="min-h-[120px] text-xs" value={generateDevinPrompt(parsedPreview)} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(generateDevinPrompt(parsedPreview));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy prompt"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => goTo(step - 1)}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" disabled={pending} onClick={() => save(false)}>
            Save draft
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="primary" onClick={() => goTo(step + 1)}>
              Next: {STEPS[step + 1].label}
            </Button>
          ) : (
            <Button variant="primary" disabled={pending} onClick={() => save(true)}>
              {pending ? "Publishing..." : "Publish workflow"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
