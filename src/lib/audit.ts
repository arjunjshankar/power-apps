import { prisma } from "@/lib/db";
import type { User } from "@/lib/auth/personas";

export interface AuditInput {
  actor: User;
  workflow: string;
  recordId?: string;
  action: string;
  fromState?: string;
  toState?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAuditEvent(input: AuditInput) {
  return prisma.auditEvent.create({
    data: {
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorRole: input.actor.role,
      workflow: input.workflow,
      recordId: input.recordId,
      action: input.action,
      fromState: input.fromState,
      toState: input.toState,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}
