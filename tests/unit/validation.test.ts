import { describe, it, expect } from "vitest";
import { workflowDefinitionSchema } from "@/lib/workflows/types";
import { buildRecordSchema, validateRecordData } from "@/lib/workflows/validate";
import { kycReview } from "@/workflows/kyc-review";
import { paymentExceptionsDefinition } from "../../prisma/seed-data/payment-exceptions";

describe("workflow definition schema", () => {
  it("accepts every code-defined workflow", async () => {
    const { CODE_WORKFLOWS } = await import("@/workflows");
    for (const wf of CODE_WORKFLOWS) {
      expect(() => workflowDefinitionSchema.parse(wf)).not.toThrow();
    }
  });

  it("accepts the seeded studio workflow definition", () => {
    expect(() => workflowDefinitionSchema.parse(paymentExceptionsDefinition)).not.toThrow();
  });

  it("rejects definitions with an invalid slug", () => {
    expect(() =>
      workflowDefinitionSchema.parse({
        ...paymentExceptionsDefinition,
        slug: "Not A Slug!",
      })
    ).toThrow();
  });

  it("rejects definitions with no statuses", () => {
    expect(() =>
      workflowDefinitionSchema.parse({
        ...paymentExceptionsDefinition,
        statuses: [],
      })
    ).toThrow();
  });
});

describe("record data validation", () => {
  it("coerces numeric fields and accepts valid data", () => {
    const parsed = validateRecordData(kycReview, {
      customerName: "Test Customer",
      customerType: "Individual",
      jurisdiction: "US",
      submittedAt: "2026-01-05",
      riskScore: "42",
      riskLevel: "Medium",
    });
    expect(parsed.riskScore).toBe(42);
  });

  it("rejects missing required fields", () => {
    expect(() => validateRecordData(kycReview, { riskScore: 10 })).toThrow();
  });

  it("rejects select values outside the configured options", () => {
    const schema = buildRecordSchema(kycReview.fields);
    expect(() =>
      schema.parse({
        customerName: "X",
        customerType: "Alien",
        jurisdiction: "US",
        submittedAt: "2026-01-05",
        riskScore: 1,
        riskLevel: "Low",
      })
    ).toThrow();
  });
});
