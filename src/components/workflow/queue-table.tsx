"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Search } from "lucide-react";
import type { RecordDTO, WorkflowDefinition } from "@/lib/workflows/types";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "./status-badge";
import { FieldValue } from "./field-value";
import { getPersona } from "@/lib/auth/personas";
import { cn } from "@/lib/utils";

// The reusable queue/table used by every workflow: search, sorting, status
// and assignee columns, click-through to the record detail view.
export function QueueTable({
  wf,
  records,
}: {
  wf: WorkflowDefinition;
  records: RecordDTO[];
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const columns = wf.tableColumns
    .map((key) => wf.fields.find((f) => f.key === key))
    .filter((f): f is NonNullable<typeof f> => Boolean(f));

  const filtered = useMemo(() => {
    let rows = records;
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r.data).some((v) => String(v ?? "").toLowerCase().includes(q))
      );
    }
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a.data[sortKey];
        const bv = b.data[sortKey];
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * sortDir;
        return String(av ?? "").localeCompare(String(bv ?? "")) * sortDir;
      });
    }
    return rows;
  }, [records, query, sortKey, sortDir]);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-200 p-3">
        <Search className="h-4 w-4 text-slate-400" />
        <Input
          placeholder={`Search ${wf.recordNoun}s...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 max-w-xs border-0 shadow-none focus-visible:ring-0"
        />
        <span className="ml-auto text-xs text-slate-500">
          {filtered.length} {wf.recordNoun}
          {filtered.length === 1 ? "" : "s"}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-2.5 font-medium">
                <button
                  className="inline-flex items-center gap-1 hover:text-slate-900"
                  onClick={() => toggleSort(col.key)}
                >
                  {col.label}
                  <ArrowUpDown
                    className={cn("h-3 w-3", sortKey === col.key ? "text-slate-900" : "text-slate-300")}
                  />
                </button>
              </th>
            ))}
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Assignee</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={columns.length + 2} className="px-4 py-12 text-center text-slate-400">
                No {wf.recordNoun}s match this view.
              </td>
            </tr>
          )}
          {filtered.map((r) => (
            <tr key={r.id} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50">
              {columns.map((col, i) => (
                <td key={col.key} className="px-4 py-3">
                  <Link href={`/w/${wf.slug}/r/${r.id}`} className="block">
                    <span className={cn(i === 0 && "font-medium text-slate-900 group-hover:text-blue-700")}>
                      <FieldValue field={col} value={r.data[col.key]} data={r.data} />
                    </span>
                  </Link>
                </td>
              ))}
              <td className="px-4 py-3">
                <StatusBadge wf={wf} status={r.status} />
              </td>
              <td className="px-4 py-3 text-slate-600">
                {r.assigneeId ? getPersona(r.assigneeId).name : <span className="text-slate-400">Unassigned</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
