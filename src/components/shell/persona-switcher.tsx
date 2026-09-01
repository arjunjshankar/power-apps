"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PERSONAS, type User } from "@/lib/auth/personas";
import { ROLE_LABELS } from "@/lib/workflows/types";
import { switchPersona } from "@/app/actions";
import { Select } from "@/components/ui/input";

// Demo-only persona switcher standing in for a real identity provider.
export function PersonaSwitcher({ current }: { current: User }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="border-t border-slate-800 p-3">
      <p className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        Demo persona
      </p>
      <Select
        aria-label="Demo persona"
        value={current.id}
        disabled={pending}
        onChange={(e) =>
          startTransition(async () => {
            await switchPersona(e.target.value);
            router.refresh();
          })
        }
        className="border-slate-700 bg-slate-800 text-slate-100"
      >
        {PERSONAS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} — {ROLE_LABELS[p.role]}
          </option>
        ))}
      </Select>
    </div>
  );
}
