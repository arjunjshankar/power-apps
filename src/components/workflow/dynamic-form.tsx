"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FieldDefinition } from "@/lib/workflows/types";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

// Reusable dynamically rendered form driven by field definitions.
// Used for record creation and for editing permitted fields.
export function DynamicForm({
  fields,
  initialValues = {},
  submitLabel,
  onSubmit,
}: {
  fields: FieldDefinition[];
  initialValues?: Record<string, unknown>;
  submitLabel: string;
  onSubmit: (values: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const v: Record<string, unknown> = {};
    for (const f of fields) {
      v[f.key] = initialValues[f.key] ?? (f.type === "boolean" ? false : f.type === "multiSelect" ? [] : "");
    }
    return v;
  });

  function set(key: string, value: unknown) {
    setValues((s) => ({ ...s, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    for (const f of fields) {
      if (f.required && !String(values[f.key] ?? "").trim()) {
        toast.error(`"${f.label}" is required.`);
        return;
      }
    }
    startTransition(async () => {
      const result = await onSubmit(values);
      if (result.ok) {
        toast.success("Saved");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label htmlFor={f.key}>
            {f.label}
            {f.required && <span className="ml-0.5 text-red-500">*</span>}
          </Label>
          <FieldInput field={f} value={values[f.key]} onChange={(v) => set(f.key, v)} />
          {f.helpText && <p className="text-xs text-slate-500">{f.helpText}</p>}
        </div>
      ))}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDefinition;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (field.type) {
    case "longText":
      return (
        <Textarea id={field.key} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      );
    case "number":
    case "money":
    case "percentage":
      return (
        <Input
          id={field.key}
          type="number"
          step="any"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
      );
    case "boolean":
      return (
        <input
          id={field.key}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
      );
    case "date":
      return (
        <Input id={field.key} type="date" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      );
    case "datetime":
      return (
        <Input
          id={field.key}
          type="datetime-local"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "select":
      return (
        <Select id={field.key} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select...</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      );
    case "multiSelect": {
      const selected = (value as string[]) ?? [];
      return (
        <div className="flex flex-wrap gap-2">
          {(field.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(o)}
                onChange={(e) =>
                  onChange(e.target.checked ? [...selected, o] : selected.filter((s) => s !== o))
                }
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              {o}
            </label>
          ))}
        </div>
      );
    }
    default:
      return (
        <Input id={field.key} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      );
  }
}
