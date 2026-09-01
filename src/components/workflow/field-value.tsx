import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/lib/utils";
import { getPersona } from "@/lib/auth/personas";
import type { FieldDefinition } from "@/lib/workflows/types";
import { Check, X } from "lucide-react";

// Renders a field value consistently everywhere (tables, detail views).
export function FieldValue({
  field,
  value,
  data,
}: {
  field: FieldDefinition;
  value: unknown;
  data: Record<string, unknown>;
}) {
  if (value === null || value === undefined || value === "")
    return <span className="text-slate-400">—</span>;

  switch (field.type) {
    case "money": {
      const currency = field.currencyField
        ? String(data[field.currencyField] ?? "USD")
        : "USD";
      return <span className="font-medium tabular-nums">{formatMoney(Number(value), currency)}</span>;
    }
    case "percentage":
      return <span className="tabular-nums">{Number(value)}%</span>;
    case "boolean":
      return value ? (
        <span className="inline-flex items-center gap-1 text-green-700">
          <Check className="h-3.5 w-3.5" /> Yes
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-slate-500">
          <X className="h-3.5 w-3.5" /> No
        </span>
      );
    case "date":
    case "datetime":
      return <span>{formatDate(String(value))}</span>;
    case "multiSelect":
      return (
        <span className="flex flex-wrap gap-1">
          {(value as string[]).map((v) => (
            <Badge key={v} color="purple">
              {v}
            </Badge>
          ))}
        </span>
      );
    case "user":
      return <span>{getPersona(String(value)).name}</span>;
    case "number":
      return <span className="tabular-nums">{String(value)}</span>;
    default:
      return <span>{String(value)}</span>;
  }
}
