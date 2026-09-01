import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { executeAction, createRecord, updateRecordFields, ActionError } from "@/lib/workflows/engine";
import { kycReview } from "@/workflows/kyc-review";
import { refunds } from "@/workflows/refunds";
import { PERSONAS } from "@/lib/auth/personas";

const analyst = PERSONAS.find((p) => p.role === "analyst")!;
const supervisor = PERSONAS.find((p) => p.role === "supervisor")!;

async function seedKycRecord(riskScore: number, status = "in_review") {
  return prisma.workflowRecord.create({
    data: {
      workflow: "kyc-review",
      status,
      data: JSON.stringify({
        customerName: "Engine Test",
        customerType: "Individual",
        jurisdiction: "US",
        submittedAt: "2026-01-05",
        riskScore,
        riskLevel: riskScore >= 70 ? "High" : "Low",
      }),
    },
  });
}

beforeEach(async () => {
  await prisma.auditEvent.deleteMany();
  await prisma.workflowRecord.deleteMany();
  await prisma.platformSetting.deleteMany();
  await prisma.platformSetting.create({
    data: { key: "refund.approvalThreshold", value: JSON.stringify(1000) },
  });
});

describe("executeAction", () => {
  it("transitions state and writes an audit event", async () => {
    const row = await seedKycRecord(20, "pending");
    const dto = await executeAction({
      wf: kycReview,
      recordId: row.id,
      actionKey: "assign_to_me",
      actor: analyst,
    });
    expect(dto.status).toBe("in_review");
    expect(dto.assigneeId).toBe(analyst.id);

    const events = await prisma.auditEvent.findMany({ where: { recordId: row.id } });
    expect(events).toHaveLength(1);
    expect(events[0].actorId).toBe(analyst.id);
    expect(events[0].fromState).toBe("pending");
    expect(events[0].toState).toBe("in_review");
  });

  it("rejects high-risk approval by an analyst, allows a supervisor", async () => {
    const row = await seedKycRecord(90);
    await expect(
      executeAction({ wf: kycReview, recordId: row.id, actionKey: "approve", actor: analyst })
    ).rejects.toThrow(ActionError);

    const dto = await executeAction({
      wf: kycReview,
      recordId: row.id,
      actionKey: "approve",
      actor: supervisor,
    });
    expect(dto.status).toBe("approved");
  });

  it("enforces required inputs", async () => {
    const row = await seedKycRecord(20);
    await expect(
      executeAction({ wf: kycReview, recordId: row.id, actionKey: "reject", actor: analyst })
    ).rejects.toThrow(/required/i);
  });

  it("enforces the configurable refund threshold from settings", async () => {
    const row = await prisma.workflowRecord.create({
      data: {
        workflow: "refunds",
        status: "in_review",
        data: JSON.stringify({ amount: 2500, currency: "USD" }),
      },
    });
    await expect(
      executeAction({ wf: refunds, recordId: row.id, actionKey: "approve", actor: analyst })
    ).rejects.toThrow(ActionError);

    await prisma.platformSetting.update({
      where: { key: "refund.approvalThreshold" },
      data: { value: JSON.stringify(5000) },
    });
    const dto = await executeAction({
      wf: refunds,
      recordId: row.id,
      actionKey: "approve",
      actor: analyst,
    });
    expect(dto.status).toBe("approved");
  });
});

describe("createRecord and updateRecordFields", () => {
  it("creates a record in the initial status with an audit event", async () => {
    const dto = await createRecord({
      wf: kycReview,
      actor: supervisor,
      data: { customerName: "New Case", riskScore: 10 },
    });
    expect(dto.status).toBe("pending");
    const events = await prisma.auditEvent.findMany({ where: { recordId: dto.id } });
    expect(events).toHaveLength(1);
  });

  it("only allows editing fields marked editable", async () => {
    const row = await seedKycRecord(20);
    await expect(
      updateRecordFields({
        wf: kycReview,
        recordId: row.id,
        actor: analyst,
        updates: { riskScore: 1 },
      })
    ).rejects.toThrow(/not editable/i);

    const dto = await updateRecordFields({
      wf: kycReview,
      recordId: row.id,
      actor: analyst,
      updates: { notes: "Reviewed documents." },
    });
    expect(dto.data.notes).toBe("Reviewed documents.");
  });
});
