import { prisma } from "@/lib/db";
import type { User } from "@/lib/auth/personas";
import type {
  DashboardCard,
  RecordDTO,
  ViewDefinition,
  WorkflowDefinition,
} from "./types";
import { toDTO } from "./engine";

export async function listRecords(
  wf: WorkflowDefinition,
  view: ViewDefinition | undefined,
  user: User
): Promise<RecordDTO[]> {
  const rows = await prisma.workflowRecord.findMany({
    where: { workflow: wf.slug },
    orderBy: { createdAt: "desc" },
  });
  let records = rows.map(toDTO);
  const filter = view?.filter;
  if (filter) {
    if (filter.statuses?.length)
      records = records.filter((r) => filter.statuses!.includes(r.status));
    if (filter.assignedToMe) records = records.filter((r) => r.assigneeId === user.id);
    if (filter.unassigned) records = records.filter((r) => !r.assigneeId);
    if (filter.fieldEquals)
      records = records.filter((r) =>
        Object.entries(filter.fieldEquals!).every(([k, v]) => String(r.data[k]) === v)
      );
  }
  return records;
}

export async function getRecord(
  wf: WorkflowDefinition,
  id: string
): Promise<RecordDTO | null> {
  const row = await prisma.workflowRecord.findUnique({ where: { id } });
  if (!row || row.workflow !== wf.slug) return null;
  return toDTO(row);
}

export interface CardValue {
  label: string;
  value: string;
}

export async function computeDashboardCards(
  wf: WorkflowDefinition
): Promise<CardValue[]> {
  const rows = await prisma.workflowRecord.findMany({ where: { workflow: wf.slug } });
  const records = rows.map(toDTO);
  return wf.dashboardCards.map((card: DashboardCard) => {
    const matching = card.statuses?.length
      ? records.filter((r) => card.statuses!.includes(r.status))
      : records;
    if (card.type === "moneySum") {
      const sum = matching.reduce((acc, r) => acc + Number(r.data[card.field ?? ""] ?? 0), 0);
      return {
        label: card.label,
        value: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(sum),
      };
    }
    return { label: card.label, value: String(matching.length) };
  });
}
