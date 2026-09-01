"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionDefinition, WorkflowDefinition } from "@/lib/workflows/types";
import { runWorkflowAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Reusable action bar: renders the actions available to the current user for
// the record's current state, with confirmation dialogs and required inputs.
// (The server re-checks authorization on execution — this is just UX.)
export function ActionButtons({
  wf,
  recordId,
  actions,
}: {
  wf: WorkflowDefinition;
  recordId: string;
  actions: ActionDefinition[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<ActionDefinition | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});

  function execute(action: ActionDefinition, actionInputs: Record<string, string>) {
    startTransition(async () => {
      const result = await runWorkflowAction(wf.slug, recordId, action.key, actionInputs);
      if (result.ok) {
        toast.success(`${action.label} completed`);
        setOpen(null);
        setInputs({});
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function onClick(action: ActionDefinition) {
    if (action.confirm || action.requiredInputs.length > 0) {
      setInputs({});
      setOpen(action);
    } else {
      execute(action, {});
    }
  }

  if (actions.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button
            key={a.key}
            variant={a.variant === "default" ? "outline" : a.variant}
            size="sm"
            disabled={pending}
            onClick={() => onClick(a)}
          >
            {a.label}
          </Button>
        ))}
      </div>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        {open && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{open.label}</DialogTitle>
              {open.confirmMessage && <DialogDescription>{open.confirmMessage}</DialogDescription>}
            </DialogHeader>
            <div className="space-y-4">
              {open.requiredInputs.map((input) => (
                <div key={input.key} className="space-y-1.5">
                  <Label htmlFor={input.key}>{input.label}</Label>
                  {input.type === "longText" ? (
                    <Textarea
                      id={input.key}
                      value={inputs[input.key] ?? ""}
                      onChange={(e) => setInputs((s) => ({ ...s, [input.key]: e.target.value }))}
                    />
                  ) : (
                    <Input
                      id={input.key}
                      type={input.type === "number" ? "number" : "text"}
                      value={inputs[input.key] ?? ""}
                      onChange={(e) => setInputs((s) => ({ ...s, [input.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(null)} disabled={pending}>
                Cancel
              </Button>
              <Button
                variant={open.variant === "default" ? "default" : open.variant}
                disabled={pending || open.requiredInputs.some((i) => !inputs[i.key]?.trim())}
                onClick={() => execute(open, inputs)}
              >
                {pending ? "Working..." : `Confirm ${open.label}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
