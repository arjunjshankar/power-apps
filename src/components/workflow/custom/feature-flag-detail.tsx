"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as Switch from "@radix-ui/react-switch";
import { AlertTriangle } from "lucide-react";
import type { RecordDTO, WorkflowDefinition } from "@/lib/workflows/types";
import type { User } from "@/lib/auth/personas";
import { saveRecordFields } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Level 3 (full-code) extension: a flag-specific control panel that goes
// beyond what the generic record detail renders, while still writing through
// the platform's validated, audited saveRecordFields path.
export function FeatureFlagDetail({
  wf,
  record,
  user,
}: {
  wf: WorkflowDefinition;
  record: RecordDTO;
  user: User;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<{ updates: Record<string, unknown>; message: string } | null>(null);
  const [rollout, setRollout] = useState(Number(record.data.rolloutPercentage ?? 0));

  const env = String(record.data.environment);
  const enabled = Boolean(record.data.enabled);
  const isProduction = env === "production";
  const canEdit = user.role === "eng_admin" || user.role === "ops_admin";
  const archived = record.status === "archived";

  function apply(updates: Record<string, unknown>) {
    startTransition(async () => {
      const result = await saveRecordFields(wf.slug, record.id, updates);
      if (result.ok) {
        toast.success("Flag updated");
        setConfirming(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function requestChange(updates: Record<string, unknown>, description: string) {
    if (isProduction) {
      // Production flag changes are privileged: always require explicit confirmation.
      setConfirming({
        updates,
        message: `You are changing a PRODUCTION flag: ${description}. This takes effect for live traffic immediately.`,
      });
    } else {
      apply(updates);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Flag Controls</CardTitle>
        <Badge color={isProduction ? "red" : env === "staging" ? "yellow" : "blue"}>
          {env.toUpperCase()}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        {isProduction && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Production environment — changes affect live traffic and require confirmation.
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Enabled</p>
            <p className="text-xs text-slate-500">Whether this flag is evaluated at all.</p>
          </div>
          <Switch.Root
            checked={enabled}
            disabled={pending || !canEdit || archived}
            onCheckedChange={(checked) =>
              requestChange({ enabled: checked }, checked ? "enable flag" : "disable flag")
            }
            className="relative h-6 w-11 rounded-full bg-slate-300 transition-colors data-[state=checked]:bg-green-600 disabled:opacity-50"
          >
            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-900">Rollout percentage</p>
            <span className="text-sm tabular-nums text-slate-600">{rollout}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={rollout}
            disabled={pending || !canEdit || archived}
            onChange={(e) => setRollout(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          {rollout !== Number(record.data.rolloutPercentage ?? 0) && (
            <Button
              size="sm"
              className="mt-2"
              disabled={pending}
              onClick={() =>
                requestChange({ rolloutPercentage: rollout }, `set rollout to ${rollout}%`)
              }
            >
              Apply rollout change
            </Button>
          )}
        </div>

        {!canEdit && (
          <p className="text-xs text-slate-500">
            Your role can view this flag but not modify it. Contact an Engineering Admin.
          </p>
        )}
      </CardContent>

      <Dialog open={confirming !== null} onOpenChange={(v) => !v && setConfirming(null)}>
        {confirming && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm production change</DialogTitle>
              <DialogDescription>{confirming.message}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirming(null)} disabled={pending}>
                Cancel
              </Button>
              <Button variant="destructive" disabled={pending} onClick={() => apply(confirming.updates)}>
                {pending ? "Applying..." : "Confirm change"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </Card>
  );
}
