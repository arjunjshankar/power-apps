import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { checkAction, ruleMatches } from "@/lib/auth/permissions";
import { executeAction, createRecord } from "@/lib/workflows/engine";
import { workflowDefinitionSchema } from "@/lib/workflows/types";
import type { RuleGuard } from "@/lib/workflows/types";
import { platformCapabilities, generateDevinPrompt } from "@/lib/workflows/capabilities";
import { chargebackReviewDefinition } from "../../prisma/seed-data/chargeback-review";
import { PERSONAS } from "@/lib/auth/personas";

const analyst = PERSONAS.find((p) => p.role === "analyst")!;
const supervisor = PERSONAS.find((p) => p.role === "supervisor")!;

const approve = chargebackReviewDefinition.actions.find((a) => a.key === "approve")!;
const reject = chargebackReviewDefinition.actions.find((a) => a.key === "reject")!;

function rule(partial: Partial<RuleGuard>): RuleGuard {
  return {
    type: "rule",
    field: "amount",
    operator: "greaterThan",
    requiredRoles: [],
    message: "blocked",
    ...partial,
  };
}

describe("ruleMatches operators", () => {
  it("compares numbers with greaterThan/lessThan", () => {
    expect(ruleMatches(rule({ operator: "greaterThan", value: 5000 }), { amount: 6000 })).toBe(true);
    expect(ruleMatches(rule({ operator: "greaterThan", value: 5000 }), { amount: 5000 })).toBe(false);
    expect(ruleMatches(rule({ operator: "lessThan", value: 100 }), { amount: 50 })).toBe(true);
  });

  it("compares equality as strings", () => {
    expect(ruleMatches(rule({ field: "riskLevel", operator: "equals", value: "High" }), { riskLevel: "High" })).toBe(true);
    expect(ruleMatches(rule({ field: "riskLevel", operator: "notEquals", value: "High" }), { riskLevel: "Low" })).toBe(true);
  });

  it("handles contains for strings and arrays", () => {
    expect(ruleMatches(rule({ field: "notes", operator: "contains", value: "fraud" }), { notes: "Possible FRAUD case" })).toBe(true);
    expect(ruleMatches(rule({ field: "tags", operator: "contains", value: "vip" }), { tags: ["vip", "priority"] })).toBe(true);
  });

  it("handles isEmpty / isNotEmpty", () => {
    expect(ruleMatches(rule({ field: "notes", operator: "isEmpty" }), { notes: "" })).toBe(true);
    expect(ruleMatches(rule({ field: "notes", operator: "isEmpty" }), {})).toBe(true);
    expect(ruleMatches(rule({ field: "notes", operator: "isNotEmpty" }), { notes: "x" })).toBe(true);
  });
});

describe("chargeback review rule guards", () => {
  it("blocks analysts from approving chargebacks over $5,000", () => {
    const res = checkAction(approve, analyst, "inReview", {
      data: { amount: 7899, riskLevel: "Medium" },
      settings: {},
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toMatch(/supervisor/i);
  });

  it("blocks analysts from approving high-risk chargebacks", () => {
    const res = checkAction(approve, analyst, "inReview", {
      data: { amount: 100, riskLevel: "High" },
      settings: {},
    });
    expect(res.allowed).toBe(false);
  });

  it("allows analysts to approve small low-risk chargebacks", () => {
    const res = checkAction(approve, analyst, "inReview", {
      data: { amount: 100, riskLevel: "Low" },
      settings: {},
    });
    expect(res.allowed).toBe(true);
  });

  it("allows supervisors to approve large chargebacks", () => {
    const res = checkAction(approve, supervisor, "escalated", {
      data: { amount: 12480, riskLevel: "High" },
      settings: {},
    });
    expect(res.allowed).toBe(true);
  });

  it("restricts reject to supervisors", () => {
    const res = checkAction(reject, analyst, "inReview", { data: {}, settings: {} });
    expect(res.allowed).toBe(false);
  });
});

describe("builder workflow persistence and runtime", () => {
  beforeEach(async () => {
    await prisma.auditEvent.deleteMany();
    await prisma.workflowRecord.deleteMany();
    await prisma.studioWorkflow.deleteMany();
    await prisma.platformSetting.deleteMany();
  });

  it("round-trips a builder definition through the database", async () => {
    await prisma.studioWorkflow.create({
      data: {
        slug: chargebackReviewDefinition.slug,
        definition: JSON.stringify(chargebackReviewDefinition),
        published: true,
      },
    });
    const row = await prisma.studioWorkflow.findUnique({
      where: { slug: "chargeback-review" },
    });
    const parsed = workflowDefinitionSchema.parse(JSON.parse(row!.definition));
    expect(parsed).toEqual(chargebackReviewDefinition);
    expect(parsed.defaultSort).toEqual({ field: "submittedAt", direction: "desc" });
    expect(parsed.searchableFields).toContain("chargebackId");
  });

  it("archived workflows are excluded from the published registry", async () => {
    await prisma.studioWorkflow.create({
      data: {
        slug: chargebackReviewDefinition.slug,
        definition: JSON.stringify(chargebackReviewDefinition),
        published: true,
        archived: true,
      },
    });
    const { getAllWorkflows } = await import("@/lib/workflows/registry");
    const all = await getAllWorkflows();
    expect(all.some((w) => w.slug === "chargeback-review")).toBe(false);
  });

  it("applies field defaults on create and executes audited transitions", async () => {
    const wf = chargebackReviewDefinition;
    const created = await createRecord({
      wf,
      actor: analyst,
      data: {
        chargebackId: "CB-TEST-1",
        customerName: "Test Customer",
        merchantName: "Test Merchant",
        amount: 120,
        reason: "Duplicate processing",
        submittedAt: "2026-01-10",
        riskLevel: "Low",
      },
    });
    expect(created.data.currency).toBe("USD"); // defaultValue applied
    expect(created.status).toBe("new");

    const inReview = await executeAction({
      wf,
      recordId: created.id,
      actionKey: "startReview",
      actor: analyst,
    });
    expect(inReview.status).toBe("inReview");

    const approved = await executeAction({
      wf,
      recordId: created.id,
      actionKey: "approve",
      actor: analyst,
    });
    expect(approved.status).toBe("approved");

    const events = await prisma.auditEvent.findMany({
      where: { recordId: created.id },
      orderBy: { createdAt: "asc" },
    });
    expect(events.map((e) => e.action)).toEqual([
      "Created record",
      "Start Review",
      "Approve Chargeback",
    ]);
  });
});

describe("capabilities and Devin prompt generation", () => {
  it("derives capabilities from the actual configuration", () => {
    const caps = platformCapabilities(chargebackReviewDefinition).map((c) => c.name);
    expect(caps).toContain("Shared queue & table");
    expect(caps).toContain("Business rules");
    expect(caps).toContain("Confirmation dialogs");
    expect(caps).toContain("Audit logging");
  });

  it("generates a workflow-specific Devin prompt", () => {
    const prompt = generateDevinPrompt(chargebackReviewDefinition);
    expect(prompt).toContain("chargeback-review");
    expect(prompt).toContain("Reuse the existing workflow runtime");
    expect(prompt).toContain("startReview");
  });
});
