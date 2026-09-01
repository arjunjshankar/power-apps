import { describe, it, expect } from "vitest";
import { checkAction, canSeeWorkflow } from "@/lib/auth/permissions";
import { kycReview } from "@/workflows/kyc-review";
import { refunds } from "@/workflows/refunds";
import { featureFlags } from "@/workflows/feature-flags";
import { PERSONAS } from "@/lib/auth/personas";

const analyst = PERSONAS.find((p) => p.role === "analyst")!;
const supervisor = PERSONAS.find((p) => p.role === "supervisor")!;

const approveKyc = kycReview.actions.find((a) => a.key === "approve")!;
const approveRefund = refunds.actions.find((a) => a.key === "approve")!;

describe("workflow visibility", () => {
  it("hides feature flags from analysts but not supervisors", () => {
    expect(canSeeWorkflow(analyst, featureFlags)).toBe(false);
    expect(canSeeWorkflow(supervisor, featureFlags)).toBe(true);
  });
});

describe("checkAction role and status enforcement", () => {
  it("denies actions outside the allowed roles", () => {
    const escalate = kycReview.actions.find((a) => a.key === "escalate")!;
    const opsAdmin = PERSONAS.find((p) => p.role === "ops_admin")!;
    const res = checkAction(escalate, opsAdmin, "in_review", { data: {}, settings: {} });
    expect(res.allowed).toBe(false);
  });

  it("denies actions from statuses they are not available in", () => {
    const res = checkAction(approveKyc, supervisor, "approved", { data: {}, settings: {} });
    expect(res.allowed).toBe(false);
  });
});

describe("high-risk KYC supervisor guard", () => {
  it("blocks analysts from approving high-risk cases", () => {
    const res = checkAction(approveKyc, analyst, "in_review", {
      data: { riskScore: 85 },
      settings: {},
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toMatch(/supervisor/i);
  });

  it("allows analysts to approve low-risk cases", () => {
    const res = checkAction(approveKyc, analyst, "in_review", {
      data: { riskScore: 20 },
      settings: {},
    });
    expect(res.allowed).toBe(true);
  });

  it("allows supervisors to approve high-risk cases", () => {
    const res = checkAction(approveKyc, supervisor, "in_review", {
      data: { riskScore: 85 },
      settings: {},
    });
    expect(res.allowed).toBe(true);
  });
});

describe("refund threshold guard (configurable setting)", () => {
  const settings = { "refund.approvalThreshold": 1000 };

  it("blocks analysts from approving refunds at/above the threshold", () => {
    const res = checkAction(approveRefund, analyst, "in_review", {
      data: { amount: 1500 },
      settings,
    });
    expect(res.allowed).toBe(false);
  });

  it("allows analysts to approve refunds below the threshold", () => {
    const res = checkAction(approveRefund, analyst, "in_review", {
      data: { amount: 250 },
      settings,
    });
    expect(res.allowed).toBe(true);
  });

  it("allows supervisors to approve refunds above the threshold", () => {
    const res = checkAction(approveRefund, supervisor, "in_review", {
      data: { amount: 15000 },
      settings,
    });
    expect(res.allowed).toBe(true);
  });

  it("respects a changed threshold from platform settings", () => {
    const res = checkAction(approveRefund, analyst, "in_review", {
      data: { amount: 1500 },
      settings: { "refund.approvalThreshold": 5000 },
    });
    expect(res.allowed).toBe(true);
  });
});
