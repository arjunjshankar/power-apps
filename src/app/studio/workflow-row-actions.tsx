"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Copy, Eye, Pencil } from "lucide-react";
import { duplicateStudioWorkflow, setStudioWorkflowArchived } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function WorkflowRowActions({
  slug,
  published,
  archived,
}: {
  slug: string;
  published: boolean;
  archived: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      {published && !archived && (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/w/${slug}`}>
            <Eye className="h-3.5 w-3.5" /> Open
          </Link>
        </Button>
      )}
      <Button asChild variant="ghost" size="sm">
        <Link href={`/studio/${slug}`}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await duplicateStudioWorkflow(slug);
            if (result.ok && result.slug) {
              toast.success("Workflow duplicated as a draft");
              router.push(`/studio/${result.slug}`);
              router.refresh();
            } else if (!result.ok) {
              toast.error(result.error);
            }
          })
        }
      >
        <Copy className="h-3.5 w-3.5" /> Duplicate
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        className={archived ? "" : "text-slate-500 hover:text-red-600"}
        onClick={() =>
          startTransition(async () => {
            const result = await setStudioWorkflowArchived(slug, !archived);
            if (result.ok) {
              toast.success(archived ? "Workflow restored" : "Workflow archived");
              router.refresh();
            } else {
              toast.error(result.error);
            }
          })
        }
      >
        {archived ? (
          <>
            <ArchiveRestore className="h-3.5 w-3.5" /> Restore
          </>
        ) : (
          <>
            <Archive className="h-3.5 w-3.5" /> Archive
          </>
        )}
      </Button>
    </div>
  );
}
